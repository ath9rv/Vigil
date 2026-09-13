import { describe, it, expect } from 'vitest';
import { TemporalEventIndex } from '../../temporal-event-index';
import { CounterfactualEngine } from '../counterfactual-engine';
import { StateDiffComputer } from '../state-diff';
import type { CompetingHypothesis } from '../../v4/types';

describe('V4 Counterfactual: Evidence Evaluation Soundness', () => {
  const engine = new CounterfactualEngine();

  it('supports deceptive drip pricing when fee appears at checkout without prior disclosure or user selection', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-soundness-drip';

    timeline.addEvent(navId, 'DOM', 'product-page', { price: 100, displayedBasePrice: 100 }, 1000);
    const evt2 = timeline.addEvent(navId, 'USER_EVENT', 'checkout-progression', { isProgression: true, action: 'checkout_continue' }, 2000);
    timeline.addEvent(navId, 'DOM', 'checkout-page', { feeAppeared: true, feeName: 'Service Fee', feeAmount: 15, mandatoryPlatformFee: true, price: 115 }, 2500);

    const dripHypothesis: CompetingHypothesis = {
      id: 'hyp-drip-1',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.8,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Mandatory fee appeared at checkout progression',
    };

    const analysis = engine.evaluateHypothesis(dripHypothesis, navId, timeline);

    expect(analysis.navigationId).toBe(navId);
    expect(analysis.aggregateResult).toBe('SUPPORTED');
    expect(analysis.evaluations.length).toBe(3);

    // Rule 1: Progression Removal
    const progEval = analysis.evaluations.find(e => e.ruleId === 'CF-RULE-001');
    expect(progEval).toBeDefined();
    expect(progEval?.result).toBe('SUPPORTED');
    expect(progEval?.removedEvents).toContain(evt2.eventId);

    // Rule 2: User Selection Removal
    const userEval = analysis.evaluations.find(e => e.ruleId === 'CF-RULE-002');
    expect(userEval).toBeDefined();
    expect(userEval?.result).toBe('SUPPORTED');

    // Rule 3: Disclosure Presence
    const discEval = analysis.evaluations.find(e => e.ruleId === 'CF-RULE-003');
    expect(discEval).toBeDefined();
    expect(discEval?.result).toBe('SUPPORTED');
  });

  it('contradicts deceptive drip pricing when fee is caused by voluntary user selection (shipping)', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-soundness-shipping';

    timeline.addEvent(navId, 'DOM', 'product-page', { price: 100, displayedBasePrice: 100 }, 1000);
    timeline.addEvent(navId, 'USER_EVENT', 'shipping-tier-selector', { userSelectedShippingTier: true, shippingTier: 'express', amount: 20 }, 1500);
    timeline.addEvent(navId, 'USER_EVENT', 'checkout-progression', { isProgression: true, action: 'checkout_continue' }, 2000);
    timeline.addEvent(navId, 'DOM', 'checkout-page', { feeAppeared: true, feeName: 'Express Shipping', feeAmount: 20, price: 120 }, 2500);

    const shippingHypothesis: CompetingHypothesis = {
      id: 'hyp-ship-1',
      navigationId: navId,
      type: 'INNOCUOUS_SHIPPING_SELECTION',
      category: 'INNOCUOUS',
      status: 'CONFIRMED',
      confidence: 0.9,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'User selected express shipping',
    };

    const analysis = engine.evaluateHypothesis(shippingHypothesis, navId, timeline);
    const userEval = analysis.evaluations.find(e => e.ruleId === 'CF-RULE-002');
    expect(userEval?.result).toBe('SUPPORTED');
  });

  it('contradicts deceptive drip pricing when upfront fee disclosure existed prior to progression', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-soundness-disclosure';

    timeline.addEvent(
      navId,
      'DOM',
      'product-page',
      {
        price: 100,
        displayedBasePrice: 100,
        disclosureText: 'Plus $10 mandatory cleaning fee added at checkout',
      },
      1000
    );
    timeline.addEvent(navId, 'USER_EVENT', 'checkout-progression', { isProgression: true, action: 'checkout_continue' }, 2000);
    timeline.addEvent(navId, 'DOM', 'checkout-page', { feeAppeared: true, feeName: 'Cleaning Fee', feeAmount: 10, mandatoryPlatformFee: true, price: 110 }, 2500);

    const dripHypothesis: CompetingHypothesis = {
      id: 'hyp-drip-disc',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing disclosure contradiction',
    };

    const analysis = engine.evaluateHypothesis(dripHypothesis, navId, timeline);
    const discEval = analysis.evaluations.find(e => e.ruleId === 'CF-RULE-003');
    expect(discEval?.result).toBe('CONTRADICTED');
    expect(analysis.aggregateResult).toBe('CONTRADICTED');
  });

  it('enforces epistemic humility: every evaluation records non-empty limitation strings', () => {
    const timeline = new TemporalEventIndex();
    const navId = 'nav-soundness-limits';

    timeline.addEvent(navId, 'DOM', 'page', { price: 50 }, 1000);

    const hyp: CompetingHypothesis = {
      id: 'hyp-test',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.5,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing limitations',
    };

    const analysis = engine.evaluateHypothesis(hyp, navId, timeline);
    for (const ev of analysis.evaluations) {
      expect(ev.limitations.length).toBeGreaterThan(0);
      expect(ev.limitations.some(l => l.includes('Cannot establish') || l.includes('Assumes') || l.includes('Disclosures'))).toBe(true);
    }
  });

  it('computes state deltas with typed delta types and forensic interpretations', () => {
    const obs = { price: 120, fee: 20, item: 'book' };
    const cf = { price: 100, item: 'book' };

    const deltas = StateDiffComputer.diff(obs, cf);
    expect(deltas.length).toBe(3);

    const priceDelta = deltas.find(d => d.property === 'price');
    expect(priceDelta?.deltaType).toBe('MODIFIED');
    expect(priceDelta?.observedValue).toBe(120);
    expect(priceDelta?.counterfactualValue).toBe(100);

    const feeDelta = deltas.find(d => d.property === 'fee');
    expect(feeDelta?.deltaType).toBe('ADDED');

    const itemDelta = deltas.find(d => d.property === 'item');
    expect(itemDelta?.deltaType).toBe('UNCHANGED');
  });
});
