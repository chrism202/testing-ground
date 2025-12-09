import { EventEmitter } from 'events';
import {
  StreamMessage,
  Task,
  TranslationLayerConfig,
  TranslationLayerEvent,
  EventCallback,
} from '../types';
import { StreamParser } from './StreamParser';
import { TaskDetector } from './TaskDetector';
import { TaskQueue } from './TaskQueue';
import { MCPClient } from './MCPClient';
import { ResultIntegrator } from './ResultIntegrator';

/**
 * Main orchestrator for the Speech-to-Tasks Translation Layer
 * Bridges continuous speech-to-speech interaction with discrete task execution
 */
export class TranslationLayer extends EventEmitter {
  private streamParser: StreamParser;
  private taskDetector: TaskDetector;
  private taskQueue: TaskQueue;
  private mcpClient: MCPClient | null = null;
  private resultIntegrator: ResultIntegrator;
  private config: TranslationLayerConfig;
  private isInitialized: boolean = false;

  constructor(config: TranslationLayerConfig = {}) {
    super();
    this.config = this.mergeWithDefaults(config);

    this.streamParser = new StreamParser(this.config.streamBufferSize);
    this.taskDetector = new TaskDetector(this.config.enableSmartDetection);
    this.taskQueue = new TaskQueue(
      this.config.maxConcurrentTasks,
      this.config.taskTimeout
    );
    this.resultIntegrator = new ResultIntegrator(
      this.config.resultIntegrationStrategy
    );

    if (this.config.taskPatterns) {
      this.config.taskPatterns.forEach(pattern =>
        this.taskDetector.addPattern(pattern)
      );
    }

    this.setupEventHandlers();
  }

  /**
   * Merge user config with defaults
   */
  private mergeWithDefaults(config: TranslationLayerConfig): Required<TranslationLayerConfig> {
    return {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 3,
      taskTimeout: config.taskTimeout ?? 30000,
      streamBufferSize: config.streamBufferSize ?? 100,
      enableSmartDetection: config.enableSmartDetection ?? false,
      taskPatterns: config.taskPatterns ?? [],
      mcpServerConfig: config.mcpServerConfig ?? { transport: 'stdio' },
      resultIntegrationStrategy: config.resultIntegrationStrategy ?? 'inline',
    };
  }

  /**
   * Initialize the translation layer and connect to MCP server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.config.mcpServerConfig) {
        this.mcpClient = new MCPClient(this.config.mcpServerConfig);
        await this.mcpClient.connect();
        this.taskQueue.setMCPClient(this.mcpClient);
      }

      this.isInitialized = true;
      this.emitEvent({ type: 'stream_message', message: this.createSystemMessage('Translation layer initialized') });
    } catch (error) {
      this.emitEvent({ type: 'error', error: error as Error });
      throw error;
    }
  }

  /**
   * Process incoming stream message
   */
  async processMessage(input: string | StreamMessage): Promise<StreamMessage> {
    if (!this.isInitialized) {
      throw new Error('Translation layer not initialized. Call initialize() first.');
    }

    const message = this.streamParser.parse(input);
    this.emitEvent({ type: 'stream_message', message });

    const context = this.streamParser.extractContext();
    const tasks = await this.taskDetector.detectTasks(message, context);

    if (tasks.length > 0) {
      tasks.forEach(task => {
        this.emitEvent({ type: 'task_detected', task });
      });

      this.taskQueue.enqueueBatch(tasks);
    }

    return message;
  }

  /**
   * Setup event handlers for task queue
   */
  private setupEventHandlers(): void {
    this.taskQueue.on('task_started', (task: Task) => {
      this.emitEvent({ type: 'task_started', taskId: task.id });
    });

    this.taskQueue.on('task_completed', (task: Task) => {
      this.emitEvent({ type: 'task_completed', task });
      this.integrateResult(task);
    });

    this.taskQueue.on('task_failed', (task: Task) => {
      this.emitEvent({
        type: 'task_failed',
        taskId: task.id,
        error: task.error || new Error('Unknown error'),
      });
    });
  }

  /**
   * Integrate task result back into conversation stream
   */
  private integrateResult(task: Task): void {
    const context = this.streamParser.getHistory();
    const resultMessage = this.resultIntegrator.integrate(task, context);

    this.streamParser.parse(resultMessage);
    this.emitEvent({ type: 'result_integrated', taskId: task.id, message: resultMessage });
  }

  /**
   * Get conversation history
   */
  getHistory(limit?: number): StreamMessage[] {
    return this.streamParser.getHistory(limit);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.taskQueue.getTask(taskId);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return this.taskQueue.getTasksByStatus(status);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.taskQueue.getStats();
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    return this.taskQueue.cancelTask(taskId);
  }

  /**
   * Add a custom task pattern
   */
  addTaskPattern(pattern: any): void {
    this.taskDetector.addPattern(pattern);
  }

  /**
   * Set result integration strategy
   */
  setIntegrationStrategy(strategy: 'inline' | 'summary' | 'reference'): void {
    this.resultIntegrator.setStrategy(strategy);
  }

  /**
   * List available MCP tools
   */
  async listAvailableTools(): Promise<string[]> {
    if (!this.mcpClient) {
      return [];
    }
    return this.mcpClient.listTools();
  }

  /**
   * Shutdown the translation layer
   */
  async shutdown(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
    }

    this.taskQueue.clearAll();
    this.streamParser.clearHistory();
    this.isInitialized = false;

    this.emitEvent({ type: 'stream_message', message: this.createSystemMessage('Translation layer shutdown') });
  }

  /**
   * Create a system message
   */
  private createSystemMessage(content: string): StreamMessage {
    return this.streamParser.parse({
      id: `system-${Date.now()}`,
      timestamp: Date.now(),
      role: 'system',
      content,
    });
  }

  /**
   * Emit a typed event
   */
  private emitEvent(event: TranslationLayerEvent): void {
    this.emit('event', event);
    this.emit(event.type, event);
  }

  /**
   * Register an event callback
   */
  onEvent(callback: EventCallback): void {
    this.on('event', callback);
  }

  /**
   * Get current configuration
   */
  getConfig(): TranslationLayerConfig {
    return { ...this.config };
  }

  /**
   * Check if the layer is initialized
   */
  isReady(): boolean {
    return this.isInitialized && (this.mcpClient?.isConnected() ?? false);
  }
}
