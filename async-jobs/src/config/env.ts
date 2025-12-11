/**
 * Environment configuration
 */
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databasePath: process.env.DATABASE_PATH || './data/jobs.db',

  // Redis (for BullMQ job queue)
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD,

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Job settings
  jobQueueName: process.env.JOB_QUEUE_NAME || 'async-jobs',
  jobDefaultTimeout: parseInt(process.env.JOB_DEFAULT_TIMEOUT || '300000', 10), // 5 minutes
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),

  // Notification settings
  notificationRetryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
  notificationRetryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '1000', 10),

  // Session settings
  sessionIdleTimeout: parseInt(process.env.SESSION_IDLE_TIMEOUT || '300000', 10), // 5 minutes
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const warnings: string[] = [];

  if (!config.openaiApiKey) {
    warnings.push('OPENAI_API_KEY is not set - Supervisor agent notifications will use fallback templates');
  }

  if (warnings.length > 0) {
    console.warn('Configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}
