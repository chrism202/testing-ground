/**
 * Database schema definitions and migration
 */

export const JOBS_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  display_name TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  result_payload TEXT,
  result_summary TEXT,
  error_message TEXT,
  realtime_session_id TEXT,
  notify_on_completion INTEGER NOT NULL DEFAULT 1,
  notified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
`;

export const SESSIONS_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  currently_speaking INTEGER NOT NULL DEFAULT 0,
  user_talking INTEGER NOT NULL DEFAULT 0,
  last_activity_at TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
`;
