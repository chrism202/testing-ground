import { Queue, Worker, Job as BullJob } from 'bullmq';
import { Redis } from 'ioredis';
import { JobQueue, QueueMessage, QueueOptions } from './types';
import { jobService } from '../services/jobService';
import { config, logger } from '../config';

/**
 * BullMQ-based job queue implementation
 * Production-ready queue backed by Redis
 */
export class BullMqQueue implements JobQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private connection: Redis;
  private options: Required<QueueOptions>;
  private onJobCompleted?: (jobId: string) => Promise<void>;

  constructor(
    options: QueueOptions = {},
    onJobCompleted?: (jobId: string) => Promise<void>
  ) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      concurrency: options.concurrency ?? config.maxConcurrentJobs
    };
    this.onJobCompleted = onJobCompleted;

    // Create Redis connection
    this.connection = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
      maxRetriesPerRequest: null
    });

    // Create the queue
    this.queue = new Queue(config.jobQueueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.options.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.options.retryDelay
        },
        removeOnComplete: {
          age: 3600 * 24 // Keep completed jobs for 24 hours
        },
        removeOnFail: {
          age: 3600 * 24 * 7 // Keep failed jobs for 7 days
        }
      }
    });

    logger.info('BullMQ queue initialized', { queueName: config.jobQueueName });
  }

  async enqueue(message: QueueMessage): Promise<void> {
    await this.queue.add('process-job', message, {
      jobId: message.jobId
    });

    logger.info('Job enqueued to BullMQ', { jobId: message.jobId });
  }

  startProcessing(): void {
    if (this.worker) {
      logger.warn('Worker already running');
      return;
    }

    this.worker = new Worker(
      config.jobQueueName,
      async (bullJob: BullJob<QueueMessage>) => {
        return this.processJob(bullJob.data);
      },
      {
        connection: this.connection,
        concurrency: this.options.concurrency
      }
    );

    this.worker.on('completed', (bullJob) => {
      logger.info('BullMQ job completed', { jobId: bullJob.data.jobId });
    });

    this.worker.on('failed', (bullJob, err) => {
      logger.error('BullMQ job failed', {
        jobId: bullJob?.data.jobId,
        error: err.message
      });
    });

    this.worker.on('error', (err) => {
      logger.error('BullMQ worker error', { error: err.message });
    });

    logger.info('BullMQ worker started', {
      concurrency: this.options.concurrency
    });
  }

  async stopProcessing(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('BullMQ worker stopped');
    }
  }

  async getPendingCount(): Promise<number> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed');
    return counts.waiting + counts.active + counts.delayed;
  }

  async clear(): Promise<void> {
    await this.queue.obliterate({ force: true });
    logger.info('BullMQ queue cleared');
  }

  async close(): Promise<void> {
    await this.stopProcessing();
    await this.queue.close();
    await this.connection.quit();
    logger.info('BullMQ queue closed');
  }

  private async processJob(message: QueueMessage): Promise<void> {
    const { jobId } = message;

    logger.info('Processing BullMQ job', { jobId });

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

      logger.error('Job execution failed', { jobId, error: errorMessage });

      // Mark as failed
      jobService.markFailed(jobId, errorMessage);

      // Trigger completion callback (for failure notification)
      if (this.onJobCompleted) {
        await this.onJobCompleted(jobId);
      }

      // Re-throw to let BullMQ handle retry logic
      throw err;
    }
  }
}
