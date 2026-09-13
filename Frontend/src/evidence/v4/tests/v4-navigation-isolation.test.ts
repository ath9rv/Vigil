import { describe, it, expect } from 'vitest';
import { HypothesisGraph } from '../../hypothesis-graph';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: Navigation Isolation & Cross-Session Fencing (INV-V4-002)', () => {
  it('guarantees zero hypothesis leakage across concurrent navigation sessions', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);

    const graphA = new EvidenceGraph().createReadOnlySnapshot('nav-A');
    const graphB = new EvidenceGraph().createReadOnlySnapshot('nav-B');

    // Nav A: Deceptive Drip Pricing flow
    timeline.addEvent('nav-A', 'DOM', 'scanner', { displayedBasePrice: 100, price: 100 }, 1000);
    timeline.addEvent('nav-A', 'USER_EVENT', 'btn', {}, 1500);
    timeline.addEvent('nav-A', 'DOM', 'scanner', { price: 130, feeAppeared: true, mandatoryPlatformFee: true }, 2000);

    // Nav B: Clean Innocuous flow
    timeline.addEvent('nav-B', 'DOM', 'scanner', { price: 25 }, 1000);
    timeline.addEvent('nav-B', 'DOM', 'scanner', { price: 25 }, 2000);

    const resultA = engine.evaluate('nav-A', timeline, graphA);
    const resultB = engine.evaluate('nav-B', timeline, graphB);

    expect(resultA.leadingHypothesis?.type).toBe('DECEPTIVE_DRIP_PRICING');
    expect(resultB.leadingHypothesis).toBeNull();
    expect(resultB.activeHypotheses.length).toBe(0);
  });
});
