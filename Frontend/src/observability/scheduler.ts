/**
 * Vigil Priority Task Scheduler & Budget Gate
 *
 * Enforces execution time-slicing and priority dispatching:
 * - P0_CRITICAL:  Immediate synchronous execution (phishing, credentials, fast-lane alerts)
 * - P1_PRIVACY:   Microtask / next-tick batched execution (trackers, identifiers)
 * - P2_CONTEXTUAL: Time-sliced execution with hard per-cycle budget (dark patterns, CMP, urgency)
 * - P3_ENRICHMENT: Idle-time execution (deep shadow DOM, legal analysis, visual weights)
 *
 * Guarantees that heavy contextual or enrichment tasks NEVER block P0 security tasks
 * and NEVER freeze the browser's UI thread (> 30ms).
 */

export type TaskPriority = 
  | 'P0_CRITICAL' 
  | 'P1_PRIVACY' 
  | 'P2_CONTEXTUAL' 
  | 'P3_ENRICHMENT';

export interface ScheduledTask<T = unknown> {
  id: string;
  priority: TaskPriority;
  name: string;
  execute: () => T | Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  createdAt: number;
}

import { performanceGovernor } from './governor';

export class TaskScheduler {
  private static instance: TaskScheduler | null = null;

  private p0Queue: ScheduledTask<any>[] = [];
  private p1Queue: ScheduledTask<any>[] = [];
  private p2Queue: ScheduledTask<any>[] = [];
  private p3Queue: ScheduledTask<any>[] = [];

  private isFlushing = false;
  private maxCycleBudgetMs = 30.0;
  private maxP2Queue = 2000;
  private maxP3Queue = 1000;

  public totalShedTasks = 0;

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  public setCycleBudget(budgetMs: number): void {
    this.maxCycleBudgetMs = Math.max(5.0, budgetMs);
  }

  public getCycleBudget(): number {
    return this.maxCycleBudgetMs;
  }

  /**
   * Schedules a task with a specific priority.
   * Returns a promise that resolves when the task executes.
   */
  public schedule<T>(
    priority: TaskPriority,
    name: string,
    execute: () => T | Promise<T>
  ): Promise<T> {
    // P0 tasks run immediately without waiting for next cycle
    if (priority === 'P0_CRITICAL') {
      try {
        const result = execute();
        return Promise.resolve(result);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return new Promise<T>((resolve, reject) => {
      // Check governor gating for low priority tasks
      if (!performanceGovernor.shouldExecute(priority)) {
        this.totalShedTasks++;
        resolve({ shed: true, reason: 'GOVERNOR_SHED' } as any);
        return;
      }

      // Check queue bounds for P2 and P3
      if (priority === 'P2_CONTEXTUAL' && this.p2Queue.length >= this.maxP2Queue) {
        this.totalShedTasks++;
        resolve({ shed: true, reason: 'P2_QUEUE_CAPACITY' } as any);
        return;
      }

      if (priority === 'P3_ENRICHMENT' && this.p3Queue.length >= this.maxP3Queue) {
        this.totalShedTasks++;
        resolve({ shed: true, reason: 'P3_QUEUE_CAPACITY' } as any);
        return;
      }

      const task: ScheduledTask<T> = {
        id: `task-${crypto.randomUUID()}`,
        priority,
        name,
        execute,
        resolve,
        reject,
        createdAt: performance.now(),
      };

      if (priority === 'P1_PRIVACY') {
        this.p1Queue.push(task);
      } else if (priority === 'P2_CONTEXTUAL') {
        this.p2Queue.push(task);
      } else {
        this.p3Queue.push(task);
      }

      this.requestFlush();
    });
  }

  /**
   * Synchronously or asynchronously processes tasks within a strict time budget.
   * Yields to the browser when the budget is reached.
   */
  public async runWithBudget<T>(
    items: T[],
    processor: (item: T) => void,
    budgetMs: number = this.maxCycleBudgetMs
  ): Promise<{ processed: number; yielded: boolean }> {
    const startTime = performance.now();
    let processed = 0;
    let yielded = false;

    for (let i = 0; i < items.length; i++) {
      // Check budget before processing next item
      if (performance.now() - startTime >= budgetMs) {
        yielded = true;
        // Yield control back to host event loop
        await this.yieldControl();
      }

      processor(items[i]);
      processed++;
    }

    return { processed, yielded };
  }

  private requestFlush(): void {
    if (this.isFlushing) return;
    this.isFlushing = true;

    // Use queueMicrotask for P1, or requestIdleCallback / setTimeout for lower priority
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.flush());
    } else {
      setTimeout(() => this.flush(), 0);
    }
  }

  private async flush(): Promise<void> {
    const startTime = performance.now();

    try {
      // 1. Process all P1 tasks first
      while (this.p1Queue.length > 0) {
        const task = this.p1Queue.shift()!;
        try {
          const res = await task.execute();
          task.resolve(res);
        } catch (err) {
          task.reject(err);
        }
      }

      // 2. Process P2 tasks within budget
      while (this.p2Queue.length > 0) {
        if (performance.now() - startTime >= this.maxCycleBudgetMs) {
          // Budget reached: schedule next slice and yield
          setTimeout(() => this.requestFlush(), 0);
          return;
        }

        const task = this.p2Queue.shift()!;
        try {
          const res = await task.execute();
          task.resolve(res);
        } catch (err) {
          task.reject(err);
        }
      }

      // 3. Process P3 tasks only if budget remains
      while (this.p3Queue.length > 0) {
        if (performance.now() - startTime >= this.maxCycleBudgetMs) {
          // Defer P3 to idle callback
          this.scheduleIdle(() => this.requestFlush());
          return;
        }

        const task = this.p3Queue.shift()!;
        try {
          const res = await task.execute();
          task.resolve(res);
        } catch (err) {
          task.reject(err);
        }
      }
    } finally {
      this.isFlushing = false;
      if (this.p1Queue.length > 0 || this.p2Queue.length > 0 || this.p3Queue.length > 0) {
        this.requestFlush();
      }
    }
  }

  private yieldControl(): Promise<void> {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  private scheduleIdle(callback: () => void): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => callback(), { timeout: 1000 });
    } else {
      setTimeout(callback, 50);
    }
  }

  public getQueueDepths(): Record<TaskPriority, number> {
    return {
      P0_CRITICAL: this.p0Queue.length,
      P1_PRIVACY: this.p1Queue.length,
      P2_CONTEXTUAL: this.p2Queue.length,
      P3_ENRICHMENT: this.p3Queue.length,
    };
  }

  public clear(): void {
    this.p0Queue = [];
    this.p1Queue = [];
    this.p2Queue = [];
    this.p3Queue = [];
    this.isFlushing = false;
    this.totalShedTasks = 0;
  }
}

export const taskScheduler = TaskScheduler.getInstance();
