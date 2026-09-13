import { describe, it, expect } from 'vitest';
import { AmbiguityGate } from '../ambiguity-gate';
import { EvidenceGraph } from '../../graph';
import type {
  HypothesisEvaluationResult,
  CompetingHypothesis,
} from '../types';
import type { CounterfactualAnalysisResult } from '../../counterfactual/types';

describe('V4 Step 4.5: Ambiguity Gate & Epistemic Escalation Boundary', () => {
  const gate = new AmbiguityGate();

  const baseGraphWithObs = (navId: string) => {
    const g = new EvidenceGraph();
    g.addNode({
      id: `node-${navId}-1`,
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: 1000,
      source: 'dom-scanner',
      strength: 1,
      context: { url: 'https://example.com', domain: 'example.com', tabId: 1 } as any,
      data: { text: 'Some commercial text' },
      provenance: {
        collector: 'dom-scanner',
        collectorVersion: '2.1.0',
        observationId: `obs-${navId}-1`,
      },
    });
    return g.createReadOnlySnapshot(navId);
  };

  it('blocks escalation when deterministic hypothesis is already CONFIRMED (RESOLVED)', () => {
    const navId = 'nav-confirmed';
    const graph = baseGraphWithObs(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-1',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'CONFIRMED',
      confidence: 0.95,
      supportingCandidateIds: ['cand-1'],
      contradictoryCandidateIds: [],
      rationale: 'Structurally proven',
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
    };

    const result = gate.evaluateEscalation(navId, hypResult, graph, 'Sample text');

    expect(result.status).toBe('RESOLVED');
    expect(result.escalationAllowed).toBe(false);
    expect(result.resolvedHypothesis?.id).toBe('hyp-1');
  });

  it('blocks escalation when counterfactual evidence decisively CONTRADICTS hypothesis', () => {
    const navId = 'nav-cf-contradicted';
    const graph = baseGraphWithObs(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-cf-contra',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Testing contradiction',
    };

    const cfResult: CounterfactualAnalysisResult = {
      navigationId: navId,
      hypothesisId: hyp.id,
      evaluations: [],
      aggregateResult: 'CONTRADICTED',
      governorYielded: false,
      executionTimeMs: 1.2,
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
      counterfactualAnalysis: cfResult,
    };

    const result = gate.evaluateEscalation(navId, hypResult, graph, 'Sample text');
    expect(result.status).toBe('RESOLVED');
    expect(result.escalationAllowed).toBe(false);
    expect(result.reason).toContain('contradicts');
  });

  it('INV-V4-019: blocks escalation when TrustEngine establishes a hard contradiction', () => {
    const navId = 'nav-contra-graph';
    const g = new EvidenceGraph();

    g.addNode({
      id: 'node-claim',
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: 1000,
      source: 'dom',
      strength: 1,
      context: { url: 'https://example.com' } as any,
      data: {},
      provenance: { collector: 'test', collectorVersion: '1', observationId: 'obs-claim' },
    });

    g.addNode({
      id: 'node-network-dna',
      type: 'NETWORK',
      navigationId: navId,
      tabId: 1,
      timestamp: 1050,
      source: 'network',
      strength: 1,
      context: { url: 'https://example.com' } as any,
      data: {},
      provenance: { collector: 'test', collectorVersion: '1', observationId: 'obs-dna' },
    });

    // Add hard CONTRADICTS edge
    g.addEdge({
      from: 'node-claim',
      to: 'node-network-dna',
      relation: 'CONTRADICTS',
      weight: 1.0,
    });

    const graph = g.createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-contra',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Contradicted scenario',
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
    };

    const result = gate.evaluateEscalation(navId, hypResult, graph, 'Sample text');
    expect(result.status).toBe('CONTRADICTED_BY_TRUST_SUBSTRATE');
    expect(result.escalationAllowed).toBe(false);
    expect(result.reason).toContain('INV-V4-019');
  });

  it('permits escalation when genuine ambiguity is demonstrated (PLAUSIBLE + UNRESOLVED counterfactual)', () => {
    const navId = 'nav-ambiguous';
    const graph = baseGraphWithObs(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-ambig',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: ['cand-ambig-1'],
      contradictoryCandidateIds: [],
      rationale: 'Ambiguous price disclosure text',
    };

    const cfResult: CounterfactualAnalysisResult = {
      navigationId: navId,
      hypothesisId: hyp.id,
      evaluations: [],
      aggregateResult: 'UNRESOLVED',
      governorYielded: false,
      executionTimeMs: 1.5,
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
      counterfactualAnalysis: cfResult,
    };

    const targetText = 'Special membership discount applied subject to terms';
    const result = gate.evaluateEscalation(navId, hypResult, graph, targetText);

    expect(result.status).toBe('ESCALATE_TO_PROBABILISTIC');
    expect(result.escalationAllowed).toBe(true);
    expect(result.escalationRequest).toBeDefined();

    // INV-V4-018: Grounded in deterministic observations
    expect(result.escalationRequest?.sourceObservationIds.length).toBeGreaterThan(0);
    expect(result.escalationRequest?.leadingHypothesisId).toBe(hyp.id);
  });

  it('enforces Step 5 admission budget: slices input text to <= 500 characters', () => {
    const navId = 'nav-long-text';
    const graph = baseGraphWithObs(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-long',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.55,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Long text scenario',
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
    };

    const longText = 'A'.repeat(1200); // Exceeds 500-character ceiling
    const result = gate.evaluateEscalation(navId, hypResult, graph, longText);

    expect(result.escalationAllowed).toBe(true);
    expect(result.escalationRequest?.boundedInputText.length).toBe(500);
  });

  it('INV-V4-020: degrades to INSUFFICIENT_EVIDENCE when governor yielded', () => {
    const navId = 'nav-gov-yield';
    const graph = baseGraphWithObs(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-yield',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Yield scenario',
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: true, // Governor interrupted reasoning
    };

    const result = gate.evaluateEscalation(navId, hypResult, graph, 'Sample text');

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.escalationAllowed).toBe(false);
    expect(result.governorYielded).toBe(true);
    expect(result.reason).toContain('INV-V4-020');
  });

  it('INV-V4-018: denies escalation if graph has zero source observations', () => {
    const navId = 'nav-empty-graph';
    const emptyGraph = new EvidenceGraph().createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-ungrounded',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.5,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Ungrounded scenario',
    };

    const hypResult: HypothesisEvaluationResult = {
      navigationId: navId,
      activeHypotheses: [hyp],
      leadingHypothesis: hyp,
      rejectedAlternatives: [],
      timestamp: Date.now(),
      totalEvaluated: 1,
      governorYielded: false,
    };

    const result = gate.evaluateEscalation(navId, hypResult, emptyGraph, 'Sample text');
    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.escalationAllowed).toBe(false);
    expect(result.reason).toContain('INV-V4-018');
  });
});
