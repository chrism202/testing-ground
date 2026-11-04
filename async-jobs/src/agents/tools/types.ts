import { z } from 'zod';

/**
 * Tool definition for OpenAI function calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool execution context
 */
export interface ToolContext {
  userId: string;
  sessionId?: string;
}

/**
 * Generic tool handler type
 */
export type ToolHandler<TInput, TOutput> = (
  input: TInput,
  context: ToolContext
) => Promise<TOutput>;

// ==================== Tool Input/Output Schemas ====================

// create_job
export const createJobInputSchema = z.object({
  type: z.string().describe('The type of job to create (e.g., "weekly_report", "doc_index")'),
  displayName: z.string().describe('Human-readable name for the job'),
  metadata: z.record(z.unknown()).optional().describe('Job-specific parameters and inputs'),
  notifyOnCompletion: z.boolean().optional().default(true).describe('Whether to notify when the job completes')
});

export type CreateJobInput = z.infer<typeof createJobInputSchema>;

export interface CreateJobOutput {
  jobId: string;
  status: string;
  displayName: string;
  message: string;
}

// get_job
export const getJobInputSchema = z.object({
  jobId: z.string().describe('The ID of the job to retrieve')
});

export type GetJobInput = z.infer<typeof getJobInputSchema>;

export interface GetJobOutput {
  job: {
    id: string;
    displayName: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    resultSummary?: string;
    errorMessage?: string;
  } | null;
  found: boolean;
}

// list_jobs
export const listJobsInputSchema = z.object({
  status: z.array(z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'])).optional()
    .describe('Filter by job status(es)'),
  type: z.string().optional().describe('Filter by job type'),
  limit: z.number().int().positive().max(50).optional().default(20)
    .describe('Maximum number of jobs to return')
});

export type ListJobsInput = z.infer<typeof listJobsInputSchema>;

export interface ListJobsOutput {
  jobs: Array<{
    id: string;
    displayName: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    resultSummary?: string;
    errorMessage?: string;
  }>;
  count: number;
}

// cancel_job
export const cancelJobInputSchema = z.object({
  jobId: z.string().describe('The ID of the job to cancel')
});

export type CancelJobInput = z.infer<typeof cancelJobInputSchema>;

export interface CancelJobOutput {
  success: boolean;
  message: string;
  jobId: string;
}
