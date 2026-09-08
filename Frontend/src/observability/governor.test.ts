import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceGovernor } from './governor';

describe('Vigil Phase 2: PerformanceGovernor & Adaptive Load Shedding', () => {
  let governor: PerformanceGovernor;

  beforeEach(() => {
    governor = PerformanceGovernor.getInstance();
    governor.reset();
  });

  it('starts in NORMAL state and allows all priorities', () => {
    expect(governor.getState()).toBe('NORMAL');
    expect(governor.shouldExecute('P0_CRITICAL')).toBe(true);
    expect(governor.shouldExecute('P1_PRIVACY')).toBe(true);
    expect(governor.shouldExecute('P2_CONTEXTUAL')).toBe(true);
    expect(governor.shouldExecute('P3_ENRICHMENT')).toBe(true);
    expect(governor.getRecommendedCoalesceWindowMs()).toBe(150);
  });

  it('steps down to PRESSURED when mutation rate exceeds 200/s', () => {
    // 250 mutations in 1000ms = 250/s
    const state = governor.reportCycle({
      mutationsInWindow: 250,
      windowDurationMs: 1000,
      scanDurationMs: 15.0,
    });

    expect(state).toBe('PRESSURED');
    expect(governor.shouldExecute('P0_CRITICAL')).toBe(true);
    expect(governor.shouldExecute('P1_PRIVACY')).toBe(true);
    expect(governor.shouldExecute('P2_CONTEXTUAL')).toBe(true);
    expect(governor.shouldExecute('P3_ENRICHMENT')).toBe(false); // P3 deferred
    expect(governor.getRecommendedCoalesceWindowMs()).toBe(250);
  });

  it('steps down to DEGRADED under severe mutation storm (> 500/s) or high latency', () => {
    // 600 mutations in 1000ms
    const state = governor.reportCycle({
      mutationsInWindow: 600,
      windowDurationMs: 1000,
      scanDurationMs: 45.0,
    });

    expect(state).toBe('DEGRADED');
    // In degraded mode, P0 and P1 are ALWAYS preserved
    expect(governor.shouldExecute('P0_CRITICAL')).toBe(true);
    expect(governor.shouldExecute('P1_PRIVACY')).toBe(true);
    // Lower priority contextual/enrichment tasks are shed
    expect(governor.shouldExecute('P2_CONTEXTUAL')).toBe(false);
    expect(governor.shouldExecute('P3_ENRICHMENT')).toBe(false);
    expect(governor.getRecommendedCoalesceWindowMs()).toBe(400);
  });

  it('gradually recovers from DEGRADED -> RECOVERING -> PRESSURED -> NORMAL', () => {
    // Force to DEGRADED
    governor.reportCycle({ mutationsInWindow: 1000, windowDurationMs: 1000, scanDurationMs: 50.0 });
    expect(governor.getState()).toBe('DEGRADED');

    // Cycle 1 under normal load
    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    expect(governor.getState()).toBe('RECOVERING');

    // Complete recovery cycles
    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    expect(governor.getState()).toBe('PRESSURED');

    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    governor.reportCycle({ mutationsInWindow: 10, windowDurationMs: 1000, scanDurationMs: 5.0 });
    expect(governor.getState()).toBe('NORMAL');
  });
});
