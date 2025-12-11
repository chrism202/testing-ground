import { JobQueue, QueueOptions } from './types';
import { InMemoryQueue } from './inMemoryQueue';
import { BullMqQueue } from './bullMqQueue';
import { logger } from '../config';

export type QueueType = 'memory' | 'bullmq';

let queueInstance: JobQueue | null = null;

/**
 * Create a job queue instance
 */
export function createQueue(
  type: QueueType = 'memory',
  options: QueueOptions = {},
  onJobCompleted?: (jobId: string) => Promise<void>
): JobQueue {
  if (queueInstance) {
    logger.warn('Queue already exists, returning existing instance');
    return queueInstance;
  }

  switch (type) {
    case 'bullmq':
      logger.info('Creating BullMQ queue');
      queueInstance = new BullMqQueue(options, onJobCompleted);
      break;
    case 'memory':
    default:
      logger.info('Creating in-memory queue');
      queueInstance = new InMemoryQueue(options, onJobCompleted);
      break;
  }

  return queueInstance;
}

/**
 * Get the current queue instance
 */
export function getQueue(): JobQueue {
  if (!queueInstance) {
    throw new Error('Queue not initialized. Call createQueue() first.');
  }
  return queueInstance;
}

/**
 * Destroy the queue instance
 */
export async function destroyQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.stopProcessing();
    await queueInstance.clear();
    queueInstance = null;
    logger.info('Queue destroyed');
  }
}
