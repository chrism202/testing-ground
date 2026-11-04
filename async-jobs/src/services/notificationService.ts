import { Job } from '../types';
import { jobService } from './jobService';
import { realtimeService } from './realtimeService';
import { sessionRepository } from '../database';
import { config, logger } from '../config';

/**
 * Interface for the Supervisor Agent client
 */
export interface SupervisorAgentClient {
  generateNotification(prompt: string, userId: string): Promise<string>;
}

let supervisorClient: SupervisorAgentClient | null = null;

/**
 * Set the Supervisor Agent client for generating notifications
 */
export function setSupervisorClient(client: SupervisorAgentClient): void {
  supervisorClient = client;
  logger.info('Supervisor client configured for notifications');
}

/**
 * Generate a fallback notification when Supervisor is unavailable
 */
function generateFallbackNotification(job: Job): string {
  if (job.status === 'SUCCESS') {
    return `Your "${job.displayName}" has completed successfully. ${
      job.resultSummary ? job.resultSummary : 'Would you like more details?'
    }`;
  } else if (job.status === 'FAILED') {
    return `Unfortunately, your "${job.displayName}" has failed. ${
      job.errorMessage ? `Error: ${job.errorMessage}` : 'Would you like me to try again?'
    }`;
  } else {
    return `Update on your "${job.displayName}": status is now ${job.status.toLowerCase()}.`;
  }
}

/**
 * Generate a notification message using the Supervisor Agent
 */
async function generateNotificationText(job: Job): Promise<string> {
  if (!supervisorClient) {
    logger.warn('Supervisor client not configured, using fallback notification');
    return generateFallbackNotification(job);
  }

  const supervisorPrompt = `
You are a system agent helping craft user-facing notifications.

A background job for this user has just completed.

Job:
- Type: ${job.type}
- Display name: ${job.displayName}
- Status: ${job.status}
- Summary: ${job.resultSummary ?? 'No summary available.'}
- Error: ${job.errorMessage ?? 'none'}

Task:
Write a SHORT spoken notification for the user.
- If SUCCESS: say it's done and offer to summarize or show it.
- If FAILED: briefly explain it failed and offer to help debug or retry.
- Be concise and friendly.
- Do not include any markdown formatting.
- Write as if speaking directly to the user.
`;

  try {
    const notificationText = await supervisorClient.generateNotification(
      supervisorPrompt,
      job.userId
    );

    logger.info('Notification text generated via Supervisor', {
      jobId: job.id,
      textLength: notificationText.length
    });

    return notificationText;
  } catch (err) {
    logger.error('Failed to generate notification via Supervisor, using fallback', {
      jobId: job.id,
      error: err
    });
    return generateFallbackNotification(job);
  }
}

/**
 * Notification Service - handles job completion notifications
 */
export const notificationService = {
  /**
   * Handle job completion - called by the worker when a job finishes
   */
  async onJobCompleted(jobId: string): Promise<void> {
    logger.info('onJobCompleted triggered', { jobId });

    const job = jobService.getJob(jobId);
    if (!job) {
      logger.warn('Job not found for notification', { jobId });
      return;
    }

    // Check if notification is enabled
    if (!job.notifyOnCompletion) {
      logger.info('Notification disabled for job', { jobId });
      return;
    }

    // Check if we have a session to notify
    if (!job.realtimeSessionId) {
      logger.info('No realtime session associated with job', { jobId });
      return;
    }

    // Check session state (v1: simplified - just check if session exists and is active)
    const sessionState = sessionRepository.findById(job.realtimeSessionId);
    if (!sessionState) {
      logger.info('Session not found', {
        jobId,
        sessionId: job.realtimeSessionId
      });
      return;
    }

    if (!sessionState.isActive) {
      logger.info('Session is not active', {
        jobId,
        sessionId: job.realtimeSessionId
      });
      return;
    }

    // v1 simplification: Check if session is idle before barging in
    // In production, you might want to queue the notification instead
    if (sessionState.currentlySpeaking || sessionState.userTalking) {
      logger.info('Session is not idle, skipping notification', {
        jobId,
        sessionId: job.realtimeSessionId,
        currentlySpeaking: sessionState.currentlySpeaking,
        userTalking: sessionState.userTalking
      });
      // TODO: In v2, queue the notification and retry later
      return;
    }

    // Generate notification text
    const notificationText = await generateNotificationText(job);

    // Send the notification
    let sent = false;
    for (let attempt = 0; attempt < config.notificationRetryAttempts; attempt++) {
      try {
        sent = await realtimeService.sendNotification({
          sessionId: job.realtimeSessionId,
          text: notificationText,
          jobId: job.id,
          priority: 'normal'
        });

        if (sent) {
          break;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, config.notificationRetryDelay * Math.pow(2, attempt))
        );
      } catch (err) {
        logger.error('Notification send attempt failed', {
          jobId,
          attempt,
          error: err
        });
      }
    }

    if (sent) {
      // Mark job as notified
      jobService.markNotified(jobId);

      logger.info('Job completion notification sent', {
        jobId,
        sessionId: job.realtimeSessionId,
        status: job.status
      });
    } else {
      logger.error('Failed to send notification after all retries', {
        jobId,
        sessionId: job.realtimeSessionId
      });
      // TODO: Store notification failure for later retry or alternative delivery
    }
  },

  /**
   * Process any pending notifications (for jobs that completed while we were down)
   */
  async processPendingNotifications(): Promise<number> {
    const jobs = jobService.getJobsNeedingNotification();
    let processed = 0;

    logger.info('Processing pending notifications', { count: jobs.length });

    for (const job of jobs) {
      try {
        await this.onJobCompleted(job.id);
        processed++;
      } catch (err) {
        logger.error('Failed to process pending notification', {
          jobId: job.id,
          error: err
        });
      }
    }

    return processed;
  },

  /**
   * Manually trigger a notification for a job (for testing)
   */
  async triggerNotification(jobId: string): Promise<boolean> {
    const job = jobService.getJob(jobId);
    if (!job) {
      return false;
    }

    const notificationText = await generateNotificationText(job);

    if (!job.realtimeSessionId) {
      logger.warn('Cannot trigger notification: no session ID', { jobId });
      return false;
    }

    return realtimeService.sendNotification({
      sessionId: job.realtimeSessionId,
      text: notificationText,
      jobId,
      priority: 'high'
    });
  }
};
