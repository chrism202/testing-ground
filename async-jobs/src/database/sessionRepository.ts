import { getDatabase } from './connection';
import { SessionState, SessionStateUpdate } from '../types';
import { logger } from '../config/logger';

/**
 * Convert a database row to a SessionState object
 */
function rowToSession(row: Record<string, unknown>): SessionState {
  return {
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    currentlySpeaking: Boolean(row.currently_speaking),
    userTalking: Boolean(row.user_talking),
    lastActivityAt: new Date(row.last_activity_at as string),
    connectedAt: new Date(row.connected_at as string),
    isActive: Boolean(row.is_active)
  };
}

/**
 * Session Repository - handles session state tracking for barge-in
 */
export const sessionRepository = {
  /**
   * Create or update a session
   */
  upsert(sessionId: string, userId: string): SessionState {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Try to update existing session first
    const updateStmt = db.prepare(`
      UPDATE sessions SET
        is_active = 1,
        last_activity_at = ?
      WHERE session_id = ?
    `);

    const updateResult = updateStmt.run(now, sessionId);

    if (updateResult.changes === 0) {
      // Insert new session
      const insertStmt = db.prepare(`
        INSERT INTO sessions (
          session_id, user_id, currently_speaking, user_talking,
          last_activity_at, connected_at, is_active
        ) VALUES (?, ?, 0, 0, ?, ?, 1)
      `);

      insertStmt.run(sessionId, userId, now, now);
      logger.info('Session created', { sessionId, userId });
    } else {
      logger.debug('Session updated', { sessionId });
    }

    return this.findById(sessionId)!;
  },

  /**
   * Find a session by ID
   */
  findById(sessionId: string): SessionState | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
    const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return rowToSession(row);
  },

  /**
   * Find active sessions for a user
   */
  findActiveByUserId(userId: string): SessionState[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND is_active = 1
      ORDER BY last_activity_at DESC
    `);

    const rows = stmt.all(userId) as Record<string, unknown>[];
    return rows.map(rowToSession);
  },

  /**
   * Update session state
   */
  update(sessionId: string, updates: SessionStateUpdate): SessionState | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.currentlySpeaking !== undefined) {
      setClauses.push('currently_speaking = ?');
      values.push(updates.currentlySpeaking ? 1 : 0);
    }

    if (updates.userTalking !== undefined) {
      setClauses.push('user_talking = ?');
      values.push(updates.userTalking ? 1 : 0);
    }

    if (updates.lastActivityAt !== undefined) {
      setClauses.push('last_activity_at = ?');
      values.push(updates.lastActivityAt.toISOString());
    } else {
      // Always update last activity time
      setClauses.push('last_activity_at = ?');
      values.push(now);
    }

    if (updates.isActive !== undefined) {
      setClauses.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return this.findById(sessionId);
    }

    values.push(sessionId);

    const stmt = db.prepare(`
      UPDATE sessions SET ${setClauses.join(', ')} WHERE session_id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    logger.debug('Session state updated', { sessionId, updates });

    return this.findById(sessionId);
  },

  /**
   * Mark a session as inactive (disconnected)
   */
  markInactive(sessionId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE sessions SET is_active = 0 WHERE session_id = ?
    `);

    const result = stmt.run(sessionId);

    if (result.changes > 0) {
      logger.info('Session marked inactive', { sessionId });
      return true;
    }

    return false;
  },

  /**
   * Check if a session is idle (not speaking, user not talking)
   */
  isIdle(sessionId: string): boolean {
    const session = this.findById(sessionId);

    if (!session) {
      return false;
    }

    return session.isActive && !session.currentlySpeaking && !session.userTalking;
  },

  /**
   * Clean up stale sessions (older than the configured timeout)
   */
  cleanupStale(maxAgeMs: number): number {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const stmt = db.prepare(`
      UPDATE sessions SET is_active = 0
      WHERE is_active = 1 AND last_activity_at < ?
    `);

    const result = stmt.run(cutoff);

    if (result.changes > 0) {
      logger.info('Cleaned up stale sessions', { count: result.changes });
    }

    return result.changes;
  },

  /**
   * Delete a session
   */
  delete(sessionId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    const result = stmt.run(sessionId);

    if (result.changes > 0) {
      logger.info('Session deleted', { sessionId });
      return true;
    }

    return false;
  }
};
