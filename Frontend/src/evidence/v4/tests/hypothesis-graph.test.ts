import { describe, it, expect } from 'vitest';
import { HypothesisGraph } from '../../hypothesis-graph';
import { CausalCandidateGenerator } from '../../causal-candidate';
import { TemporalEventIndex } from '../../temporal-event-index';
import { EvidenceGraph } from '../../graph';

describe('V4: HypothesisGraph & Competing Hypotheses', () => {
  it('confirms Drip Pricing when fee appears post-progression and alternatives are refuted', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-drip-1');

    // T0: Base price $50
    timeline.addEvent('nav-drip-1', 'DOM', 'price-watcher', { displayedBasePrice: 50, price: 50 }, 1000);
    // T1: User proceeds to review
    timeline.addEvent('nav-drip-1', 'USER_EVENT', 'checkout-button', {}, 1500);
    // T2: Mandatory platform fee $15 appears, tax itemized separately at $3
    timeline.addEvent('nav-drip-1', 'DOM', 'price-watcher', {
      price: 68,
      feeAppeared: true,
      mandatoryPlatformFee: true,
      taxItemizedSeparately: true, // Refutes H_Innocuous_Tax
    }, 2000);

    const result = engine.evaluate('nav-drip-1', timeline, graph);

    expect(result.leadingHypothesis).not.toBeNull();
    expect(result.leadingHypothesis?.type).toBe('DECEPTIVE_DRIP_PRICING');
    expect(result.leadingHypothesis?.status).toBe('CONFIRMED');
    expect(result.leadingHypothesis?.confidence).toBeGreaterThanOrEqual(0.9);

    // INV-V4-011: Rejected alternatives remain auditable
    expect(result.rejectedAlternatives.length).toBeGreaterThanOrEqual(2);
    const taxAlt = result.rejectedAlternatives.find(h => h.type === 'INNOCUOUS_REGIONAL_TAX');
    expect(taxAlt).toBeDefined();
    expect(taxAlt?.rejectedReason).toContain('separate');
  });

  it('confirms H_Innocuous_Shipping when user explicitly selected express delivery', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-shipping-1');

    timeline.addEvent('nav-shipping-1', 'DOM', 'price-watcher', { price: 50 }, 1000);
    timeline.addEvent('nav-shipping-1', 'USER_EVENT', 'shipping-selector', { userSelectedShippingTier: 'EXPRESS' }, 1200);
    timeline.addEvent('nav-shipping-1', 'DOM', 'price-watcher', { price: 65, feeAppeared: true }, 1500);

    const result = engine.evaluate('nav-shipping-1', timeline, graph);
    const shippingHyp = result.activeHypotheses.find(h => h.type === 'INNOCUOUS_SHIPPING_SELECTION');
    expect(shippingHyp?.status).toBe('CONFIRMED');

    // Drip pricing should NOT be leading
    expect(result.leadingHypothesis?.type).toBe('INNOCUOUS_SHIPPING_SELECTION');
  });

  it('INV-V4-009: operates strictly on ReadOnlyEvidenceGraph without mutation', () => {
    const graphInstance = new EvidenceGraph();
    const snapshot = graphInstance.createReadOnlySnapshot('nav-test');
    expect((snapshot as any).addNode).toBeUndefined();
    expect((snapshot as any).addEdge).toBeUndefined();
  });

  it('enriches leading hypothesis with counterfactual evidence evaluation when enabled', () => {
    const timeline = new TemporalEventIndex();
    const generator = new CausalCandidateGenerator();
    const engine = new HypothesisGraph(generator);
    const graph = new EvidenceGraph().createReadOnlySnapshot('nav-cf-int');

    timeline.addEvent('nav-cf-int', 'DOM', 'price-watcher', { displayedBasePrice: 50, price: 50 }, 1000);
    timeline.addEvent('nav-cf-int', 'USER_EVENT', 'checkout-button', { isProgression: true, action: 'checkout_continue' }, 1500);
    timeline.addEvent('nav-cf-int', 'DOM', 'price-watcher', {
      price: 68,
      feeAppeared: true,
      mandatoryPlatformFee: true,
      taxItemizedSeparately: true,
    }, 2000);

    const result = engine.evaluate('nav-cf-int', timeline, graph, { enableCounterfactual: true });

    expect(result.counterfactualAnalysis).toBeDefined();
    expect(result.counterfactualAnalysis?.aggregateResult).toBe('SUPPORTED');
    expect(result.counterfactualAnalysis?.evaluations.length).toBe(3);
    expect(result.counterfactualAnalysis?.evaluations[0].limitations.length).toBeGreaterThan(0);
  });
});
