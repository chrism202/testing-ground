/**
 * Core type definitions for the Speech-to-Tasks Translation Layer
 */

/**
 * Represents a message in the continuous conversation stream
 */
export interface StreamMessage {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a discrete task extracted from the stream
 */
export interface Task {
  id: string;
  extractedFrom: string; // Message ID
  timestamp: number;
  description: string;
  intent: string; // e.g., "search_web", "file_operation", "calculation"
  parameters: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: TaskResult;
  error?: Error;
}

/**
 * Result of a completed task
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  data: unknown;
  executionTime: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for task detection patterns
 */
export interface TaskPattern {
  name: string;
  intent: string;
  patterns: RegExp[];
  parameterExtractors?: Record<string, (match: RegExpMatchArray) => unknown>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Configuration for the translation layer
 */
export interface TranslationLayerConfig {
  maxConcurrentTasks?: number;
  taskTimeout?: number; // milliseconds
  streamBufferSize?: number;
  enableSmartDetection?: boolean; // Use LLM for task detection
  taskPatterns?: TaskPattern[];
  mcpServerConfig?: MCPServerConfig;
  resultIntegrationStrategy?: 'inline' | 'summary' | 'reference';
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  serverPath?: string;
  transport: 'stdio' | 'sse';
  env?: Record<string, string>;
  args?: string[];
}

/**
 * Event types emitted by the translation layer
 */
export type TranslationLayerEvent =
  | { type: 'stream_message'; message: StreamMessage }
  | { type: 'task_detected'; task: Task }
  | { type: 'task_started'; taskId: string }
  | { type: 'task_completed'; task: Task }
  | { type: 'task_failed'; taskId: string; error: Error }
  | { type: 'result_integrated'; taskId: string; message: StreamMessage }
  | { type: 'error'; error: Error };

/**
 * Callback for event handling
 */
export type EventCallback = (event: TranslationLayerEvent) => void | Promise<void>;

/**
 * Interface for stream parsers
 */
export interface IStreamParser {
  parse(input: string | StreamMessage): StreamMessage;
  extractContext(messages: StreamMessage[]): string;
}

/**
 * Interface for task detectors
 */
export interface ITaskDetector {
  detectTasks(message: StreamMessage, context?: string): Promise<Task[]>;
  addPattern(pattern: TaskPattern): void;
}

/**
 * Interface for MCP clients
 */
export interface IMCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeTask(task: Task): Promise<TaskResult>;
  listTools(): Promise<string[]>;
  isConnected(): boolean;
}

/**
 * Interface for result integrators
 */
export interface IResultIntegrator {
  integrate(task: Task, context: StreamMessage[]): StreamMessage;
  formatResult(result: TaskResult): string;
}
