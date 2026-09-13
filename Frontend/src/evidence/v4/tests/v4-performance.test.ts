import { describe, it, expect } from 'vitest';
import { HypothesisGraph } from '../../hypothesis-graph';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: Performance Scaling & Budget Enforcement (INV-V4-003 / INV-V4-010)', () => {
  it('measures scaling across 100, 1,000, and 5,000 timeline events', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-perf-1');

    // 100 events
    for (let i = 0; i < 100; i++) {
      timeline.addEvent('nav-perf-1', 'DOM', 'scanner', { idx: i, price: 10 + (i % 5) }, 1000 + i * 10);
    }
    const t100Start = performance.now();
    const res100 = engine.evaluate('nav-perf-1', timeline, graph, { maxExecutionTimeMs: 50 });
    const t100Elapsed = performance.now() - t100Start;

    console.log(`[V4 SCALING BENCHMARK] 100 events: ${t100Elapsed.toFixed(2)}ms`);
    expect(t100Elapsed).toBeLessThan(10);
    expect(res100.governorYielded).toBe(false);

    // 1,000 events
    for (let i = 100; i < 1000; i++) {
      timeline.addEvent('nav-perf-1', 'DOM', 'scanner', { idx: i, price: 10 + (i % 5) }, 1000 + i * 10);
    }
    const t1000Start = performance.now();
    const res1000 = engine.evaluate('nav-perf-1', timeline, graph, { maxExecutionTimeMs: 50 });
    const t1000Elapsed = performance.now() - t1000Start;

    console.log(`[V4 SCALING BENCHMARK] 1,000 events: ${t1000Elapsed.toFixed(2)}ms`);
    expect(t1000Elapsed).toBeLessThan(50); // Bounded under 50ms budget

    // 5,000 events with tight 5ms budget triggers governor yield without crashing
    for (let i = 1000; i < 5000; i++) {
      timeline.addEvent('nav-perf-1', 'DOM', 'scanner', { idx: i }, 1000 + i * 10);
    }
    const resYield = engine.evaluate('nav-perf-1', timeline, graph, { maxExecutionTimeMs: 0.001 });
    expect(resYield.governorYielded).toBe(true);
  });
});
