# Architecture Deep Dive

## Problem Statement

Speech-to-speech LLMs provide continuous, real-time interaction with users. However, many useful capabilities (web search, file operations, API calls, etc.) require discrete, asynchronous task execution. There's a fundamental impedance mismatch:

- **Continuous Stream**: Speech flows in real-time, context is implicit, interruptions are natural
- **Discrete Tasks**: Tools have explicit inputs/outputs, take variable time, may fail

This translation layer bridges these two paradigms.

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:

- **StreamParser**: Message structure and history
- **TaskDetector**: Identifying actionable items
- **TaskQueue**: Task lifecycle and execution management
- **MCPClient**: Tool invocation
- **ResultIntegrator**: Conversation continuity

### 2. Asynchronous by Default

Tasks execute asynchronously without blocking the conversation stream. The user can continue talking while tasks are being processed.

### 3. Priority-Based Execution

Not all tasks are equal. The system respects priority levels:

```
urgent > high > medium > low
```

Within the same priority, FIFO ordering is maintained.

### 4. Graceful Degradation

When tasks fail, the conversation continues. Failed tasks are logged and reported without breaking the flow.

### 5. Extensibility

Custom task patterns can be added without modifying core code. The system is designed for extension:

```typescript
layer.addTaskPattern({
  name: 'custom_intent',
  intent: 'my_tool',
  patterns: [/your pattern here/],
  priority: 'medium',
});
```

## Data Flow

### 1. Message Ingestion

```
User Speech → Speech-to-Text → TranslationLayer.processMessage()
```

The `StreamParser` converts raw input into structured `StreamMessage` objects:

```typescript
interface StreamMessage {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}
```

### 2. Task Detection

The `TaskDetector` analyzes each message using:

1. **Pattern Matching**: Regex patterns match common task structures
2. **Action Verb Extraction**: Identifies imperative verbs (search, create, send, etc.)
3. **Context Analysis**: Uses conversation history to disambiguate

Example detection:

```
Input: "Search for the weather in Tokyo and remind me to pack an umbrella"

Detected Tasks:
1. Task {
     intent: 'search_web',
     parameters: { query: 'weather in Tokyo' },
     priority: 'medium'
   }
2. Task {
     intent: 'reminder',
     parameters: { text: 'pack an umbrella' },
     priority: 'high'
   }
```

### 3. Task Queuing

Tasks are added to the `TaskQueue` which:

1. Sorts by priority (then timestamp)
2. Maintains concurrency limit
3. Assigns tasks to available execution slots

```
Queue State:
├─ pending: [task3, task4, task5]
├─ in_progress: [task1, task2]  (max: 3)
└─ completed: [task0]
```

### 4. Task Execution

The `MCPClient` maps task intents to MCP tools:

```typescript
Intent Mapping:
search_web    → web_search tool
file_operation → file_manager tool
calculate     → calculator tool
...
```

Execution includes:
- Parameter validation
- Timeout enforcement
- Error handling
- Result capture

### 5. Result Integration

The `ResultIntegrator` converts tool outputs into natural language:

```
Tool Result:
{
  success: true,
  data: { temperature: 72, condition: 'sunny' }
}

Integrated Message (inline strategy):
"I found this information: The weather in Tokyo is sunny with a temperature of 72°F."
```

This message is added to the conversation stream, maintaining continuity.

## Concurrency Model

### Task Execution Flow

```
processMessage() [Non-blocking]
    ↓
detectTasks() [Synchronous analysis]
    ↓
enqueue() [Non-blocking]
    ↓
executeTask() [Async, up to maxConcurrent parallel]
    ↓
integrateResult() [Non-blocking]
```

Multiple tasks can execute concurrently, limited by `maxConcurrentTasks`.

### Race Conditions

The system handles several race conditions:

1. **Message ordering**: Messages maintain timestamp ordering in history
2. **Task completion**: Results are integrated in completion order (not detection order)
3. **Cancellation**: In-flight tasks can be cancelled safely

## State Management

### Conversation State

```
StreamParser maintains:
- messageHistory: StreamMessage[]  (circular buffer)
- bufferSize: number (configurable)
```

### Task State

```
TaskQueue maintains:
- queue: Task[] (pending)
- inProgress: Map<string, Task>
- completed: Map<string, Task>
```

### Connection State

```
MCPClient maintains:
- connected: boolean
- availableTools: Map<string, ToolSchema>
```

## Pattern Detection Algorithm

### Pattern Matching

```
For each message:
  For each registered pattern:
    For each regex in pattern:
      If match found:
        Create task with extracted parameters
        Add to candidates
  Deduplicate candidates
  Return unique tasks
```

### Smart Detection (Optional)

```
1. Extract action verbs from message
2. Map verbs to intents
3. Create tasks with full message context
4. Deduplicate with pattern-based tasks
```

## Integration Strategies

### Inline Strategy (Default)

Results are woven naturally into conversation:

```
User: "What's the weather in Tokyo?"
[Task: search_web executes]
Assistant: "I found this information: The weather in Tokyo is sunny, 72°F."
```

### Summary Strategy

Results include metadata:

```
User: "What's the weather in Tokyo?"
[Task: search_web executes]
Assistant: "[Task completed in 1.2s] Weather: sunny, 72°F"
```

### Reference Strategy

Results include task IDs for tracking:

```
User: "What's the weather in Tokyo?"
[Task: search_web executes]
Assistant: "[Task a3f4b2c1 completed] Weather: sunny, 72°F"
```

## Error Handling

### Timeout Handling

```typescript
executeWithTimeout(task):
  return Promise.race([
    mcpClient.executeTask(task),
    timeout(taskTimeout)
  ])
```

Tasks exceeding `taskTimeout` are failed automatically.

### Connection Failures

If MCP connection drops:
1. Tasks fail with connection error
2. Error events emitted
3. Layer remains operational (can reconnect)

### Task Failures

Failed tasks:
1. Marked as 'failed' status
2. Error stored in task.error
3. Event emitted: { type: 'task_failed', taskId, error }
4. Conversation continues

## Event System

All components emit events through the central `TranslationLayer`:

```
Component Event → TranslationLayer.emitEvent() → Registered Callbacks
```

Events are typed:

```typescript
type TranslationLayerEvent =
  | { type: 'stream_message'; message: StreamMessage }
  | { type: 'task_detected'; task: Task }
  | { type: 'task_started'; taskId: string }
  | { type: 'task_completed'; task: Task }
  | { type: 'task_failed'; taskId: string; error: Error }
  | { type: 'result_integrated'; taskId: string; message: StreamMessage }
  | { type: 'error'; error: Error };
```

## Performance Characteristics

### Time Complexity

- Message processing: O(n*m) where n=patterns, m=regexes per pattern
- Task detection: O(1) to O(n) depending on smart detection
- Task queuing: O(n log n) for priority sorting
- History lookup: O(n) where n=history size

### Space Complexity

- Message history: O(bufferSize)
- Task storage: O(pending + inProgress + completed)
- Tool cache: O(number of tools)

### Bottlenecks

1. **Pattern matching**: More patterns = slower detection
2. **MCP communication**: Network/IPC latency
3. **Result integration**: Formatting overhead

## Scaling Considerations

### Horizontal Scaling

To handle multiple conversations:

```typescript
const layers = new Map<string, TranslationLayer>();

function getLayerForUser(userId: string): TranslationLayer {
  if (!layers.has(userId)) {
    layers.set(userId, new TranslationLayer(config));
  }
  return layers.get(userId)!;
}
```

### Vertical Scaling

For high-throughput single conversations:

```typescript
const config = {
  maxConcurrentTasks: 10,  // Increase parallelism
  streamBufferSize: 1000,  // Larger history
  taskTimeout: 60000,      // Allow longer tasks
};
```

### MCP Server Pooling

For heavy task loads, pool MCP connections:

```typescript
class MCPClientPool {
  private clients: MCPClient[] = [];

  async getClient(): Promise<MCPClient> {
    // Round-robin or least-busy selection
  }
}
```

## Security Considerations

### Input Validation

- Sanitize message content before pattern matching
- Validate task parameters before MCP execution
- Escape special characters in regex patterns

### Access Control

```typescript
const layer = new TranslationLayer({
  mcpServerConfig: {
    serverPath: '/trusted/path/only',
    env: { API_KEY: process.env.API_KEY },
  },
});
```

### Rate Limiting

Implement task rate limiting:

```typescript
class RateLimitedQueue extends TaskQueue {
  private rateLimiter = new RateLimiter(10, 1000); // 10 tasks per second

  async executeTask(task: Task) {
    await this.rateLimiter.acquire();
    return super.executeTask(task);
  }
}
```

## Testing Strategy

### Unit Tests

- StreamParser: Message parsing, history management
- TaskDetector: Pattern matching, deduplication
- TaskQueue: Priority ordering, concurrency limits
- ResultIntegrator: Format strategies

### Integration Tests

- End-to-end message flow
- MCP client communication
- Event emission

### Performance Tests

- High message throughput
- Concurrent task execution
- Memory usage under load

## Future Enhancements

### 1. LLM-Powered Detection

Use an LLM to detect tasks more intelligently:

```typescript
const layer = new TranslationLayer({
  taskDetector: new LLMTaskDetector({
    model: 'claude-3-haiku',
    systemPrompt: 'Extract actionable tasks...',
  }),
});
```

### 2. Task Dependencies

Support task chains:

```typescript
task2.dependsOn = [task1.id];
// task2 only executes after task1 completes
```

### 3. Streaming Results

Stream partial results as they become available:

```typescript
layer.onEvent((event) => {
  if (event.type === 'task_progress') {
    console.log('Progress:', event.progress);
  }
});
```

### 4. Multi-MCP Support

Connect to multiple MCP servers simultaneously:

```typescript
const layer = new TranslationLayer({
  mcpServers: [
    { name: 'search', serverPath: './search-server' },
    { name: 'files', serverPath: './file-server' },
  ],
});
```

## Conclusion

This architecture provides a robust, extensible bridge between continuous conversation and discrete task execution. By separating concerns, handling asynchrony gracefully, and providing multiple extension points, it enables sophisticated conversational AI systems to leverage powerful tool ecosystems.
