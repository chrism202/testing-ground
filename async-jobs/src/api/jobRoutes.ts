import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { jobService } from '../services/jobService';
import { getQueue } from '../queue';
import { JobStatus } from '../types';
import { logger } from '../config';

const router = Router();

// Validation schemas
const createJobSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  displayName: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  realtimeSessionId: z.string().optional(),
  notifyOnCompletion: z.boolean().optional()
});

const listJobsSchema = z.object({
  userId: z.string().min(1),
  status: z.array(z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'])).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

/**
 * Middleware to validate request body against a Zod schema
 */
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware to validate query parameters
 */
function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Convert status to array if it's a string
    if (typeof req.query.status === 'string') {
      req.query.status = [req.query.status];
    }

    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors
      });
      return;
    }
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}

/**
 * POST /jobs
 * Create a new job
 */
router.post('/', validateBody(createJobSchema), async (req: Request, res: Response) => {
  try {
    const job = jobService.createJob(req.body);

    // Enqueue the job for processing
    const queue = getQueue();
    await queue.enqueue({
      jobId: job.id,
      enqueuedAt: new Date()
    });

    logger.info('Job created via API', { jobId: job.id, type: job.type });

    res.status(201).json({ job });
  } catch (err) {
    logger.error('Failed to create job', { error: err });
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * GET /jobs/:id
 * Get a job by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    let job;
    if (userId && typeof userId === 'string') {
      // If userId is provided, enforce ownership
      job = jobService.getJobForUser(id, userId);
    } else {
      // Allow fetching without userId check (for internal use)
      job = jobService.getJob(id);
    }

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
  } catch (err) {
    logger.error('Failed to get job', { error: err });
    res.status(500).json({ error: 'Failed to get job' });
  }
});

/**
 * GET /jobs
 * List jobs with filters
 */
router.get('/', validateQuery(listJobsSchema), (req: Request, res: Response) => {
  try {
    const query = (req as Request & { validatedQuery: z.infer<typeof listJobsSchema> }).validatedQuery;

    const jobs = jobService.listJobs({
      userId: query.userId,
      status: query.status as JobStatus[],
      type: query.type,
      limit: query.limit
    });

    res.json({ jobs, count: jobs.length });
  } catch (err) {
    logger.error('Failed to list jobs', { error: err });
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

/**
 * POST /jobs/:id/cancel
 * Cancel a job
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = jobService.cancelJob(id, userId);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    const job = jobService.getJob(id);
    res.json({ success: true, message: result.message, job });
  } catch (err) {
    logger.error('Failed to cancel job', { error: err });
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

/**
 * GET /jobs/stats/:userId
 * Get job statistics for a user
 */
router.get('/stats/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const counts = jobService.getJobCounts(userId);

    res.json({
      userId,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0)
    });
  } catch (err) {
    logger.error('Failed to get job stats', { error: err });
    res.status(500).json({ error: 'Failed to get job stats' });
  }
});

export { router as jobRoutes };
