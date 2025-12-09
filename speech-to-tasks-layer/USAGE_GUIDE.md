# Usage Guide

## Getting Started

### Installation

```bash
npm install speech-to-tasks-layer
# or
yarn add speech-to-tasks-layer
```

### Basic Setup

```typescript
import { TranslationLayer } from 'speech-to-tasks-layer';

const layer = new TranslationLayer({
  mcpServerConfig: {
    serverPath: 'npx',
    transport: 'stdio',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
});

await layer.initialize();
```

## Common Use Cases

### 1. Voice Assistant Integration

```typescript
import { TranslationLayer } from 'speech-to-tasks-layer';

class VoiceAssistant {
  private layer: TranslationLayer;

  constructor() {
    this.layer = new TranslationLayer({
      enableSmartDetection: true,
      maxConcurrentTasks: 5,
      resultIntegrationStrategy: 'inline',
    });

    this.setupEventHandlers();
  }

  async initialize() {
    await this.layer.initialize();
  }

  async processVoiceInput(transcribedText: string) {
    await this.layer.processMessage({
      id: `voice-${Date.now()}`,
      timestamp: Date.now(),
      role: 'user',
      content: transcribedText,
    });
  }

  private setupEventHandlers() {
    this.layer.onEvent((event) => {
      if (event.type === 'result_integrated') {
        this.speakResponse(event.message.content);
      }
    });
  }

  private speakResponse(text: string) {
    // Implement text-to-speech
    console.log('Speaking:', text);
  }
}
```

### 2. Chatbot with Tool Integration

```typescript
import { TranslationLayer, TaskPattern } from 'speech-to-tasks-layer';

class Chatbot {
  private layer: TranslationLayer;
  private conversationId: string;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
    this.layer = new TranslationLayer({
      maxConcurrentTasks: 3,
      taskTimeout: 20000,
    });

    this.addCustomPatterns();
  }

  private addCustomPatterns() {
    // E-commerce specific patterns
    const patterns: TaskPattern[] = [
      {
        name: 'product_search',
        intent: 'search_products',
        patterns: [
          /(?:show|find|search for)\s+(?:me\s+)?(.+?)\s+(?:products?|items?)/i,
        ],
        priority: 'high',
      },
      {
        name: 'order_status',
        intent: 'check_order',
        patterns: [
          /(?:check|track|where is|status of)\s+(?:my\s+)?order\s+#?(.+?)(?:\.|$|\?)/i,
        ],
        priority: 'urgent',
      },
    ];

    patterns.forEach(p => this.layer.addTaskPattern(p));
  }

  async handleMessage(userMessage: string): Promise<string> {
    await this.layer.processMessage({
      id: `${this.conversationId}-${Date.now()}`,
      timestamp: Date.now(),
      role: 'user',
      content: userMessage,
    });

    // Wait for tasks to complete
    await this.waitForTasks();

    const history = this.layer.getHistory(2);
    const lastResponse = history.find(m => m.role === 'assistant');

    return lastResponse?.content || 'Processing...';
  }

  private async waitForTasks(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const stats = this.layer.getQueueStats();
        if (stats.pending === 0 && stats.inProgress === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }
}
```

### 3. Meeting Assistant

```typescript
import { TranslationLayer } from 'speech-to-tasks-layer';

class MeetingAssistant {
  private layer: TranslationLayer;
  private actionItems: Task[] = [];

  constructor() {
    this.layer = new TranslationLayer({
      enableSmartDetection: true,
      resultIntegrationStrategy: 'reference',
    });

    this.setupActionItemDetection();
  }

  private setupActionItemDetection() {
    this.layer.onEvent((event) => {
      if (event.type === 'task_detected') {
        if (this.isActionItem(event.task)) {
          this.actionItems.push(event.task);
        }
      }
    });
  }

  private isActionItem(task: Task): boolean {
    const actionItemIntents = [
      'reminder',
      'send_message',
      'file_operation',
      'create_calendar_event',
    ];
    return actionItemIntents.includes(task.intent);
  }

  async processMeetingTranscript(transcript: string) {
    const sentences = transcript.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (sentence.trim()) {
        await this.layer.processMessage({
          id: `meeting-${Date.now()}`,
          timestamp: Date.now(),
          role: 'user',
          content: sentence.trim(),
        });
      }
    }
  }

  getActionItems(): Task[] {
    return this.actionItems;
  }

  generateMeetingSummary(): string {
    const completed = this.actionItems.filter(t => t.status === 'completed');
    const pending = this.actionItems.filter(t => t.status === 'pending');

    return `
Meeting Summary:
- Total Action Items: ${this.actionItems.length}
- Completed: ${completed.length}
- Pending: ${pending.length}

Action Items:
${this.actionItems.map((item, i) =>
  `${i + 1}. [${item.status}] ${item.description}`
).join('\n')}
    `.trim();
  }
}
```

### 4. Smart Home Controller

```typescript
import { TranslationLayer, TaskPattern } from 'speech-to-tasks-layer';

class SmartHomeController {
  private layer: TranslationLayer;

  constructor() {
    this.layer = new TranslationLayer({
      maxConcurrentTasks: 10,
      taskTimeout: 5000,
      mcpServerConfig: {
        serverPath: './smart-home-mcp-server',
        transport: 'stdio',
      },
    });

    this.addSmartHomePatterns();
  }

  private addSmartHomePatterns() {
    const patterns: TaskPattern[] = [
      {
        name: 'light_control',
        intent: 'control_lights',
        patterns: [
          /(?:turn|switch)\s+(on|off)\s+(?:the\s+)?(.+?)\s+light/i,
          /(?:dim|brighten)\s+(?:the\s+)?(.+?)\s+light/i,
        ],
        priority: 'urgent',
        parameterExtractors: {
          action: (match) => match[1]?.toLowerCase(),
          device: (match) => match[2]?.trim(),
        },
      },
      {
        name: 'thermostat_control',
        intent: 'control_thermostat',
        patterns: [
          /set\s+(?:the\s+)?temperature\s+to\s+(\d+)/i,
          /make it\s+(warmer|cooler|hotter|colder)/i,
        ],
        priority: 'high',
      },
      {
        name: 'scene_activation',
        intent: 'activate_scene',
        patterns: [
          /(?:activate|set|start)\s+(.+?)\s+(?:scene|mode)/i,
        ],
        priority: 'urgent',
      },
    ];

    patterns.forEach(p => this.layer.addTaskPattern(p));
  }

  async processVoiceCommand(command: string): Promise<string> {
    await this.layer.processMessage({
      id: `smarthome-${Date.now()}`,
      timestamp: Date.now(),
      role: 'user',
      content: command,
    });

    // Wait briefly for execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    const history = this.layer.getHistory(2);
    const response = history.find(m => m.role === 'assistant');

    return response?.content || 'Command processed';
  }
}
```

## Advanced Configuration

### Custom Task Priority Logic

```typescript
import { TaskQueue, Task } from 'speech-to-tasks-layer';

class CustomTaskQueue extends TaskQueue {
  protected getNextTask(): Task | null {
    // Custom priority logic
    const urgentTasks = this.queue.filter(t => t.priority === 'urgent');

    if (urgentTasks.length > 0) {
      const task = urgentTasks[0];
      this.queue = this.queue.filter(t => t.id !== task.id);
      return task;
    }

    // Fall back to default behavior
    return super.getNextTask();
  }
}
```

### Custom Result Integration

```typescript
import { ResultIntegrator, Task, StreamMessage } from 'speech-to-tasks-layer';

class CustomResultIntegrator extends ResultIntegrator {
  integrate(task: Task, context: StreamMessage[]): StreamMessage {
    // Custom integration logic
    if (task.intent === 'search_web') {
      return this.createSearchResultMessage(task);
    }

    return super.integrate(task, context);
  }

  private createSearchResultMessage(task: Task): StreamMessage {
    const result = task.result?.data;

    return {
      id: generateId(),
      timestamp: Date.now(),
      role: 'assistant',
      content: `Here's what I found: ${JSON.stringify(result, null, 2)}`,
      metadata: {
        type: 'search_result',
        taskId: task.id,
      },
    };
  }
}
```

### Multiple MCP Servers

```typescript
class MultiMCPTranslationLayer {
  private layers: Map<string, TranslationLayer> = new Map();

  constructor() {
    // Search server
    this.layers.set('search', new TranslationLayer({
      mcpServerConfig: {
        serverPath: './search-mcp-server',
        transport: 'stdio',
      },
    }));

    // File server
    this.layers.set('files', new TranslationLayer({
      mcpServerConfig: {
        serverPath: './file-mcp-server',
        transport: 'stdio',
      },
    }));
  }

  async processMessage(message: string) {
    // Route to appropriate server based on intent
    const intent = this.detectIntent(message);

    if (intent === 'search_web') {
      return this.layers.get('search')!.processMessage(message);
    } else if (intent === 'file_operation') {
      return this.layers.get('files')!.processMessage(message);
    }
  }

  private detectIntent(message: string): string {
    // Simple intent detection
    if (message.match(/search|find|look up/i)) return 'search_web';
    if (message.match(/file|document|save|open/i)) return 'file_operation';
    return 'unknown';
  }
}
```

## Monitoring and Debugging

### Event Logging

```typescript
layer.onEvent((event) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: event.type,
    event,
  }, null, 2));
});
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = {
    totalMessages: 0,
    totalTasks: 0,
    avgExecutionTime: 0,
    tasksByIntent: new Map<string, number>(),
  };

  constructor(layer: TranslationLayer) {
    layer.onEvent((event) => {
      this.recordEvent(event);
    });
  }

  private recordEvent(event: TranslationLayerEvent) {
    if (event.type === 'stream_message') {
      this.metrics.totalMessages++;
    }

    if (event.type === 'task_detected') {
      this.metrics.totalTasks++;
      const count = this.metrics.tasksByIntent.get(event.task.intent) || 0;
      this.metrics.tasksByIntent.set(event.task.intent, count + 1);
    }

    if (event.type === 'task_completed') {
      const execTime = event.task.result?.executionTime || 0;
      this.metrics.avgExecutionTime =
        (this.metrics.avgExecutionTime + execTime) / 2;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

### Error Tracking

```typescript
class ErrorTracker {
  private errors: Array<{ timestamp: Date; error: Error; context: any }> = [];

  constructor(layer: TranslationLayer) {
    layer.onEvent((event) => {
      if (event.type === 'error' || event.type === 'task_failed') {
        this.trackError(event);
      }
    });
  }

  private trackError(event: any) {
    this.errors.push({
      timestamp: new Date(),
      error: event.error,
      context: event,
    });

    // Alert on critical errors
    if (this.errors.length > 10) {
      console.error('High error rate detected!');
    }
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }
}
```

## Best Practices

### 1. Always Initialize Before Use

```typescript
const layer = new TranslationLayer(config);
await layer.initialize(); // Don't forget this!
```

### 2. Handle Errors Gracefully

```typescript
layer.onEvent((event) => {
  if (event.type === 'error') {
    logger.error('Translation layer error', event.error);
    // Implement retry logic or fallback
  }
});
```

### 3. Clean Up Resources

```typescript
process.on('SIGINT', async () => {
  await layer.shutdown();
  process.exit(0);
});
```

### 4. Configure Timeouts Appropriately

```typescript
const layer = new TranslationLayer({
  taskTimeout: 30000, // 30 seconds for long-running tasks
});
```

### 5. Use Appropriate Integration Strategy

- **inline**: Natural conversation (default)
- **summary**: When you need metadata
- **reference**: When tracking task IDs is important

### 6. Monitor Queue Stats

```typescript
setInterval(() => {
  const stats = layer.getQueueStats();
  if (stats.pending > 10) {
    console.warn('High task backlog!');
  }
}, 5000);
```

## Troubleshooting

### Tasks Not Detected

1. Check pattern matching:
   ```typescript
   const patterns = layer.getTaskDetector().getPatterns();
   console.log('Registered patterns:', patterns);
   ```

2. Enable smart detection:
   ```typescript
   const layer = new TranslationLayer({
     enableSmartDetection: true,
   });
   ```

### Tasks Timing Out

1. Increase timeout:
   ```typescript
   const layer = new TranslationLayer({
     taskTimeout: 60000, // 60 seconds
   });
   ```

2. Check MCP server logs

### Results Not Integrated

1. Check event emissions:
   ```typescript
   layer.onEvent((event) => {
     console.log('Event:', event.type);
   });
   ```

2. Verify task completion:
   ```typescript
   const completed = layer.getTasksByStatus('completed');
   console.log('Completed tasks:', completed);
   ```

## Next Steps

- Explore the `/src/examples` directory for more examples
- Read `ARCHITECTURE.md` for deep technical details
- Check out the MCP documentation for creating custom servers
- Join the community for support and updates
