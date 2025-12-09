# Speech-to-Tasks Translation Layer

A sophisticated middleware system that bridges continuous speech-to-speech LLM interactions with discrete task execution via Model Context Protocol (MCP) servers.

## Overview

This translation layer solves a critical architectural challenge: **How do you connect a continuous, real-time conversational AI (like speech-to-speech models) with discrete, asynchronous task execution systems (like MCP tool servers)?**

The layer sits between these two systems, intelligently detecting actionable tasks within natural conversation, dispatching them for execution, and seamlessly integrating results back into the conversation flow.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Continuous Speech Stream                    │
│                 (Speech-to-Speech LLM)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              TRANSLATION LAYER                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Stream    │→ │     Task     │→ │     Task     │       │
│  │   Parser    │  │   Detector   │  │    Queue     │       │
│  └─────────────┘  └──────────────┘  └──────┬───────┘       │
│                                              │               │
│  ┌─────────────┐                            │               │
│  │   Result    │←───────────────────────────┘               │
│  │ Integrator  │                                             │
│  └─────────────┘                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client                                │
│              (Tool Execution Layer)                          │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 MCP Server(s)                                │
│          (Search, Files, APIs, etc.)                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. **Stream Parser**
- Parses continuous conversation into structured messages
- Maintains conversation history and context
- Provides context extraction for task detection

### 2. **Task Detector**
- Pattern-based task detection using regex
- Optional smart detection using action verbs and context
- Customizable task patterns
- Deduplication to avoid redundant tasks

### 3. **Task Queue**
- Priority-based task queuing
- Concurrent task execution with configurable limits
- Timeout handling
- Task lifecycle management (pending → in_progress → completed/failed)

### 4. **MCP Client**
- Connects to MCP servers via stdio or SSE transport
- Maps task intents to MCP tools
- Executes tasks and returns structured results
- Tool discovery and management

### 5. **Result Integrator**
- Integrates task results back into conversation
- Multiple integration strategies:
  - **Inline**: Natural conversation flow
  - **Summary**: Brief summary with details
  - **Reference**: Task ID reference with result

## Installation

```bash
npm install speech-to-tasks-layer
```

## Quick Start

```typescript
import { TranslationLayer } from 'speech-to-tasks-layer';

const layer = new TranslationLayer({
  maxConcurrentTasks: 3,
  taskTimeout: 30000,
  enableSmartDetection: true,
  resultIntegrationStrategy: 'inline',
  mcpServerConfig: {
    serverPath: 'npx',
    transport: 'stdio',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
});

layer.onEvent((event) => {
  console.log('Event:', event.type, event);
});

await layer.initialize();

await layer.processMessage({
  id: 'msg-1',
  timestamp: Date.now(),
  role: 'user',
  content: 'Search for the latest AI news and calculate 15 * 23',
});

const stats = layer.getQueueStats();
console.log('Queue stats:', stats);

await layer.shutdown();
```

## Configuration

```typescript
interface TranslationLayerConfig {
  maxConcurrentTasks?: number;        // Max parallel tasks (default: 3)
  taskTimeout?: number;                // Task timeout in ms (default: 30000)
  streamBufferSize?: number;           // Message history size (default: 100)
  enableSmartDetection?: boolean;      // Use smart detection (default: false)
  taskPatterns?: TaskPattern[];        // Custom task patterns
  mcpServerConfig?: MCPServerConfig;   // MCP server configuration
  resultIntegrationStrategy?: 'inline' | 'summary' | 'reference'; // Result strategy
}
```

## Custom Task Patterns

Add custom patterns to detect domain-specific tasks:

```typescript
import { TaskPattern } from 'speech-to-tasks-layer';

const weatherPattern: TaskPattern = {
  name: 'weather_query',
  intent: 'get_weather',
  patterns: [
    /(?:what'?s|what is)\s+the\s+weather\s+(?:in|at)\s+(.+?)(?:\.|$|\?)/i,
  ],
  priority: 'high',
  parameterExtractors: {
    location: (match) => match[1]?.trim(),
  },
};

layer.addTaskPattern(weatherPattern);
```

## Events

The translation layer emits typed events:

```typescript
layer.onEvent((event) => {
  switch (event.type) {
    case 'stream_message':
      console.log('New message:', event.message);
      break;
    case 'task_detected':
      console.log('Task detected:', event.task);
      break;
    case 'task_started':
      console.log('Task started:', event.taskId);
      break;
    case 'task_completed':
      console.log('Task completed:', event.task);
      break;
    case 'task_failed':
      console.log('Task failed:', event.taskId, event.error);
      break;
    case 'result_integrated':
      console.log('Result integrated:', event.message);
      break;
    case 'error':
      console.error('Error:', event.error);
      break;
  }
});
```

## API Reference

### TranslationLayer

#### Methods

- `initialize(): Promise<void>` - Initialize and connect to MCP server
- `processMessage(input: string | StreamMessage): Promise<StreamMessage>` - Process a conversation message
- `getHistory(limit?: number): StreamMessage[]` - Get conversation history
- `getTask(taskId: string): Task | undefined` - Get task by ID
- `getTasksByStatus(status): Task[]` - Get tasks by status
- `getQueueStats()` - Get queue statistics
- `cancelTask(taskId: string): boolean` - Cancel a task
- `addTaskPattern(pattern: TaskPattern): void` - Add custom task pattern
- `setIntegrationStrategy(strategy): void` - Set result integration strategy
- `listAvailableTools(): Promise<string[]>` - List available MCP tools
- `shutdown(): Promise<void>` - Shutdown the layer
- `onEvent(callback: EventCallback): void` - Register event listener
- `isReady(): boolean` - Check if layer is ready

## Examples

See the `/src/examples` directory for complete examples:

- `basic-usage.ts` - Basic setup and usage
- `custom-patterns.ts` - Custom task pattern detection
- `streaming-conversation.ts` - Simulated continuous conversation

## Use Cases

1. **Voice Assistants**: Detect tasks from natural speech and execute them asynchronously
2. **Chat Bots**: Extract actionable items from conversation and handle them with tools
3. **Meeting Assistants**: Identify action items during meetings and create tasks
4. **Customer Support**: Route customer requests to appropriate tools automatically
5. **Smart Home**: Parse voice commands and execute device controls
6. **Productivity Apps**: Detect todos, reminders, and calendar events from chat

## Advanced Features

### Task Priorities

Tasks are prioritized: `urgent` > `high` > `medium` > `low`

```typescript
const urgentTask: TaskPattern = {
  name: 'emergency_alert',
  intent: 'alert',
  patterns: [/urgent|emergency|help/i],
  priority: 'urgent',
};
```

### Context-Aware Detection

Enable smart detection to use conversation context:

```typescript
const layer = new TranslationLayer({
  enableSmartDetection: true,
});
```

### Custom Result Formatting

Customize how results are integrated:

```typescript
layer.setIntegrationStrategy('summary'); // or 'inline' or 'reference'
```

## Integration with MCP Servers

Works with any MCP-compatible server:

```typescript
mcpServerConfig: {
  serverPath: '/path/to/your/mcp-server',
  transport: 'stdio',
  args: ['--config', 'config.json'],
  env: { API_KEY: 'your-key' },
}
```

## Performance Considerations

- **Concurrent Tasks**: Limit with `maxConcurrentTasks` to avoid overwhelming the MCP server
- **Task Timeout**: Set appropriate timeouts for long-running operations
- **Buffer Size**: Adjust `streamBufferSize` based on conversation length
- **Smart Detection**: Has higher CPU usage; disable if not needed

## Error Handling

All errors are emitted as events:

```typescript
layer.onEvent((event) => {
  if (event.type === 'error') {
    console.error('Layer error:', event.error);
  }
  if (event.type === 'task_failed') {
    console.error('Task failed:', event.taskId, event.error);
  }
});
```

## Testing

```bash
npm test
```

## Contributing

Contributions welcome! Areas for improvement:

- Additional task detection algorithms
- More integration strategies
- Performance optimizations
- Additional MCP transport types
- Test coverage

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
