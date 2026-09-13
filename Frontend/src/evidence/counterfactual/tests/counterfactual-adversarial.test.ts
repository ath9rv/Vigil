import { describe, it, expect } from 'vitest';
import { TemporalEventIndex } from '../../temporal-event-index';
import { CounterfactualEngine } from '../counterfactual-engine';
import { StateDiffComputer } from '../state-diff';
import type { CompetingHypothesis } from '../../v4/types';

describe('V4 Counterfactual: Adversarial Hardening & Failure Mode Isolation', () => {
  const engine = new CounterfactualEngine();

  it('handles empty timeline gracefully without throwing uncaught exceptions', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-empty';

    const hyp: CompetingHypothesis = {
      id: 'hyp-empty',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.5,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing empty timeline',
    };

    const res = engine.evaluateHypothesis(hyp, navId, timeline);
    expect(res.navigationId).toBe(navId);
    expect(res.evaluations.length).toBe(3);
    expect(res.aggregateResult).toBe('UNRESOLVED');
  });

  it('handles timelines with missing checkout progression without false positive confirmation', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-no-progression';

    timeline.addEvent(navId, 'DOM', 'scanner', { price: 100, feeAppeared: true, feeAmount: 20 }, 1000);

    const hyp: CompetingHypothesis = {
      id: 'hyp-no-prog',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.5,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing no progression',
    };

    const res = engine.evaluateHypothesis(hyp, navId, timeline);
    const progEval = res.evaluations.find(e => e.ruleId === 'CF-RULE-001');
    expect(progEval?.result).toBe('UNRESOLVED');
    expect(res.aggregateResult).not.toBe('SUPPORTED');
  });

  it('enforces immutability: evaluations and state deltas are frozen', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-immutable';

    timeline.addEvent(navId, 'DOM', 'scanner', { price: 50 }, 1000);

    const hyp: CompetingHypothesis = {
      id: 'hyp-freeze',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.5,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing immutability',
    };

    const res = engine.evaluateHypothesis(hyp, navId, timeline);

    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.evaluations)).toBe(true);
    if (res.evaluations.length > 0) {
      expect(Object.isFrozen(res.evaluations[0])).toBe(true);
      expect(Object.isFrozen(res.evaluations[0].limitations)).toBe(true);
      expect(Object.isFrozen(res.evaluations[0].stateDelta)).toBe(true);

      // Mutating should throw in strict mode
      expect(() => {
        (res.evaluations[0] as any).result = 'CONTRADICTED';
      }).toThrow();
    }
  });

  it('resists state diff injection: deterministic ordering across asymmetric keys', () => {
    const obs = { z: 1, a: 2, m: 3 };
    const cf = { m: 3, a: 5, b: 9 };

    const deltas = StateDiffComputer.diff(obs, cf);
    const propertyOrder = deltas.map(d => d.property);

    // Sorted alphabetically
    expect(propertyOrder).toEqual(['a', 'b', 'm', 'z']);
  });
});
