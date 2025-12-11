import { createApp } from './api';
import { initializeDatabase } from './database';
import { createQueue } from './queue';
import { registerJobHandlers } from './jobs';
import { notificationService } from './services';
import { sessionStateTracker } from './services/sessionStateTracker';
import { config, validateConfig, logger } from './config';

/**
 * Main entry point for the Async Jobs server
 */
async function main(): Promise<void> {
  logger.info('Starting Async Jobs server...');

  // Validate configuration
  validateConfig();

  // Initialize database
  initializeDatabase(config.databasePath);

  // Register job handlers
  registerJobHandlers();

  // Create job queue with notification callback
  const queue = createQueue('memory', {
    concurrency: config.maxConcurrentJobs
  }, async (jobId: string) => {
    await notificationService.onJobCompleted(jobId);
  });

  // Start processing jobs
  queue.startProcessing();

  // Start session cleanup task
  sessionStateTracker.startCleanupTask();

  // Process any pending notifications from before restart
  const pendingCount = await notificationService.processPendingNotifications();
  if (pendingCount > 0) {
    logger.info('Processed pending notifications', { count: pendingCount });
  }

  // Create and start Express app
  const app = createApp();

  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info('Available endpoints:', {
      jobs: '/jobs',
      sessions: '/sessions',
      internal: '/internal/realtime'
    });
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');

    await queue.stopProcessing();

    // Give time for in-flight requests
    await new Promise(resolve => setTimeout(resolve, 1000));

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
