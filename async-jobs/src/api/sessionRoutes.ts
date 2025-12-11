import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sessionRepository } from '../database';
import { logger } from '../config';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1)
});

const updateSessionSchema = z.object({
  currentlySpeaking: z.boolean().optional(),
  userTalking: z.boolean().optional(),
  isActive: z.boolean().optional()
});

/**
 * POST /sessions
 * Create or update a session (upsert)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const result = createSessionSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors
      });
      return;
    }

    const { sessionId, userId } = result.data;
    const session = sessionRepository.upsert(sessionId, userId);

    logger.info('Session upserted', { sessionId, userId });

    res.status(201).json({ session });
  } catch (err) {
    logger.error('Failed to create session', { error: err });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /sessions/:sessionId
 * Get a session by ID
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionRepository.findById(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (err) {
    logger.error('Failed to get session', { error: err });
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * PATCH /sessions/:sessionId
 * Update session state
 */
router.patch('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = updateSessionSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors
      });
      return;
    }

    const session = sessionRepository.update(sessionId, result.data);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (err) {
    logger.error('Failed to update session', { error: err });
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * DELETE /sessions/:sessionId
 * Mark a session as inactive (disconnect)
 */
router.delete('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const success = sessionRepository.markInactive(sessionId);

    if (!success) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session marked inactive' });
  } catch (err) {
    logger.error('Failed to deactivate session', { error: err });
    res.status(500).json({ error: 'Failed to deactivate session' });
  }
});

/**
 * GET /sessions/user/:userId/active
 * Get active sessions for a user
 */
router.get('/user/:userId/active', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const sessions = sessionRepository.findActiveByUserId(userId);

    res.json({ sessions, count: sessions.length });
  } catch (err) {
    logger.error('Failed to get user sessions', { error: err });
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

/**
 * GET /sessions/:sessionId/idle
 * Check if a session is idle
 */
router.get('/:sessionId/idle', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const isIdle = sessionRepository.isIdle(sessionId);
    const session = sessionRepository.findById(sessionId);

    res.json({
      sessionId,
      isIdle,
      session: session || null
    });
  } catch (err) {
    logger.error('Failed to check session idle status', { error: err });
    res.status(500).json({ error: 'Failed to check session idle status' });
  }
});

export { router as sessionRoutes };
