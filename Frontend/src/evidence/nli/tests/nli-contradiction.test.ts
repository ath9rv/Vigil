import { describe, it, expect } from 'vitest';
import { HypothesisReconciler } from '../hypothesis-reconciler';
import { EvidenceGraph } from '../../graph';
import type { CompetingHypothesis } from '../../v4/types';
import type { NLIModelAssessment } from '../types';

describe('V4 Step 5: TrustEngine Contradiction Primacy (INV-V4-019)', () => {
  const reconciler = new HypothesisReconciler();

  it('INV-V4-019: TrustEngine contradiction strictly overrides model entailment (confidence delta = 0)', () => {
    const navId = 'nav-contra-primacy';
    const g = new EvidenceGraph();

    g.addNode({
      id: 'node-claim-1',
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: 1000,
      source: 'dom',
      strength: 1,
      context: {} as any,
      data: {},
      provenance: { collector: 'test', collectorVersion: '1', observationId: 'obs-1' },
    });

    g.addNode({
      id: 'node-dna-2',
      type: 'NETWORK',
      navigationId: navId,
      tabId: 1,
      timestamp: 1050,
      source: 'network',
      strength: 1,
      context: {} as any,
      data: {},
      provenance: { collector: 'test', collectorVersion: '1', observationId: 'obs-2' },
    });

    // Hard CONTRADICTS edge in TrustEngine EvidenceGraph
    g.addEdge({
      from: 'node-claim-1',
      to: 'node-dna-2',
      relation: 'CONTRADICTS',
      weight: 1.0,
    });

    const graph = g.createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-drip-contra',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.60,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Contradicted hypothesis',
    };

    const highEntailmentAssessment: NLIModelAssessment = {
      assessmentId: 'assess-contra',
      escalationRequestId: 'esc-contra',
      modelId: 'xenova-nli-deberta-v3-xsmall',
      modelVersion: '1.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      quantization: 'q8',
      adapterVersion: '1.0.0-test',
      labelScores: { ENTAILMENT: 0.99, NEUTRAL: 0.01, CONTRADICTION: 0 },
      modelAssessmentConfidence: 0.99,
      ambiguitySignal: 'SUPPORTS_DECEPTIVE',
      rationale: 'Model strongly asserts deceptive entailment',
      limitations: [],
      latencyMs: 4,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: ['obs-1'],
      executionMode: 'WORKER_ONNX',
      coldStart: false,
    };

    const res = reconciler.reconcile(hyp, highEntailmentAssessment, graph);

    // Contradiction primacy: confidenceDelta must be exactly 0
    expect(res.confidenceDelta).toBe(0);
    expect(res.statusTransition).toBe('REJECTED_UNFOUNDED');
    expect(res.reconciliationRationale).toContain('INV-V4-019');
    expect(res.adjustedHypothesis.confidence).toBe(0.60); // Zero mutation
  });
});
