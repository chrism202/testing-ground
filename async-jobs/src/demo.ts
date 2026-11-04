/**
 * Demo script showing the async jobs system in action
 *
 * This demonstrates:
 * - Creating jobs via the tool interface
 * - Session registration
 * - Job completion with notification
 * - Listing and querying jobs
 */

import { initializeDatabase, initializeInMemoryDatabase } from './database';
import { createQueue, destroyQueue } from './queue';
import { registerJobHandlers } from './jobs';
import { jobService, notificationService, sessionStateTracker } from './services';
import { tool_createJob, tool_listJobs, tool_getJob } from './agents/tools';
import { ToolContext } from './agents/tools/types';
import { logger } from './config';

async function runDemo(): Promise<void> {
  logger.info('=== Async Jobs Demo ===\n');

  // Use in-memory database for demo
  initializeInMemoryDatabase();

  // Register job handlers
  registerJobHandlers();

  // Create queue with notification callback
  const queue = createQueue('memory', { concurrency: 2 }, async (jobId) => {
    await notificationService.onJobCompleted(jobId);
  });

  // Simulate a user session
  const userId = 'demo_user_123';
  const sessionId = 'demo_session_abc';

  logger.info('1. Registering user session...');
  sessionStateTracker.registerSession(sessionId, userId);
  logger.info(`   Session ${sessionId} registered for user ${userId}\n`);

  // Tool context (would come from the agent runtime)
  const toolContext: ToolContext = {
    userId,
    sessionId
  };

  // Create some jobs using the tools
  logger.info('2. Creating jobs via Supervisor Agent tools...\n');

  // Create a weekly report job
  const reportResult = await tool_createJob({
    type: 'weekly_report',
    displayName: 'Weekly EMEA Sales Report',
    metadata: {
      region: 'EMEA',
      weekStart: '2025-12-01'
    },
    notifyOnCompletion: true
  }, toolContext);

  logger.info(`   Created: ${reportResult.displayName}`);
  logger.info(`   Job ID: ${reportResult.jobId}`);
  logger.info(`   Status: ${reportResult.status}\n`);

  // Create a document indexing job
  const indexResult = await tool_createJob({
    type: 'doc_index',
    displayName: 'Index Q4 Documents',
    metadata: {
      source: 'sharepoint',
      documentCount: 50
    }
  }, toolContext);

  logger.info(`   Created: ${indexResult.displayName}`);
  logger.info(`   Job ID: ${indexResult.jobId}`);
  logger.info(`   Status: ${indexResult.status}\n`);

  // Create a data export job
  const exportResult = await tool_createJob({
    type: 'data_export',
    displayName: 'Export Transaction History',
    metadata: {
      format: 'csv',
      dataType: 'transactions',
      startDate: '2025-01-01',
      endDate: '2025-12-01'
    }
  }, toolContext);

  logger.info(`   Created: ${exportResult.displayName}`);
  logger.info(`   Job ID: ${exportResult.jobId}`);
  logger.info(`   Status: ${exportResult.status}\n`);

  // List active jobs
  logger.info('3. Listing active jobs...\n');
  const listResult = await tool_listJobs({
    status: ['PENDING', 'RUNNING']
  }, toolContext);

  logger.info(`   Found ${listResult.count} active jobs:`);
  for (const job of listResult.jobs) {
    logger.info(`   - ${job.displayName} (${job.status})`);
  }
  logger.info('');

  // Start processing
  logger.info('4. Processing jobs...\n');
  queue.startProcessing();

  // Wait for jobs to complete
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check final status
  logger.info('\n5. Final job status:\n');
  const finalList = await tool_listJobs({}, toolContext);

  for (const job of finalList.jobs) {
    const details = await tool_getJob({ jobId: job.id }, toolContext);
    logger.info(`   ${job.displayName}:`);
    logger.info(`     Status: ${job.status}`);
    if (details.job?.resultSummary) {
      logger.info(`     Summary: ${details.job.resultSummary}`);
    }
    if (details.job?.errorMessage) {
      logger.info(`     Error: ${details.job.errorMessage}`);
    }
    logger.info('');
  }

  // Show job counts
  logger.info('6. Job statistics:\n');
  const counts = jobService.getJobCounts(userId);
  logger.info(`   PENDING: ${counts.PENDING}`);
  logger.info(`   RUNNING: ${counts.RUNNING}`);
  logger.info(`   SUCCESS: ${counts.SUCCESS}`);
  logger.info(`   FAILED: ${counts.FAILED}`);
  logger.info(`   CANCELLED: ${counts.CANCELLED}`);
  logger.info('');

  // Cleanup
  await destroyQueue();

  logger.info('=== Demo Complete ===');
}

runDemo().catch(err => {
  logger.error('Demo failed', { error: err });
  process.exit(1);
});
