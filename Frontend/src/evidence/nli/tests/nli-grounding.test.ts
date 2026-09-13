import { describe, it, expect } from 'vitest';
import { HypothesisReconciler } from '../hypothesis-reconciler';
import { EvidenceGraph } from '../../graph';
import type { CompetingHypothesis } from '../../v4/types';
import type { NLIModelAssessment } from '../types';

describe('V4 Step 5: Deterministic Grounding & Audit Trail (INV-V4-018)', () => {
  const reconciler = new HypothesisReconciler();

  it('INV-V4-018: reconciliation result maintains audit trail referencing escalation request and model', () => {
    const navId = 'nav-grounding';
    const graph = new EvidenceGraph().createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-test',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.6,
      supportingCandidateIds: ['cand-1'],
      contradictoryCandidateIds: [],
      rationale: 'Initial',
    };

    const assessment: NLIModelAssessment = {
      assessmentId: 'assess-grounding',
      escalationRequestId: 'esc-grounding-99',
      modelId: 'xenova-nli-deberta-v3-xsmall',
      modelVersion: '1.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      quantization: 'q8',
      adapterVersion: '1.0.0-test',
      labelScores: { ENTAILMENT: 0.8, NEUTRAL: 0.1, CONTRADICTION: 0.1 },
      modelAssessmentConfidence: 0.8,
      ambiguitySignal: 'SUPPORTS_DECEPTIVE',
      rationale: 'Grounded test',
      limitations: [],
      latencyMs: 3,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: ['obs-1'],
      executionMode: 'WORKER_ONNX',
      coldStart: false,
    };

    const res = reconciler.reconcile(hyp, assessment, graph);

    expect(res.auditTrail.length).toBeGreaterThanOrEqual(3);
    expect(res.auditTrail.some(a => a.includes('esc-grounding-99'))).toBe(true);
    expect(res.auditTrail.some(a => a.includes('xenova-nli-deberta-v3-xsmall@1.0.0'))).toBe(true);
  });
});
