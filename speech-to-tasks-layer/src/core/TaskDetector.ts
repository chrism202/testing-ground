import { StreamMessage, Task, TaskPattern, ITaskDetector } from '../types';
import { generateId, extractActionVerbs, sanitizeText } from '../utils/helpers';

/**
 * Detects discrete tasks from continuous conversation streams
 */
export class TaskDetector implements ITaskDetector {
  private patterns: TaskPattern[] = [];
  private enableSmartDetection: boolean;

  constructor(enableSmartDetection: boolean = false) {
    this.enableSmartDetection = enableSmartDetection;
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default task detection patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: TaskPattern[] = [
      {
        name: 'web_search',
        intent: 'search_web',
        patterns: [
          /(?:search|look up|find|google)\s+(?:for\s+)?(.+?)(?:\.|$|,|\?)/i,
          /(?:what|who|where|when|why|how)\s+(?:is|are|was|were|does|do|did)\s+(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'medium',
      },
      {
        name: 'file_operation',
        intent: 'file_operation',
        patterns: [
          /(?:create|make|write|save)\s+(?:a\s+)?(?:file|document)\s+(?:called\s+|named\s+)?(.+?)(?:\.|$|,|\?)/i,
          /(?:open|read|show|display)\s+(?:the\s+)?(?:file|document)\s+(.+?)(?:\.|$|,|\?)/i,
          /(?:delete|remove)\s+(?:the\s+)?(?:file|document)\s+(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'high',
      },
      {
        name: 'calculation',
        intent: 'calculate',
        patterns: [
          /(?:calculate|compute|what\s+is)\s+(.+?)(?:\.|$|,|\?)/i,
          /(?:how much|how many)\s+(?:is|are)\s+(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'low',
      },
      {
        name: 'reminder_or_schedule',
        intent: 'reminder',
        patterns: [
          /(?:remind me|set (?:a\s+)?reminder)\s+(?:to\s+)?(.+?)(?:\.|$|,|\?)/i,
          /(?:schedule|set up|create)\s+(?:a\s+)?(?:meeting|event|appointment)\s+(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'high',
      },
      {
        name: 'data_retrieval',
        intent: 'get_data',
        patterns: [
          /(?:get|fetch|retrieve|show me)\s+(?:the\s+)?(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'medium',
      },
      {
        name: 'code_execution',
        intent: 'execute_code',
        patterns: [
          /(?:run|execute)\s+(?:the\s+)?(?:code|script|program)\s+(.+?)(?:\.|$|,|\?)/i,
          /(?:run|execute)\s+(.+?\.(?:py|js|sh|ts))(?:\.|$|,|\?)/i,
        ],
        priority: 'urgent',
      },
      {
        name: 'api_call',
        intent: 'api_request',
        patterns: [
          /(?:call|invoke|request)\s+(?:the\s+)?(?:API|endpoint)\s+(.+?)(?:\.|$|,|\?)/i,
          /(?:send|make)\s+(?:a\s+)?(?:GET|POST|PUT|DELETE)\s+(?:request\s+)?(?:to\s+)?(.+?)(?:\.|$|,|\?)/i,
        ],
        priority: 'medium',
      },
    ];

    defaultPatterns.forEach(pattern => this.addPattern(pattern));
  }

  /**
   * Add a custom task pattern
   */
  addPattern(pattern: TaskPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Detect tasks from a stream message
   */
  async detectTasks(message: StreamMessage, context?: string): Promise<Task[]> {
    const tasks: Task[] = [];
    const content = sanitizeText(message.content);

    // Pattern-based detection
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const matches = content.match(regex);
        if (matches) {
          const task = this.createTaskFromPattern(message, pattern, matches);
          tasks.push(task);
        }
      }
    }

    // Smart detection using action verbs and context
    if (this.enableSmartDetection) {
      const smartTasks = await this.smartDetection(message, context);
      tasks.push(...smartTasks);
    }

    // Deduplicate tasks
    return this.deduplicateTasks(tasks);
  }

  /**
   * Create a task from a matched pattern
   */
  private createTaskFromPattern(
    message: StreamMessage,
    pattern: TaskPattern,
    matches: RegExpMatchArray
  ): Task {
    const parameters: Record<string, unknown> = {
      query: matches[1]?.trim() || '',
      fullMatch: matches[0],
    };

    // Apply custom parameter extractors if defined
    if (pattern.parameterExtractors) {
      for (const [key, extractor] of Object.entries(pattern.parameterExtractors)) {
        parameters[key] = extractor(matches);
      }
    }

    return {
      id: generateId(),
      extractedFrom: message.id,
      timestamp: Date.now(),
      description: matches[0],
      intent: pattern.intent,
      parameters,
      priority: pattern.priority || 'medium',
      status: 'pending',
    };
  }

  /**
   * Smart detection using context and heuristics
   */
  private async smartDetection(
    message: StreamMessage,
    context?: string
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    const actionVerbs = extractActionVerbs(message.content);

    if (actionVerbs.length === 0) {
      return tasks;
    }

    // Detect implicit tasks based on action verbs and context
    for (const verb of actionVerbs) {
      const intent = this.mapVerbToIntent(verb);
      if (intent) {
        tasks.push({
          id: generateId(),
          extractedFrom: message.id,
          timestamp: Date.now(),
          description: message.content,
          intent,
          parameters: {
            verb,
            context: context || '',
            content: message.content,
          },
          priority: 'medium',
          status: 'pending',
        });
      }
    }

    return tasks;
  }

  /**
   * Map action verbs to intents
   */
  private mapVerbToIntent(verb: string): string | null {
    const verbMap: Record<string, string> = {
      search: 'search_web',
      find: 'search_web',
      look: 'search_web',
      get: 'get_data',
      fetch: 'get_data',
      retrieve: 'get_data',
      create: 'file_operation',
      make: 'file_operation',
      write: 'file_operation',
      calculate: 'calculate',
      compute: 'calculate',
      send: 'send_message',
      email: 'send_message',
      run: 'execute_code',
      open: 'file_operation',
      save: 'file_operation',
    };

    return verbMap[verb] || null;
  }

  /**
   * Deduplicate tasks based on similarity
   */
  private deduplicateTasks(tasks: Task[]): Task[] {
    const uniqueTasks: Task[] = [];
    const seen = new Set<string>();

    for (const task of tasks) {
      const key = `${task.intent}-${task.description.substring(0, 50)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTasks.push(task);
      }
    }

    return uniqueTasks;
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): TaskPattern[] {
    return [...this.patterns];
  }

  /**
   * Remove a pattern by name
   */
  removePattern(name: string): boolean {
    const initialLength = this.patterns.length;
    this.patterns = this.patterns.filter(p => p.name !== name);
    return this.patterns.length < initialLength;
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns = [];
  }
}
