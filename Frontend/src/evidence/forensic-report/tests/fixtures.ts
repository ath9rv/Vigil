
import { EvidenceGraph } from '../../graph';
import { TemporalEventIndex } from '../../temporal-event-index';
import type { VerdictResolution } from '../../../shared/types';
import type { HypothesisEvaluationResult } from '../../v4/types';
import type { CounterfactualAnalysisResult } from '../../counterfactual/types';
import type { ReconciliationResult } from '../../nli/types';

export function createMockForensicsEnvironment(navId: string = 'nav-drip-demo') {
  const timeline = new TemporalEventIndex();
  timeline.addEvent(navId, 'DOM', 'price-tag', { displayedBasePrice: 100, price: 100 }, 1000);
  timeline.addEvent(navId, 'USER_EVENT', 'checkout-btn', { isProgression: true, action: 'checkout_continue' }, 1500);
  timeline.addEvent(navId, 'DOM', 'checkout-page', { feeAppeared: true, feeName: 'Mandatory Service Fee', feeAmount: 25, price: 125 }, 2000);

  const g = new EvidenceGraph();
  g.addNode({
    id: `node-${navId}-1`,
    type: 'DOM',
    navigationId: navId,
    tabId: 1,
    timestamp: 1000,
    source: 'scanner',
    strength: 1,
    context: {} as any,
    data: { price: 100 },
    provenance: { collector: 'dom', collectorVersion: '1', observationId: `obs-${navId}-1` },
  });

  g.addNode({
    id: `node-${navId}-2`,
    type: 'DOM',
    navigationId: navId,
    tabId: 1,
    timestamp: 2000,
    source: 'scanner',
    strength: 1,
    context: {} as any,
    data: { fee: 25 },
    provenance: { collector: 'dom', collectorVersion: '1', observationId: `obs-${navId}-2` },
  });

  const graph = g.createReadOnlySnapshot(navId);

  const verdictResolution: VerdictResolution = {
    eligibility: 'ELIGIBLE',
    verdict: { type: 'DECEPTIVE_UI_PATTERN', summary: 'Mandatory fee introduced post-progression' },
    claimId: 'claim-drip-1',
    confidence: 0.88,
    supportingEvidenceIds: [`obs-${navId}-1`, `obs-${navId}-2`],
    contradictingEvidenceIds: [],
    rejectedInferences: [],
    explanation: 'Drip pricing detected.',
  };

  const hypothesisResult: HypothesisEvaluationResult = {
    navigationId: navId,
    activeHypotheses: [
      {
        id: 'hyp-drip-1',
        navigationId: navId,
        type: 'DECEPTIVE_DRIP_PRICING',
        category: 'DECEPTIVE',
        status: 'CONFIRMED',
        confidence: 0.92,
        supportingCandidateIds: ['cand-1'],
        contradictoryCandidateIds: [],
        rationale: 'Mandatory fee was absent from initial base price.',
      },
    ],
    leadingHypothesis: {
      id: 'hyp-drip-1',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'CONFIRMED',
      confidence: 0.92,
      supportingCandidateIds: ['cand-1'],
      contradictoryCandidateIds: [],
      rationale: 'Mandatory fee was absent from initial base price.',
    },
    rejectedAlternatives: [
      {
        id: 'hyp-tax-1',
        navigationId: navId,
        type: 'INNOCUOUS_REGIONAL_TAX',
        category: 'INNOCUOUS',
        status: 'DISPROVED',
        confidence: 0.1,
        supportingCandidateIds: [],
        contradictoryCandidateIds: ['cand-1'],
        rationale: 'Separate tax line item exists.',
        rejectedReason: 'Contradicted by separate independent tax line item on checkout review.',
      },
      {
        id: 'hyp-ship-1',
        navigationId: navId,
        type: 'INNOCUOUS_SHIPPING_SELECTION',
        category: 'INNOCUOUS',
        status: 'DISPROVED',
        confidence: 0.05,
        supportingCandidateIds: [],
        contradictoryCandidateIds: ['cand-1'],
        rationale: 'No shipping tier interaction was recorded prior to fee appearance.',
        rejectedReason: 'Disproved: zero user shipping selection observed before fee delta.',
      },
    ],
    timestamp: Date.now(),
    totalEvaluated: 3,
    governorYielded: false,
  };

  const counterfactualResult: CounterfactualAnalysisResult = {
    navigationId: navId,
    hypothesisId: 'hyp-drip-1',
    evaluations: [
      {
        evaluationId: 'cf-prog-1',
        hypothesisId: 'hyp-drip-1',
        navigationId: navId,
        ruleId: 'CF-RULE-001',
        baselineObservations: [`obs-${navId}-1`, `obs-${navId}-2`],
        removedEvents: ['evt-prog-1'],
        observedState: { feesCount: 1 },
        counterfactualState: { feesCount: 0 },
        stateDelta: [
          {
            property: 'feesCount',
            observedValue: 1,
            counterfactualValue: 0,
            deltaType: 'ADDED',
            interpretation: 'Property feesCount was introduced by the checkout progression.',
          },
        ],
        result: 'SUPPORTED',
        limitations: [
          'Cannot establish intentional concealment or fraudulent corporate intent.',
          'Subject to DOM mutation timing jitter.',
        ],
        timestamp: Date.now(),
      },
    ],
    aggregateResult: 'SUPPORTED',
    governorYielded: false,
    executionTimeMs: 1.5,
  };

  const reconciliationResult: ReconciliationResult = {
    navigationId: navId,
    originalHypothesis: hypothesisResult.leadingHypothesis!,
    adjustedHypothesis: {
      ...hypothesisResult.leadingHypothesis!,
      confidence: 0.95,
      rationale: `${hypothesisResult.leadingHypothesis!.rationale} [NLI Advisory: SUPPORTS_DECEPTIVE (+0.030)]`,
    },
    confidenceDelta: 0.03,
    statusTransition: 'RETAINED_PLAUSIBLE',
    assessment: {
      assessmentId: 'assess-drip-1',
      escalationRequestId: 'esc-drip-1',
      modelId: 'xenova-nli-deberta-v3-xsmall',
      modelVersion: '1.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      quantization: 'q8',
      adapterVersion: '1.0.0-test',
      labelScores: { ENTAILMENT: 0.85, NEUTRAL: 0.10, CONTRADICTION: 0.05 },
      modelAssessmentConfidence: 0.85,
      ambiguitySignal: 'SUPPORTS_DECEPTIVE',
      rationale: 'Linguistic phrasing entails mandatory unannounced fee progression.',
      limitations: [
        'NLI output is an advisory signal and possesses zero authority to emit canonical findings (INV-V4-017).',
      ],
      latencyMs: 3.5,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: ['obs-1', 'obs-2'],
      executionMode: 'WORKER_ONNX',
      coldStart: false,
    },
    reconciliationRationale: 'Confidence adjusted by 0.030 based on NLI linguistic assessment.',
    auditTrail: [
      'EscalationRequest: esc-drip-1',
      'Model: xenova-nli-deberta-v3-xsmall@1.0.0',
      'ConfidenceDelta: 0.030 (Bounded to ±0.15)',
    ],
    timestamp: Date.now(),
  };

  return {
    navId,
    timeline,
    graph,
    verdictResolution,
    hypothesisResult,
    counterfactualResult,
    reconciliationResult,
  };
}
