import { JobQueue, QueueMessage, QueueOptions } from './types';
import { jobService } from '../services/jobService';
import { logger } from '../config';

/**
 * In-memory job queue implementation
 * Useful for development and testing without Redis
 */
export class InMemoryQueue implements JobQueue {
  private queue: QueueMessage[] = [];
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;
  private options: Required<QueueOptions>;
  private onJobCompleted?: (jobId: string) => Promise<void>;

  constructor(
    options: QueueOptions = {},
    onJobCompleted?: (jobId: string) => Promise<void>
  ) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      concurrency: options.concurrency ?? 1
    };
    this.onJobCompleted = onJobCompleted;
  }

  async enqueue(message: QueueMessage): Promise<void> {
    this.queue.push({
      ...message,
      attempt: message.attempt ?? 0,
      enqueuedAt: message.enqueuedAt ?? new Date()
    });

    logger.info('Job enqueued', { jobId: message.jobId, queueLength: this.queue.length });

    // Auto-start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processingPromise = this.processLoop();
    logger.info('Queue processing started');
  }

  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    if (this.processingPromise) {
      await this.processingPromise;
    }
    logger.info('Queue processing stopped');
  }

  async getPendingCount(): Promise<number> {
    return this.queue.length;
  }

  async clear(): Promise<void> {
    this.queue = [];
    logger.info('Queue cleared');
  }

  private async processLoop(): Promise<void> {
    while (this.isProcessing) {
      const message = this.queue.shift();

      if (!message) {
        // No jobs in queue, wait a bit before checking again
        await this.sleep(100);
        continue;
      }

      await this.processJob(message);
    }
  }

  private async processJob(message: QueueMessage): Promise<void> {
    const { jobId } = message;

    logger.info('Processing job', { jobId, attempt: message.attempt });

    const job = jobService.getJob(jobId);
    if (!job) {
      logger.warn('Job not found, skipping', { jobId });
      return;
    }

    if (job.status !== 'PENDING') {
      logger.info('Job not in PENDING state, skipping', { jobId, status: job.status });
      return;
    }

    try {
      // Mark as running
      jobService.markRunning(jobId);

      // Execute the job
      const result = await jobService.executeJob(job);

      // Mark as success
      jobService.markSuccess(jobId, result);

      logger.info('Job completed successfully', { jobId });

      // Trigger completion callback
      if (this.onJobCompleted) {
        await this.onJobCompleted(jobId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.error('Job execution failed', { jobId, error: errorMessage, attempt: message.attempt });

      // Check if we should retry
      if ((message.attempt ?? 0) < this.options.maxRetries) {
        logger.info('Scheduling job retry', { jobId, nextAttempt: (message.attempt ?? 0) + 1 });

        // Reset to pending for retry
        jobService.updateStatus(jobId, 'PENDING');

        // Re-enqueue with incremented attempt count after delay
        await this.sleep(this.options.retryDelay * Math.pow(2, message.attempt ?? 0));

        this.queue.push({
          jobId,
          attempt: (message.attempt ?? 0) + 1,
          enqueuedAt: new Date()
        });
      } else {
        // Mark as failed after exhausting retries
        jobService.markFailed(jobId, errorMessage);

        // Trigger completion callback (for failure notification)
        if (this.onJobCompleted) {
          await this.onJobCompleted(jobId);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
