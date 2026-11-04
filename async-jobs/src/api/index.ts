import express, { Express, Request, Response, NextFunction } from 'express';
import { jobRoutes } from './jobRoutes';
import { sessionRoutes } from './sessionRoutes';
import { notificationRoutes } from './notificationRoutes';
import { logger } from '../config';

/**
 * Create and configure the Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/jobs', jobRoutes);
  app.use('/sessions', sessionRoutes);
  app.use('/internal/realtime', notificationRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export { jobRoutes } from './jobRoutes';
export { sessionRoutes } from './sessionRoutes';
export { notificationRoutes } from './notificationRoutes';
