import { Task, TaskResult, IMCPClient } from '../types';
import { EventEmitter } from 'events';

/**
 * Manages task queue and dispatches tasks to MCP client
 */
export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private inProgress: Map<string, Task> = new Map();
  private completed: Map<string, Task> = new Map();
  private maxConcurrent: number;
  private taskTimeout: number;
  private mcpClient: IMCPClient | null = null;

  constructor(maxConcurrent: number = 3, taskTimeout: number = 30000) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.taskTimeout = taskTimeout;
  }

  /**
   * Set the MCP client for task execution
   */
  setMCPClient(client: IMCPClient): void {
    this.mcpClient = client;
  }

  /**
   * Add a task to the queue
   */
  enqueue(task: Task): void {
    this.queue.push(task);
    this.emit('task_queued', task);
    this.processQueue();
  }

  /**
   * Add multiple tasks to the queue
   */
  enqueueBatch(tasks: Task[]): void {
    this.queue.push(...tasks);
    tasks.forEach(task => this.emit('task_queued', task));
    this.processQueue();
  }

  /**
   * Process the queue and execute tasks
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.inProgress.size < this.maxConcurrent) {
      const task = this.getNextTask();
      if (task) {
        await this.executeTask(task);
      }
    }
  }

  /**
   * Get the next task based on priority
   */
  private getNextTask(): Task | null {
    if (this.queue.length === 0) return null;

    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.timestamp - b.timestamp; // FIFO for same priority
    });

    return this.queue.shift() || null;
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task): Promise<void> {
    if (!this.mcpClient) {
      task.status = 'failed';
      task.error = new Error('MCP client not configured');
      this.emit('task_failed', task);
      return;
    }

    task.status = 'in_progress';
    this.inProgress.set(task.id, task);
    this.emit('task_started', task);

    try {
      const result = await this.executeWithTimeout(task);
      task.result = result;
      task.status = 'completed';
      this.inProgress.delete(task.id);
      this.completed.set(task.id, task);
      this.emit('task_completed', task);
    } catch (error) {
      task.status = 'failed';
      task.error = error as Error;
      this.inProgress.delete(task.id);
      this.emit('task_failed', task);
    }

    this.processQueue();
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout(task: Task): Promise<TaskResult> {
    return Promise.race([
      this.mcpClient!.executeTask(task),
      new Promise<TaskResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task ${task.id} timed out after ${this.taskTimeout}ms`)),
          this.taskTimeout
        )
      ),
    ]);
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const [task] = this.queue.splice(queueIndex, 1);
      task.status = 'failed';
      task.error = new Error('Task cancelled');
      this.emit('task_cancelled', task);
      return true;
    }

    const inProgressTask = this.inProgress.get(taskId);
    if (inProgressTask) {
      inProgressTask.status = 'failed';
      inProgressTask.error = new Error('Task cancelled');
      this.inProgress.delete(taskId);
      this.emit('task_cancelled', inProgressTask);
      return true;
    }

    return false;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return (
      this.queue.find(t => t.id === taskId) ||
      this.inProgress.get(taskId) ||
      this.completed.get(taskId)
    );
  }

  /**
   * Get all tasks with a specific status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    const tasks: Task[] = [];

    if (status === 'pending') {
      tasks.push(...this.queue);
    } else if (status === 'in_progress') {
      tasks.push(...Array.from(this.inProgress.values()));
    } else if (status === 'completed') {
      tasks.push(...Array.from(this.completed.values()));
    }

    return tasks;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  } {
    const completedTasks = Array.from(this.completed.values());
    const failed = completedTasks.filter(t => t.status === 'failed').length;

    return {
      pending: this.queue.length,
      inProgress: this.inProgress.size,
      completed: this.completed.size - failed,
      failed,
    };
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    this.completed.clear();
    this.emit('completed_cleared');
  }

  /**
   * Clear all tasks
   */
  clearAll(): void {
    this.queue = [];
    this.inProgress.clear();
    this.completed.clear();
    this.emit('all_cleared');
  }

  /**
   * Get the number of tasks in the queue
   */
  size(): number {
    return this.queue.length + this.inProgress.size;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }
}
