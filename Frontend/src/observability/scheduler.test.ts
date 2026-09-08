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
});
