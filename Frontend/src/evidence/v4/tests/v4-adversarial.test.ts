import { describe, it, expect } from 'vitest';
import { HypothesisGraph } from '../../hypothesis-graph';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: Adversarial Resilience & Edge Cases', () => {
  it('handles empty timeline and zero-observation navigations gracefully', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('empty-nav');

    const res = engine.evaluate('empty-nav', timeline, graph);
    expect(res.leadingHypothesis).toBeNull();
    expect(res.activeHypotheses.length).toBe(0);
    expect(res.rejectedAlternatives.length).toBe(0);
  });

  it('handles backwards timestamps and rapid clock drift without throwing', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-drift');

    timeline.addEvent('nav-drift', 'DOM', 'clock-drift', { price: 50 }, 5000);
    timeline.addEvent('nav-drift', 'USER_EVENT', 'clock-drift', {}, 2000); // Backwards
    timeline.addEvent('nav-drift', 'DOM', 'clock-drift', { price: 80 }, 1000); // Backwards

    expect(() => {
      engine.evaluate('nav-drift', timeline, graph);
    }).not.toThrow();
  });
});
