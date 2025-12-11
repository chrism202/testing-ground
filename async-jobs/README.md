# Async Jobs + Model-Driven Barge-In

A complete implementation of an async job system with model-driven notifications for realtime voice agents.

## Overview

This system enables:
- **Async Jobs**: Long-running tasks that run in the background
- **Multiple Concurrent Jobs**: Users can have many jobs running simultaneously
- **Persistent Job State**: Jobs survive session closures and restarts
- **Model-Driven Barge-In**: Proactive notifications via the realtime voice session when jobs complete

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat Agent    │────▶│   Supervisor    │────▶│   Job Service   │
│   (Realtime)    │◀────│    Agent        │◀────│                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
        ▲                                                │
        │                                                ▼
        │                                       ┌─────────────────┐
        │                                       │   Job Queue     │
        │                                       │   (Workers)     │
        │                                       └────────┬────────┘
        │                                                │
        │               ┌─────────────────┐              │
        └───────────────│  Notification   │◀─────────────┘
                        │    Service      │
                        └─────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Run the demo
npm run dev -- src/demo.ts

# Start the server
npm run dev

# Start a standalone worker
npm run worker
```

## API Endpoints

### Jobs

- `POST /jobs` - Create a new job
- `GET /jobs/:id` - Get job details
- `GET /jobs?userId=...` - List jobs for a user
- `POST /jobs/:id/cancel` - Cancel a job
- `GET /jobs/stats/:userId` - Get job statistics

### Sessions

- `POST /sessions` - Register a session
- `GET /sessions/:sessionId` - Get session state
- `PATCH /sessions/:sessionId` - Update session state
- `DELETE /sessions/:sessionId` - Disconnect session

### Internal (Notifications)

- `POST /internal/realtime/notify` - Send barge-in notification
- `GET /internal/realtime/session/:sessionId/status` - Check session availability

## Supervisor Agent Tools

The Supervisor Agent has access to these tools for job management:

### create_job
```typescript
{
  type: 'weekly_report',
  displayName: 'Weekly EMEA Sales Report',
  metadata: { region: 'EMEA', weekStart: '2025-12-01' },
  notifyOnCompletion: true
}
```

### get_job
```typescript
{ jobId: 'job_123' }
```

### list_jobs
```typescript
{
  status: ['PENDING', 'RUNNING'],
  type: 'weekly_report',
  limit: 20
}
```

### cancel_job
```typescript
{ jobId: 'job_123' }
```

## Job Types

Built-in demo handlers:

- `weekly_report` - Generate sales/metrics reports
- `doc_index` - Index documents for search
- `data_export` - Export data to CSV/JSON

### Adding Custom Handlers

```typescript
import { jobService } from './services/jobService';
import { JobHandler } from './types';

const myHandler: JobHandler = async (job) => {
  // Do work...
  return {
    raw: { /* result data */ },
    summary: 'Human-readable summary'
  };
};

jobService.registerHandler('my_job_type', myHandler);
```

## Configuration

Environment variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/jobs.db

# Redis (for BullMQ in production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI (for Supervisor notifications)
OPENAI_API_KEY=

# Job settings
JOB_QUEUE_NAME=async-jobs
JOB_DEFAULT_TIMEOUT=300000
MAX_CONCURRENT_JOBS=5

# Notification settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=1000

# Session settings
SESSION_IDLE_TIMEOUT=300000
```

## Project Structure

```
src/
├── agents/                 # Agent-related code
│   ├── prompts/           # System prompts for agents
│   └── tools/             # Tool implementations
├── api/                   # REST API routes
├── config/                # Configuration & logging
├── database/              # SQLite database layer
├── jobs/                  # Job handlers
│   └── handlers/          # Job type implementations
├── queue/                 # Job queue (memory/BullMQ)
├── services/              # Business logic services
├── types/                 # TypeScript types
├── index.ts               # Main entry point
├── worker.ts              # Standalone worker
└── demo.ts                # Demo script
```

## Key Flows

### Job Creation
1. User requests a long-running task
2. Chat Agent forwards to Supervisor
3. Supervisor calls `create_job` tool
4. Job is persisted and queued
5. User is informed about the job

### Job Completion Notification
1. Worker completes job
2. `onJobCompleted` hook fires
3. Notification Service checks if session is idle
4. Supervisor generates notification text
5. Barge-in sent to Realtime session
6. Chat Agent speaks the notification

### Status Query
1. User asks "What are you working on?"
2. Supervisor calls `list_jobs` tool
3. Results formatted for voice delivery
4. Chat Agent speaks the summary

## Production Considerations

### Queue Backend
For production, use BullMQ with Redis:

```bash
QUEUE_TYPE=bullmq
REDIS_HOST=your-redis-host
```

### Database
Consider migrating to PostgreSQL for production workloads.

### Scaling
- Run multiple worker instances for parallel job processing
- Use Redis for queue coordination
- Consider separate read replicas for job queries

### Monitoring
- Job lifecycle transitions are logged
- Notification delivery is tracked
- Session state changes are recorded

## Security Notes

- Jobs are scoped to `userId` - users can only see their own jobs
- Session IDs should be validated against user ownership
- Internal notification API should be restricted to internal services
