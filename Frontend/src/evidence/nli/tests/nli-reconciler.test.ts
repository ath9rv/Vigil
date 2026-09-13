import { describe, it, expect } from 'vitest';
import { HypothesisReconciler } from '../hypothesis-reconciler';
import { EvidenceGraph } from '../../graph';
import type { CompetingHypothesis } from '../../v4/types';
import type { NLIModelAssessment } from '../types';

describe('V4 Step 5: Hypothesis Reconciler & Delta Clamping (Step 5D)', () => {
  const reconciler = new HypothesisReconciler();

  it('clamps confidence adjustments strictly to <= ±0.15', () => {
    const navId = 'nav-reconcile-clamp';
    const graph = new EvidenceGraph().createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-drip-1',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.60,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Initial plausible status',
    };

    const assessment: NLIModelAssessment = {
      assessmentId: 'assess-1',
      escalationRequestId: 'esc-1',
      modelId: 'xenova-nli-deberta-v3-xsmall',
      modelVersion: '1.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      quantization: 'q8',
      adapterVersion: '1.0.0-test',
      labelScores: { ENTAILMENT: 1.0, NEUTRAL: 0, CONTRADICTION: 0 },
      modelAssessmentConfidence: 1.0,
      ambiguitySignal: 'SUPPORTS_DECEPTIVE',
      rationale: 'Maximum entailment',
      limitations: [],
      latencyMs: 5,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: ['obs-1'],
      executionMode: 'WORKER_ONNX',
      coldStart: false,
    };

    const res = reconciler.reconcile(hyp, assessment, graph);

    expect(res.confidenceDelta).toBe(0.15);
    expect(res.adjustedHypothesis.confidence).toBe(0.75);
    expect(res.adjustedHypothesis.confidence).toBeLessThanOrEqual(0.95);
  });

  it('reduces confidence when model supports the competing innocuous alternative', () => {
    const navId = 'nav-reconcile-lower';
    const graph = new EvidenceGraph().createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-drip-2',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.65,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Initial plausible',
    };

    const assessment: NLIModelAssessment = {
      assessmentId: 'assess-2',
      escalationRequestId: 'esc-2',
      modelId: 'xenova-nli-deberta-v3-xsmall',
      modelVersion: '1.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      quantization: 'q8',
      adapterVersion: '1.0.0-test',
      labelScores: { ENTAILMENT: 0.8, NEUTRAL: 0.1, CONTRADICTION: 0.1 },
      modelAssessmentConfidence: 0.8,
      ambiguitySignal: 'SUPPORTS_INNOCUOUS',
      rationale: 'Supports innocuous',
      limitations: [],
      latencyMs: 4,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: ['obs-1'],
      executionMode: 'WORKER_ONNX',
      coldStart: false,
    };

    const res = reconciler.reconcile(hyp, assessment, graph);
    expect(res.confidenceDelta).toBeLessThan(0);
    expect(res.adjustedHypothesis.confidence).toBeLessThan(0.65);
  });
});
