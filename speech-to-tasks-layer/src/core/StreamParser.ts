import { StreamMessage, IStreamParser } from '../types';
import { generateId } from '../utils/helpers';

/**
 * Parses continuous conversation streams and maintains context
 */
export class StreamParser implements IStreamParser {
  private messageHistory: StreamMessage[] = [];
  private bufferSize: number;

  constructor(bufferSize: number = 100) {
    this.bufferSize = bufferSize;
  }

  /**
   * Parse incoming input into a structured StreamMessage
   */
  parse(input: string | StreamMessage): StreamMessage {
    let message: StreamMessage;

    if (typeof input === 'string') {
      message = {
        id: generateId(),
        timestamp: Date.now(),
        role: 'user', // Default assumption
        content: input,
      };
    } else {
      message = input;
    }

    this.addToHistory(message);
    return message;
  }

  /**
   * Extract contextual information from recent messages
   */
  extractContext(messages?: StreamMessage[]): string {
    const messagesToAnalyze = messages || this.messageHistory;
    const recentMessages = messagesToAnalyze.slice(-10); // Last 10 messages

    return recentMessages
      .map(msg => `[${msg.role}]: ${msg.content}`)
      .join('\n');
  }

  /**
   * Get recent message history
   */
  getHistory(limit?: number): StreamMessage[] {
    if (limit) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Find a message by ID
   */
  findMessage(messageId: string): StreamMessage | undefined {
    return this.messageHistory.find(msg => msg.id === messageId);
  }

  /**
   * Add message to history with buffer management
   */
  private addToHistory(message: StreamMessage): void {
    this.messageHistory.push(message);

    // Maintain buffer size
    if (this.messageHistory.length > this.bufferSize) {
      this.messageHistory = this.messageHistory.slice(-this.bufferSize);
    }
  }

  /**
   * Get messages within a time window
   */
  getMessagesByTimeWindow(startTime: number, endTime: number): StreamMessage[] {
    return this.messageHistory.filter(
      msg => msg.timestamp >= startTime && msg.timestamp <= endTime
    );
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: 'user' | 'assistant' | 'system'): StreamMessage[] {
    return this.messageHistory.filter(msg => msg.role === role);
  }
}
