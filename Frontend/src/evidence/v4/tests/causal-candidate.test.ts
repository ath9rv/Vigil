import { describe, it, expect } from 'vitest';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: CausalCandidateGenerator', () => {
  it('generates USER_TRIGGERED and STATE_TRANSITION candidates deterministically', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-1');

    // T0: Base price $50
    timeline.addEvent('nav-1', 'DOM', 'scanner', { price: 50 }, 1000);
    // T1: User clicks proceed
    timeline.addEvent('nav-1', 'USER_EVENT', 'click-checkout', { target: '#btn-checkout' }, 1500);
    // T2: Mandatory fee appears, total $68
    timeline.addEvent('nav-1', 'DOM', 'scanner', { price: 68, feeAppeared: true }, 2000);

    const candidates = generator.generateCandidates('nav-1', timeline, graph);
    expect(candidates.length).toBeGreaterThanOrEqual(2);

    const userTrigger = candidates.find(c => c.relationship === 'USER_TRIGGERED');
    expect(userTrigger).toBeDefined();
    expect(userTrigger?.status).toBe('SUPPORTED');

    const stateTransition = candidates.find(c => c.relationship === 'STATE_TRANSITION');
    expect(stateTransition).toBeDefined();
    expect(stateTransition?.status).toBe('SUPPORTED');
  });

  it('INV-V4-007: every candidate requires >= 2 valid observation references', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-1');

    timeline.addEvent('nav-1', 'DOM', 'scanner', { item: 1 }, 1000);
    timeline.addEvent('nav-1', 'DOM', 'scanner', { item: 2 }, 1500);

    const candidates = generator.generateCandidates('nav-1', timeline, graph);
    for (const c of candidates) {
      expect(c.causeObservationId).toBeTruthy();
      expect(c.effectObservationId).toBeTruthy();
      expect(c.supportingObservations.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('INV-V4-008: temporal precedence alone never yields CONFIRMED status', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-1');

    timeline.addEvent('nav-1', 'NETWORK', 'net', {}, 1000);
    timeline.addEvent('nav-1', 'NETWORK', 'net', {}, 1200);

    const candidates = generator.generateCandidates('nav-1', timeline, graph);
    for (const c of candidates) {
      expect((c.status as any)).not.toBe('CONFIRMED');
    }
  });
});
