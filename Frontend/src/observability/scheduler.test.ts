import { describe, it, expect, beforeEach } from 'vitest';
import { TaskScheduler } from './scheduler';

describe('Vigil Phase 2: Priority Task Scheduler & Budget Enforcement', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = TaskScheduler.getInstance();
    scheduler.clear();
    scheduler.setCycleBudget(30.0);
  });

  it('executes P0_CRITICAL tasks immediately and synchronously', async () => {
    let executed = false;
    const promise = scheduler.schedule('P0_CRITICAL', 'credential-harvest-alert', () => {
      executed = true;
      return 'fast-lane-alert';
    });

    expect(executed).toBe(true);
    const result = await promise;
    expect(result).toBe('fast-lane-alert');
  });

  it('prioritizes P1_PRIVACY tasks ahead of P2_CONTEXTUAL and P3_ENRICHMENT', async () => {
    const executionOrder: string[] = [];

    const p3 = scheduler.schedule('P3_ENRICHMENT', 'legal-deep-audit', () => {
      executionOrder.push('P3');
    });

    const p2 = scheduler.schedule('P2_CONTEXTUAL', 'dark-pattern-scan', () => {
      executionOrder.push('P2');
    });

    const p1 = scheduler.schedule('P1_PRIVACY', 'tracker-telemetry', () => {
      executionOrder.push('P1');
    });

    await Promise.all([p1, p2, p3]);

    expect(executionOrder[0]).toBe('P1');
    expect(executionOrder[1]).toBe('P2');
    expect(executionOrder[2]).toBe('P3');
  });

  it('runWithBudget processes items and yields when budget is reached', async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    let processedCount = 0;

    // Run with very tight 2ms budget to force yielding
    const { processed, yielded } = await scheduler.runWithBudget(
      items,
      () => {
        processedCount++;
        // Burn a tiny amount of cpu
        const start = performance.now();
        while (performance.now() - start < 0.5) {}
      },
      2.0
    );

    expect(processed).toBe(50);
    expect(processedCount).toBe(50);
    expect(yielded).toBe(true);
  });

  it('guarantees zero starvation of P0/P1 during a 111,100 task adversarial storm', async () => {
    let p0Executed = 0;
    let p1Executed = 0;
    let p2Executed = 0;
    let p3Executed = 0;

    const promises: Promise<any>[] = [];

    // 1. Dispatch 100,000 P3 tasks (lightweight counters)
    for (let i = 0; i < 100000; i++) {
      promises.push(scheduler.schedule('P3_ENRICHMENT', 'p3-task', () => { p3Executed++; }));
    }

    // 2. Dispatch 10,000 P2 tasks
    for (let i = 0; i < 10000; i++) {
      promises.push(scheduler.schedule('P2_CONTEXTUAL', 'p2-task', () => { p2Executed++; }));
    }

    // 3. Dispatch 1,000 P1 tasks
    for (let i = 0; i < 1000; i++) {
      promises.push(scheduler.schedule('P1_PRIVACY', 'p1-task', () => { p1Executed++; }));
    }

    // 4. Dispatch 100 P0 tasks
    for (let i = 0; i < 100; i++) {
      promises.push(scheduler.schedule('P0_CRITICAL', 'p0-task', () => { p0Executed++; }));
    }

    // P0 tasks must be executed synchronously immediately
    expect(p0Executed).toBe(100);

    // Wait for microtasks and flush
    await Promise.all(promises);

    // P1 tasks must be 100% executed without starvation
    expect(p1Executed).toBe(1000);

    // P2 and P3 must have shed excess to preserve thread safety and memory
    expect(scheduler.totalShedTasks).toBeGreaterThan(0);
    expect(scheduler.totalShedTasks).toBe(
      (100000 - 1000) + // P3 shed above 1000 cap
      (10000 - 2000)    // P2 shed above 2000 cap
    );
  });

  it('bounds P0 and P1 latency under continuous low-priority task arrivals', async () => {
    let stopContinuousP3 = false;
    let p3Count = 0;

    // Simulate continuous flood of P3 tasks
    const pumpP3 = () => {
      if (stopContinuousP3) return;
      for (let i = 0; i < 50; i++) {
        scheduler.schedule('P3_ENRICHMENT', 'bg-noise', () => { p3Count++; });
      }
      setTimeout(pumpP3, 1);
    };
    pumpP3();

    // Measure latency for P0
    const startP0 = performance.now();
    let p0Run = false;
    await scheduler.schedule('P0_CRITICAL', 'urgent-sec', () => { p0Run = true; });
    const p0Latency = performance.now() - startP0;

    expect(p0Run).toBe(true);
    expect(p0Latency).toBeLessThanOrEqual(5.0); // Synchronous execution, <= 5ms

    // Measure latency for P1
    const startP1 = performance.now();
    let p1Run = false;
    await scheduler.schedule('P1_PRIVACY', 'consent-eval', () => { p1Run = true; });
    const p1Latency = performance.now() - startP1;

    expect(p1Run).toBe(true);
    expect(p1Latency).toBeLessThanOrEqual(25.0); // Microtask/next-tick execution, <= 25ms

    stopContinuousP3 = true;
  });
});
