/**
 * Utility helper functions
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize text for safe processing
 */
export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extract potential action verbs from text
 */
export function extractActionVerbs(text: string): string[] {
  const actionVerbs = [
    'search', 'find', 'look', 'get', 'fetch', 'retrieve',
    'create', 'make', 'build', 'generate', 'write',
    'update', 'modify', 'change', 'edit', 'alter',
    'delete', 'remove', 'erase', 'clear',
    'calculate', 'compute', 'analyze', 'process',
    'send', 'email', 'message', 'notify',
    'open', 'close', 'start', 'stop', 'run',
    'save', 'load', 'read', 'download', 'upload'
  ];

  const words = text.toLowerCase().split(/\s+/);
  return actionVerbs.filter(verb => words.includes(verb));
}

/**
 * Calculate text similarity (simple cosine similarity based on word overlap)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
