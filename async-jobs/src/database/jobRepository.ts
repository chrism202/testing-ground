import { getDatabase } from './connection';
import { Job, JobStatus, CreateJobInput, ListJobsFilter } from '../types';
import { v4 as uuid } from 'uuid';
import { logger } from '../config/logger';

/**
 * Convert a database row to a Job object
 */
function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    status: row.status as JobStatus,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    displayName: row.display_name as string,
    metadata: JSON.parse((row.metadata as string) || '{}'),
    resultPayload: row.result_payload ? JSON.parse(row.result_payload as string) : undefined,
    resultSummary: row.result_summary as string | undefined,
    errorMessage: row.error_message as string | undefined,
    realtimeSessionId: row.realtime_session_id as string | undefined,
    notifyOnCompletion: Boolean(row.notify_on_completion),
    notifiedAt: row.notified_at ? new Date(row.notified_at as string) : undefined
  };
}

/**
 * Job Repository - handles all job-related database operations
 */
export const jobRepository = {
  /**
   * Create a new job
   */
  create(input: CreateJobInput): Job {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = uuid();

    const stmt = db.prepare(`
      INSERT INTO jobs (
        id, user_id, type, status, created_at, updated_at,
        display_name, metadata, realtime_session_id, notify_on_completion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.userId,
      input.type,
      'PENDING',
      now,
      now,
      input.displayName,
      JSON.stringify(input.metadata || {}),
      input.realtimeSessionId || null,
      input.notifyOnCompletion !== false ? 1 : 0
    );

    logger.info('Job created', { jobId: id, type: input.type, userId: input.userId });

    return this.findById(id)!;
  },

  /**
   * Find a job by ID
   */
  findById(id: string): Job | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return rowToJob(row);
  },

  /**
   * Update a job
   */
  update(id: string, updates: Partial<Omit<Job, 'id' | 'userId' | 'createdAt'>>): Job | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.displayName !== undefined) {
      setClauses.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.resultPayload !== undefined) {
      setClauses.push('result_payload = ?');
      values.push(JSON.stringify(updates.resultPayload));
    }
    if (updates.resultSummary !== undefined) {
      setClauses.push('result_summary = ?');
      values.push(updates.resultSummary);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.realtimeSessionId !== undefined) {
      setClauses.push('realtime_session_id = ?');
      values.push(updates.realtimeSessionId);
    }
    if (updates.notifyOnCompletion !== undefined) {
      setClauses.push('notify_on_completion = ?');
      values.push(updates.notifyOnCompletion ? 1 : 0);
    }
    if (updates.notifiedAt !== undefined) {
      setClauses.push('notified_at = ?');
      values.push(updates.notifiedAt.toISOString());
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?
    `);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    logger.info('Job updated', { jobId: id, updates: Object.keys(updates) });

    return this.findById(id);
  },

  /**
   * Find jobs matching filters
   */
  find(filters: ListJobsFilter): Job[] {
    const db = getDatabase();

    const whereClauses: string[] = ['user_id = ?'];
    const values: unknown[] = [filters.userId];

    if (filters.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => '?').join(', ');
      whereClauses.push(`status IN (${placeholders})`);
      values.push(...filters.status);
    }

    if (filters.type) {
      whereClauses.push('type = ?');
      values.push(filters.type);
    }

    if (filters.before) {
      whereClauses.push('created_at < ?');
      values.push(filters.before.toISOString());
    }

    if (filters.after) {
      whereClauses.push('created_at > ?');
      values.push(filters.after.toISOString());
    }

    const limit = filters.limit || 20;

    const stmt = db.prepare(`
      SELECT * FROM jobs
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ?
    `);

    values.push(limit);

    const rows = stmt.all(...values) as Record<string, unknown>[];
    return rows.map(rowToJob);
  },

  /**
   * Find jobs by status (for worker processing)
   */
  findByStatus(status: JobStatus, limit: number = 10): Job[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM jobs
      WHERE status = ?
      ORDER BY created_at ASC
      LIMIT ?
    `);

    const rows = stmt.all(status, limit) as Record<string, unknown>[];
    return rows.map(rowToJob);
  },

  /**
   * Find jobs that need notification
   */
  findPendingNotifications(): Job[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM jobs
      WHERE status IN ('SUCCESS', 'FAILED')
        AND notify_on_completion = 1
        AND notified_at IS NULL
        AND realtime_session_id IS NOT NULL
      ORDER BY updated_at ASC
    `);

    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(rowToJob);
  },

  /**
   * Delete a job
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      logger.info('Job deleted', { jobId: id });
      return true;
    }

    return false;
  },

  /**
   * Count jobs by status for a user
   */
  countByStatus(userId: string): Record<JobStatus, number> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      WHERE user_id = ?
      GROUP BY status
    `);

    const rows = stmt.all(userId) as Array<{ status: string; count: number }>;

    const counts: Record<JobStatus, number> = {
      PENDING: 0,
      RUNNING: 0,
      SUCCESS: 0,
      FAILED: 0,
      CANCELLED: 0
    };

    for (const row of rows) {
      counts[row.status as JobStatus] = row.count;
    }

    return counts;
  }
};
