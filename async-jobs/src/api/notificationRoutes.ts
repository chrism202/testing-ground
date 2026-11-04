import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { realtimeService } from '../services/realtimeService';
import { logger } from '../config';

const router = Router();

// Validation schema
const notifySchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  jobId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional()
});

/**
 * POST /internal/realtime/notify
 * Send a notification to a realtime session (barge-in)
 * This is an internal API, typically called by the notification service
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const result = notifySchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors
      });
      return;
    }

    const { sessionId, text, jobId, priority } = result.data;

    logger.info('Received notification request', {
      sessionId,
      jobId,
      textPreview: text.substring(0, 50),
      priority
    });

    const sent = await realtimeService.sendNotification({
      sessionId,
      text,
      jobId,
      priority: priority as 'low' | 'normal' | 'high'
    });

    if (sent) {
      res.json({
        success: true,
        message: 'Notification sent',
        sessionId
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Failed to send notification - session may be unavailable'
      });
    }
  } catch (err) {
    logger.error('Failed to send notification', { error: err });
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * GET /internal/realtime/session/:sessionId/status
 * Check if a session is available for notification
 */
router.get('/session/:sessionId/status', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const isIdle = realtimeService.isSessionIdle(sessionId);

    res.json({
      sessionId,
      isIdle,
      canNotify: isIdle
    });
  } catch (err) {
    logger.error('Failed to check session status', { error: err });
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

export { router as notificationRoutes };
