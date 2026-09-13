import { describe, it, expect } from 'vitest';
import { HypothesisGraph } from '../../hypothesis-graph';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: Determinism & Non-Dogmatic Invariance', () => {
  it('produces byte-for-byte identical evaluation results across 10 repeated runs', () => {
    function runSimulation() {
      const timeline = new TemporalEventIndex();
      const generator = new CausalCandidateGenerator();
      const engine = new HypothesisGraph(generator);
      const graph = new EvidenceGraph().createReadOnlySnapshot('nav-det-1');

      timeline.addEvent('nav-det-1', 'DOM', 'price', { displayedBasePrice: 40, price: 40 }, 1000);
      timeline.addEvent('nav-det-1', 'USER_EVENT', 'next', {}, 1500);
      timeline.addEvent('nav-det-1', 'DOM', 'price', { price: 55, feeAppeared: true, mandatoryPlatformFee: true }, 2000);

      const res = engine.evaluate('nav-det-1', timeline, graph);
      // Strip dynamic timestamp for byte comparison
      return JSON.stringify({ ...res, timestamp: 0 });
    }

    const baseline = runSimulation();
    for (let i = 0; i < 10; i++) {
      expect(runSimulation()).toBe(baseline);
    }
  });
});
