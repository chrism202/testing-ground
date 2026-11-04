import { sessionRepository } from '../database';
import { SessionState } from '../types';
import { config, logger } from '../config';

/**
 * Session State Tracker
 * Tracks realtime session activity for barge-in decisions
 *
 * v1 Implementation:
 * - Uses database for persistence
 * - Simple idle detection based on speaking/talking flags
 * - Periodic cleanup of stale sessions
 *
 * Future improvements:
 * - WebSocket-based real-time updates
 * - More sophisticated idle detection (timing thresholds)
 * - Queue notifications when session is busy
 */
export const sessionStateTracker = {
  /**
   * Register a new session or update an existing one
   */
  registerSession(sessionId: string, userId: string): SessionState {
    const session = sessionRepository.upsert(sessionId, userId);

    logger.info('Session registered', {
      sessionId,
      userId,
      isNew: session.connectedAt.getTime() === session.lastActivityAt.getTime()
    });

    return session;
  },

  /**
   * Mark a session as disconnected
   */
  disconnectSession(sessionId: string): void {
    const success = sessionRepository.markInactive(sessionId);

    if (success) {
      logger.info('Session disconnected', { sessionId });
    } else {
      logger.warn('Failed to disconnect session - not found', { sessionId });
    }
  },

  /**
   * Get the current state of a session
   */
  getSessionState(sessionId: string): SessionState | null {
    return sessionRepository.findById(sessionId);
  },

  /**
   * Check if a session is available for barge-in
   */
  canBargeIn(sessionId: string): boolean {
    const session = sessionRepository.findById(sessionId);

    if (!session) {
      logger.debug('Cannot barge in: session not found', { sessionId });
      return false;
    }

    if (!session.isActive) {
      logger.debug('Cannot barge in: session inactive', { sessionId });
      return false;
    }

    if (session.currentlySpeaking) {
      logger.debug('Cannot barge in: assistant is speaking', { sessionId });
      return false;
    }

    if (session.userTalking) {
      logger.debug('Cannot barge in: user is talking', { sessionId });
      return false;
    }

    return true;
  },

  /**
   * Update the speaking state of a session
   * Called when the assistant starts/stops speaking
   */
  setSpeaking(sessionId: string, isSpeaking: boolean): void {
    sessionRepository.update(sessionId, {
      currentlySpeaking: isSpeaking,
      lastActivityAt: new Date()
    });

    logger.debug('Session speaking state updated', { sessionId, isSpeaking });
  },

  /**
   * Update the user talking state
   * Called based on VAD (Voice Activity Detection) events
   */
  setUserTalking(sessionId: string, isTalking: boolean): void {
    sessionRepository.update(sessionId, {
      userTalking: isTalking,
      lastActivityAt: new Date()
    });

    logger.debug('Session user talking state updated', { sessionId, isTalking });
  },

  /**
   * Record activity on a session (heartbeat)
   */
  recordActivity(sessionId: string): void {
    sessionRepository.update(sessionId, {
      lastActivityAt: new Date()
    });
  },

  /**
   * Get all active sessions for a user
   */
  getActiveSessionsForUser(userId: string): SessionState[] {
    return sessionRepository.findActiveByUserId(userId);
  },

  /**
   * Get the most recent active session for a user
   */
  getMostRecentSession(userId: string): SessionState | null {
    const sessions = sessionRepository.findActiveByUserId(userId);

    if (sessions.length === 0) {
      return null;
    }

    // Sessions are ordered by lastActivityAt DESC, so first is most recent
    return sessions[0];
  },

  /**
   * Clean up stale sessions (called periodically)
   */
  cleanupStaleSessions(): number {
    const cleaned = sessionRepository.cleanupStale(config.sessionIdleTimeout);

    if (cleaned > 0) {
      logger.info('Cleaned up stale sessions', { count: cleaned });
    }

    return cleaned;
  },

  /**
   * Start periodic cleanup task
   */
  startCleanupTask(intervalMs: number = 60000): NodeJS.Timeout {
    logger.info('Starting session cleanup task', { intervalMs });

    return setInterval(() => {
      this.cleanupStaleSessions();
    }, intervalMs);
  }
};
