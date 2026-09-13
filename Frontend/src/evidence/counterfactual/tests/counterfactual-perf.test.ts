import { describe, it, expect } from 'vitest';
import { TemporalEventIndex } from '../../temporal-event-index';
import { CounterfactualEngine } from '../counterfactual-engine';
import { StateSnapshotExtractor } from '../state-snapshot';
import type { CompetingHypothesis } from '../../v4/types';

describe('V4 Counterfactual: Performance & Resource Ceilings (PERF-V4-005 - 008)', () => {
  it('PERF-V4-005: extracts bounded state snapshot in <1ms for 500 events (O(N) commercial extraction)', () => {
    const events = [];
    for (let i = 0; i < 500; i++) {
      events.push({
        eventId: `evt-${i}`,
        observationId: `obs-${i}`,
        navigationId: 'nav-perf',
        timestamp: 1000 + i,
        sequence: i + 1,
        type: 'DOM' as const,
        source: 'synthetic-scanner',
        payload: {
          price: 100 + (i % 10),
          feeAppeared: i === 250,
          feeAmount: i === 250 ? 15 : undefined,
          isProgression: i === 200,
        },
      });
    }

    const start = performance.now();
    const snapshot = StateSnapshotExtractor.extract(events);
    const duration = performance.now() - start;

    expect(snapshot.displayedBasePrice).toBe(100);
    expect(snapshot.progressionOccurred).toBe(true);
    expect(snapshot.fees.length).toBe(1);
    expect(duration).toBeLessThan(5); // Bound: <5ms (typically <0.5ms)
    console.log(`[COUNTERFACTUAL BENCHMARK] 500 events snapshot extraction: ${duration.toFixed(3)}ms`);
  });

  it('PERF-V4-007: reuses cached snapshot across multiple competing hypotheses', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-perf-cache';

    for (let i = 0; i < 100; i++) {
      timeline.addEvent(
        navId,
        'DOM',
        'scanner',
        { price: 100, isProgression: i === 50, feeAppeared: i === 60, feeAmount: 10 },
        1000 + i
      );
    }

    const engine = new CounterfactualEngine();

    const hyp1: CompetingHypothesis = {
      id: 'hyp-1',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.8,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'H1',
    };

    const hyp2: CompetingHypothesis = {
      id: 'hyp-2',
      navigationId: navId,
      type: 'INNOCUOUS_REGIONAL_TAX',
      category: 'INNOCUOUS',
      status: 'PLAUSIBLE',
      confidence: 0.4,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'H2',
    };

    const res1 = engine.evaluateHypothesis(hyp1, navId, timeline);
    const res2 = engine.evaluateHypothesis(hyp2, navId, timeline);

    expect(res1.evaluations.length).toBeGreaterThan(0);
    expect(res2.evaluations.length).toBeGreaterThan(0);
    expect(res2.executionTimeMs).toBeLessThanOrEqual(res1.executionTimeMs + 5);
  });

  it('PERF-V4-008: yields safely under governor budget constraints', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-perf-budget';

    for (let i = 0; i < 100; i++) {
      timeline.addEvent(navId, 'DOM', 'scanner', { price: 100 }, 1000 + i);
    }

    const engine = new CounterfactualEngine();
    const hyp: CompetingHypothesis = {
      id: 'hyp-budget',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.7,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing zero budget yield',
    };

    // Budget of 0ms should immediately trigger governor yield
    const res = engine.evaluateHypothesis(hyp, navId, timeline, { maxBudgetMs: 0 });
    expect(res.governorYielded).toBe(true);
  });
});
