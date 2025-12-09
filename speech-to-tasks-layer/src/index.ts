/**
 * Speech-to-Tasks Translation Layer
 *
 * A middleware system that bridges continuous speech-to-speech LLM interactions
 * with discrete task execution via Model Context Protocol (MCP) servers.
 */

export { TranslationLayer } from './core/TranslationLayer';
export { StreamParser } from './core/StreamParser';
export { TaskDetector } from './core/TaskDetector';
export { TaskQueue } from './core/TaskQueue';
export { MCPClient } from './core/MCPClient';
export { ResultIntegrator } from './core/ResultIntegrator';

export * from './types';

export {
  generateId,
  sleep,
  sanitizeText,
  extractActionVerbs,
  calculateSimilarity,
  debounce,
  formatDuration,
} from './utils/helpers';
