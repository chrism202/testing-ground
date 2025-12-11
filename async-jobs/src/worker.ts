import { initializeDatabase } from './database';
import { createQueue, QueueType } from './queue';
import { registerJobHandlers } from './jobs';
import { notificationService } from './services';
import { config, validateConfig, logger } from './config';

/**
 * Standalone worker process for processing jobs
 *
 * This can be run separately from the main API server for:
 * - Horizontal scaling of workers
 * - Isolating job processing from API requests
 * - Running BullMQ workers with Redis in production
 */
async function runWorker(): Promise<void> {
  logger.info('Starting Async Jobs worker...');

  // Validate configuration
  validateConfig();

  // Initialize database
  initializeDatabase(config.databasePath);

  // Register job handlers
  registerJobHandlers();

  // Determine queue type from environment
  const queueType: QueueType = process.env.QUEUE_TYPE === 'bullmq' ? 'bullmq' : 'memory';

  // Create job queue with notification callback
  const queue = createQueue(queueType, {
    concurrency: config.maxConcurrentJobs
  }, async (jobId: string) => {
    await notificationService.onJobCompleted(jobId);
  });

  // Start processing jobs
  queue.startProcessing();

  logger.info('Worker started', {
    queueType,
    concurrency: config.maxConcurrentJobs
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down worker...');
    await queue.stopProcessing();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

runWorker().catch(err => {
  logger.error('Worker failed', { error: err });
  process.exit(1);
});
