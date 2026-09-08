import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, DEFAULT_BUDGETS } from './metrics';

describe('Vigil Phase 1: Observability & Performance Metrics', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = MetricsCollector.getInstance();
    collector.reset();
  });

  it('records counters accurately without external network side-effects', () => {
    collector.increment('observation_count', 5);
    collector.increment('evidence_node_count', 3);
    collector.increment('intervention_count', 1);

    const snapshot = collector.getSnapshot();
    expect(snapshot.observation_count).toBe(5);
    expect(snapshot.evidence_node_count).toBe(3);
    expect(snapshot.intervention_count).toBe(1);
    expect(snapshot.budget_violations.length).toBe(0);
  });

  it('measures timing and raises diagnostic signal when budget is exceeded', () => {
    // Record duration within budget
    collector.recordTiming('dom_scan_ms', 12.5);
    let snapshot = collector.getSnapshot();
    expect(snapshot.dom_scan_ms).toBe(12.5);
    expect(snapshot.budget_violations.length).toBe(0);

    // Record duration exceeding 30ms DOM scan budget
    collector.recordTiming('dom_scan_ms', 45.0);
    snapshot = collector.getSnapshot();
    expect(snapshot.dom_scan_ms).toBe(45.0);
    expect(snapshot.budget_violations.length).toBe(1);
    expect(snapshot.budget_violations[0]).toContain('DOM scan exceeded budget');
  });

  it('startTimer measures elapsed execution time', async () => {
    const stop = collector.startTimer('trust_engine_ms');
    await new Promise(r => setTimeout(r, 10));
    const duration = stop();

    expect(duration).toBeGreaterThanOrEqual(8);
    const snapshot = collector.getSnapshot();
    expect(snapshot.trust_engine_ms).toBeGreaterThanOrEqual(8);
  });
});
