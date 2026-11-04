import { jobService, redactJobForLLM } from '../../services/jobService';
import { getQueue } from '../../queue';
import { JobStatus } from '../../types';
import { logger } from '../../config';
import {
  ToolDefinition,
  ToolContext,
  CreateJobInput,
  CreateJobOutput,
  GetJobInput,
  GetJobOutput,
  ListJobsInput,
  ListJobsOutput,
  CancelJobInput,
  CancelJobOutput
} from './types';

/**
 * Tool definitions for OpenAI function calling format
 */
export const jobToolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_job',
      description: 'Create a new background job for a long-running task. Use this for operations that may take more than a few seconds, such as generating reports, indexing documents, or processing large datasets.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'The type of job to create (e.g., "weekly_report", "doc_index", "data_export")'
          },
          displayName: {
            type: 'string',
            description: 'A human-readable name for the job that will be shown to the user'
          },
          metadata: {
            type: 'object',
            description: 'Job-specific parameters and inputs (e.g., filters, date ranges, regions)'
          },
          notifyOnCompletion: {
            type: 'boolean',
            description: 'Whether to proactively notify the user when the job completes',
            default: true
          }
        },
        required: ['type', 'displayName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_job',
      description: 'Get the current status and details of a specific job by its ID.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The unique identifier of the job to retrieve'
          }
        },
        required: ['jobId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_jobs',
      description: 'List jobs for the current user with optional filters. Use this to show the user what tasks are currently running or have completed.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']
            },
            description: 'Filter by job status(es). If not specified, returns jobs of all statuses.'
          },
          type: {
            type: 'string',
            description: 'Filter by job type (e.g., "weekly_report")'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of jobs to return (default: 20, max: 50)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_job',
      description: 'Cancel a pending or running job. Cannot cancel jobs that have already completed or failed.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The unique identifier of the job to cancel'
          }
        },
        required: ['jobId']
      }
    }
  }
];

/**
 * Create a new job
 */
export async function tool_createJob(
  input: CreateJobInput,
  context: ToolContext
): Promise<CreateJobOutput> {
  logger.info('Tool: create_job called', {
    userId: context.userId,
    type: input.type,
    displayName: input.displayName
  });

  const job = jobService.createJob({
    userId: context.userId,
    type: input.type,
    displayName: input.displayName,
    metadata: input.metadata || {},
    realtimeSessionId: context.sessionId,
    notifyOnCompletion: input.notifyOnCompletion !== false
  });

  // Enqueue the job for processing
  const queue = getQueue();
  await queue.enqueue({
    jobId: job.id,
    enqueuedAt: new Date()
  });

  logger.info('Tool: create_job completed', { jobId: job.id });

  return {
    jobId: job.id,
    status: job.status,
    displayName: job.displayName,
    message: `Job "${job.displayName}" has been created and queued for processing.`
  };
}

/**
 * Get a job by ID
 */
export async function tool_getJob(
  input: GetJobInput,
  context: ToolContext
): Promise<GetJobOutput> {
  logger.info('Tool: get_job called', {
    userId: context.userId,
    jobId: input.jobId
  });

  const job = jobService.getJobForUser(input.jobId, context.userId);

  if (!job) {
    return {
      job: null,
      found: false
    };
  }

  const redacted = redactJobForLLM(job);

  return {
    job: {
      id: redacted.id,
      displayName: redacted.displayName,
      type: redacted.type,
      status: redacted.status,
      createdAt: redacted.createdAt.toISOString(),
      updatedAt: redacted.updatedAt.toISOString(),
      resultSummary: redacted.resultSummary,
      errorMessage: redacted.errorMessage
    },
    found: true
  };
}

/**
 * List jobs for the user
 */
export async function tool_listJobs(
  input: ListJobsInput,
  context: ToolContext
): Promise<ListJobsOutput> {
  logger.info('Tool: list_jobs called', {
    userId: context.userId,
    status: input.status,
    type: input.type
  });

  const jobs = jobService.listJobsForLLM({
    userId: context.userId,
    status: input.status as JobStatus[],
    type: input.type,
    limit: input.limit || 20
  });

  return {
    jobs: jobs.map(job => ({
      id: job.id,
      displayName: job.displayName,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      resultSummary: job.resultSummary,
      errorMessage: job.errorMessage
    })),
    count: jobs.length
  };
}

/**
 * Cancel a job
 */
export async function tool_cancelJob(
  input: CancelJobInput,
  context: ToolContext
): Promise<CancelJobOutput> {
  logger.info('Tool: cancel_job called', {
    userId: context.userId,
    jobId: input.jobId
  });

  const result = jobService.cancelJob(input.jobId, context.userId);

  return {
    success: result.success,
    message: result.message,
    jobId: input.jobId
  };
}

/**
 * Execute a tool by name
 */
export async function executeJobTool(
  toolName: string,
  args: unknown,
  context: ToolContext
): Promise<unknown> {
  switch (toolName) {
    case 'create_job':
      return tool_createJob(args as CreateJobInput, context);
    case 'get_job':
      return tool_getJob(args as GetJobInput, context);
    case 'list_jobs':
      return tool_listJobs(args as ListJobsInput, context);
    case 'cancel_job':
      return tool_cancelJob(args as CancelJobInput, context);
    default:
      throw new Error(`Unknown job tool: ${toolName}`);
  }
}
