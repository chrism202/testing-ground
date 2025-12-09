import { StreamMessage, Task, TaskResult, IResultIntegrator } from '../types';
import { generateId, formatDuration } from '../utils/helpers';

/**
 * Strategy for integrating task results back into the conversation
 */
type IntegrationStrategy = 'inline' | 'summary' | 'reference';

/**
 * Integrates task results back into the continuous conversation stream
 */
export class ResultIntegrator implements IResultIntegrator {
  private strategy: IntegrationStrategy;

  constructor(strategy: IntegrationStrategy = 'inline') {
    this.strategy = strategy;
  }

  /**
   * Integrate a completed task result into the conversation
   */
  integrate(task: Task, context: StreamMessage[]): StreamMessage {
    if (!task.result) {
      throw new Error('Task has no result to integrate');
    }

    const formattedResult = this.formatResult(task.result);
    let content: string;

    switch (this.strategy) {
      case 'inline':
        content = this.createInlineIntegration(task, formattedResult, context);
        break;
      case 'summary':
        content = this.createSummaryIntegration(task, formattedResult);
        break;
      case 'reference':
        content = this.createReferenceIntegration(task, formattedResult);
        break;
      default:
        content = formattedResult;
    }

    return {
      id: generateId(),
      timestamp: Date.now(),
      role: 'assistant',
      content,
      metadata: {
        type: 'task_result',
        taskId: task.id,
        intent: task.intent,
        executionTime: task.result.executionTime,
      },
    };
  }

  /**
   * Format task result for presentation
   */
  formatResult(result: TaskResult): string {
    if (!result.success) {
      return `Task failed: ${JSON.stringify(result.data)}`;
    }

    if (typeof result.data === 'string') {
      return result.data;
    }

    if (Array.isArray(result.data)) {
      return this.formatArrayData(result.data);
    }

    if (typeof result.data === 'object' && result.data !== null) {
      return this.formatObjectData(result.data);
    }

    return String(result.data);
  }

  /**
   * Create inline integration (natural conversation flow)
   */
  private createInlineIntegration(
    task: Task,
    formattedResult: string,
    context: StreamMessage[]
  ): string {
    const contextHint = this.extractContextHint(task, context);

    if (task.result?.success) {
      return `${contextHint}${formattedResult}`;
    } else {
      return `I tried to ${task.description.toLowerCase()}, but encountered an issue: ${formattedResult}`;
    }
  }

  /**
   * Create summary integration (brief summary with details available)
   */
  private createSummaryIntegration(task: Task, formattedResult: string): string {
    const duration = formatDuration(task.result!.executionTime);

    if (task.result?.success) {
      return `[Task completed in ${duration}] ${this.createBriefSummary(formattedResult)}`;
    } else {
      return `[Task failed after ${duration}] ${formattedResult}`;
    }
  }

  /**
   * Create reference integration (reference to task with ID)
   */
  private createReferenceIntegration(task: Task, formattedResult: string): string {
    const status = task.result?.success ? 'completed' : 'failed';
    return `[Task ${task.id.substring(0, 8)} ${status}] ${formattedResult}`;
  }

  /**
   * Extract context hint from conversation history
   */
  private extractContextHint(task: Task, context: StreamMessage[]): string {
    const originalMessage = context.find(msg => msg.id === task.extractedFrom);

    if (!originalMessage) {
      return '';
    }

    if (task.intent === 'search_web') {
      return 'I found this information: ';
    } else if (task.intent === 'calculate') {
      return 'The calculation result is: ';
    } else if (task.intent === 'file_operation') {
      return 'File operation completed. ';
    }

    return '';
  }

  /**
   * Create a brief summary of the result
   */
  private createBriefSummary(result: string): string {
    if (result.length <= 100) {
      return result;
    }

    return result.substring(0, 97) + '...';
  }

  /**
   * Format array data
   */
  private formatArrayData(data: any[]): string {
    if (data.length === 0) {
      return 'No results found.';
    }

    if (data.length === 1) {
      return this.formatObjectData(data[0]);
    }

    return data
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${this.formatObjectData(item)}`)
      .join('\n') + (data.length > 5 ? `\n... and ${data.length - 5} more` : '');
  }

  /**
   * Format object data
   */
  private formatObjectData(data: any): string {
    if (data.content && Array.isArray(data.content)) {
      return data.content.map((item: any) => {
        if (item.type === 'text' && item.text) {
          return item.text;
        }
        return JSON.stringify(item);
      }).join('\n');
    }

    if (data.text) {
      return data.text;
    }

    if (data.value !== undefined) {
      return String(data.value);
    }

    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * Set integration strategy
   */
  setStrategy(strategy: IntegrationStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current integration strategy
   */
  getStrategy(): IntegrationStrategy {
    return this.strategy;
  }

  /**
   * Create a natural language description of the task result
   */
  createNaturalDescription(task: Task): string {
    if (!task.result) {
      return `Task "${task.description}" is still pending.`;
    }

    const duration = formatDuration(task.result.executionTime);

    if (task.result.success) {
      return `I successfully completed the task "${task.description}" in ${duration}.`;
    } else {
      return `I attempted to complete "${task.description}" but it failed after ${duration}.`;
    }
  }
}
