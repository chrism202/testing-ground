import { jobRepository } from '../database';
import {
  Job,
  JobStatus,
  CreateJobInput,
  ListJobsFilter,
  RedactedJob,
  JobResult,
  JobHandler,
  JobHandlerRegistry
} from '../types';
import { logger } from '../config';

/**
 * Registry of job handlers by type
 */
const handlerRegistry: JobHandlerRegistry = new Map();

/**
 * Redact a job for LLM consumption - removes sensitive internal fields
 */
export function redactJobForLLM(job: Job): RedactedJob {
  return {
    id: job.id,
    displayName: job.displayName,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    resultSummary: job.resultSummary,
    errorMessage: job.errorMessage
  };
}

/**
 * Job Service - business logic layer for job operations
 */
export const jobService = {
  /**
   * Register a job handler for a specific job type
   */
  registerHandler(type: string, handler: JobHandler): void {
    if (handlerRegistry.has(type)) {
      logger.warn('Overwriting existing handler for job type', { type });
    }
    handlerRegistry.set(type, handler);
    logger.info('Registered job handler', { type });
  },

  /**
   * Get the handler for a job type
   */
  getHandler(type: string): JobHandler | undefined {
    return handlerRegistry.get(type);
  },

  /**
   * Get all registered job types
   */
  getRegisteredTypes(): string[] {
    return Array.from(handlerRegistry.keys());
  },

  /**
   * Create a new job
   */
  createJob(input: CreateJobInput): Job {
    // Validate that we have a handler for this job type
    if (!handlerRegistry.has(input.type)) {
      logger.warn('Creating job with unregistered type', { type: input.type });
    }

    const job = jobRepository.create(input);

    logger.info('Job created via service', {
      jobId: job.id,
      type: job.type,
      userId: job.userId,
      displayName: job.displayName
    });

    return job;
  },

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | null {
    return jobRepository.findById(jobId);
  },

  /**
   * Get a job by ID, ensuring it belongs to the specified user
   */
  getJobForUser(jobId: string, userId: string): Job | null {
    const job = jobRepository.findById(jobId);
    if (!job || job.userId !== userId) {
      return null;
    }
    return job;
  },

  /**
   * List jobs for a user with optional filters
   */
  listJobs(filters: ListJobsFilter): Job[] {
    return jobRepository.find(filters);
  },

  /**
   * List jobs for LLM consumption (redacted)
   */
  listJobsForLLM(filters: ListJobsFilter): RedactedJob[] {
    const jobs = jobRepository.find(filters);
    return jobs.map(redactJobForLLM);
  },

  /**
   * Update job status
   */
  updateStatus(jobId: string, status: JobStatus): Job | null {
    const previousJob = jobRepository.findById(jobId);
    if (!previousJob) {
      return null;
    }

    const job = jobRepository.update(jobId, { status });

    logger.info('Job status updated', {
      jobId,
      previousStatus: previousJob.status,
      newStatus: status
    });

    return job;
  },

  /**
   * Mark a job as running
   */
  markRunning(jobId: string): Job | null {
    return this.updateStatus(jobId, 'RUNNING');
  },

  /**
   * Mark a job as succeeded with results
   */
  markSuccess(jobId: string, result: JobResult): Job | null {
    return jobRepository.update(jobId, {
      status: 'SUCCESS',
      resultPayload: result.raw,
      resultSummary: result.summary
    });
  },

  /**
   * Mark a job as failed with error message
   */
  markFailed(jobId: string, errorMessage: string): Job | null {
    return jobRepository.update(jobId, {
      status: 'FAILED',
      errorMessage
    });
  },

  /**
   * Cancel a job
   * Only PENDING and RUNNING jobs can be cancelled
   */
  cancelJob(jobId: string, userId: string): { success: boolean; message: string } {
    const job = this.getJobForUser(jobId, userId);

    if (!job) {
      return { success: false, message: 'Job not found' };
    }

    if (job.status === 'CANCELLED') {
      return { success: true, message: 'Job is already cancelled' };
    }

    if (job.status === 'SUCCESS' || job.status === 'FAILED') {
      return { success: false, message: `Cannot cancel a job that has already ${job.status.toLowerCase()}` };
    }

    const updated = jobRepository.update(jobId, { status: 'CANCELLED' });

    if (updated) {
      logger.info('Job cancelled', { jobId, userId });
      return { success: true, message: 'Job cancelled successfully' };
    }

    return { success: false, message: 'Failed to cancel job' };
  },

  /**
   * Mark a job as notified
   */
  markNotified(jobId: string): Job | null {
    return jobRepository.update(jobId, { notifiedAt: new Date() });
  },

  /**
   * Get jobs that are pending execution
   */
  getPendingJobs(limit: number = 10): Job[] {
    return jobRepository.findByStatus('PENDING', limit);
  },

  /**
   * Get jobs that need notification
   */
  getJobsNeedingNotification(): Job[] {
    return jobRepository.findPendingNotifications();
  },

  /**
   * Get job counts by status for a user
   */
  getJobCounts(userId: string): Record<JobStatus, number> {
    return jobRepository.countByStatus(userId);
  },

  /**
   * Execute a job using its registered handler
   */
  async executeJob(job: Job): Promise<JobResult> {
    const handler = handlerRegistry.get(job.type);

    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`);
    }

    logger.info('Executing job', {
      jobId: job.id,
      type: job.type
    });

    const result = await handler(job);

    logger.info('Job execution complete', {
      jobId: job.id,
      type: job.type,
      summaryLength: result.summary?.length || 0
    });

    return result;
  },

  /**
   * Update the realtime session ID for a job
   */
  updateSessionId(jobId: string, sessionId: string | null): Job | null {
    return jobRepository.update(jobId, {
      realtimeSessionId: sessionId || undefined
    });
  }
};
