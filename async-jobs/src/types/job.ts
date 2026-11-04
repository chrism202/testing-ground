/**
 * Job Status enum representing all possible states of a job
 */
export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Core Job entity - persisted in database
 */
export interface Job {
  id: string;                    // UUID
  userId: string;                // foreign key to user
  type: string;                  // e.g., "weekly_report", "doc_index", etc.
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;

  // For UX & routing:
  displayName: string;           // human-readable name, e.g. "Weekly report for region EMEA"
  metadata: Record<string, unknown>; // JSON for job-specific inputs (filters, params, etc.)

  // Async pipeline:
  resultPayload?: unknown;       // raw result or reference (e.g., S3 URL)
  resultSummary?: string;        // short NL summary to show & to feed into LLM

  errorMessage?: string;         // present if FAILED

  // Barge-in:
  realtimeSessionId?: string;    // which session to notify, if active
  notifyOnCompletion: boolean;
  notifiedAt?: Date;             // when we successfully sent a completion notification
}

/**
 * Input for creating a new job
 */
export interface CreateJobInput {
  userId: string;
  type: string;
  displayName: string;
  metadata?: Record<string, unknown>;
  realtimeSessionId?: string;
  notifyOnCompletion?: boolean;
}

/**
 * Filters for listing jobs
 */
export interface ListJobsFilter {
  userId: string;
  status?: JobStatus[];
  type?: string;
  limit?: number;
  before?: Date;
  after?: Date;
}

/**
 * Redacted job for LLM consumption - excludes sensitive internal fields
 */
export interface RedactedJob {
  id: string;
  displayName: string;
  type: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  resultSummary?: string;
  errorMessage?: string;
}

/**
 * Result returned by job handlers
 */
export interface JobResult {
  raw: unknown;      // Raw result data (could be a URL, object, etc.)
  summary: string;   // Human-readable summary for LLM/user
}

/**
 * Job handler function signature
 */
export type JobHandler = (job: Job) => Promise<JobResult>;

/**
 * Registry of job handlers by type
 */
export type JobHandlerRegistry = Map<string, JobHandler>;
