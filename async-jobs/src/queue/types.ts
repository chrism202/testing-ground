/**
 * Queue system types
 */

export interface QueueMessage {
  jobId: string;
  attempt?: number;
  enqueuedAt: Date;
}

export interface QueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
}

export interface JobQueue {
  /**
   * Add a job to the queue
   */
  enqueue(message: QueueMessage): Promise<void>;

  /**
   * Start processing jobs from the queue
   */
  startProcessing(): void;

  /**
   * Stop processing jobs
   */
  stopProcessing(): Promise<void>;

  /**
   * Get the number of pending jobs in the queue
   */
  getPendingCount(): Promise<number>;

  /**
   * Clear the queue (for testing)
   */
  clear(): Promise<void>;
}
