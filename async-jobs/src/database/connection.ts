import Database from 'better-sqlite3';
import path from 'path';
import { JOBS_TABLE_SCHEMA, SESSIONS_TABLE_SCHEMA } from './schema';
import { logger } from '../config/logger';

let db: Database.Database | null = null;

/**
 * Initialize the database connection
 * @param dbPath - Path to SQLite database file, defaults to ./data/jobs.db
 */
export function initializeDatabase(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'jobs.db');

  // Ensure the data directory exists
  const dataDir = path.dirname(resolvedPath);
  const fs = require('fs');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  logger.info(`Initializing database at ${resolvedPath}`);

  db = new Database(resolvedPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  logger.info('Database initialized successfully');

  return db;
}

/**
 * Get the database instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
  logger.info('Running database migrations...');

  // Jobs table
  database.exec(JOBS_TABLE_SCHEMA);
  logger.info('Jobs table migration complete');

  // Sessions table
  database.exec(SESSIONS_TABLE_SCHEMA);
  logger.info('Sessions table migration complete');
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Initialize an in-memory database (useful for testing)
 */
export function initializeInMemoryDatabase(): Database.Database {
  if (db) {
    db.close();
  }

  db = new Database(':memory:');
  runMigrations(db);

  logger.info('In-memory database initialized');

  return db;
}
