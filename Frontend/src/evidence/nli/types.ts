import type { EscalationRequest, CompetingHypothesis } from '../v4/types';

export type NLILabel = 'ENTAILMENT' | 'CONTRADICTION' | 'NEUTRAL';

export type NLIAmbiguitySignal =
  | 'SUPPORTS_DECEPTIVE'
  | 'SUPPORTS_INNOCUOUS'
  | 'EQUIVOCAL'
  | 'DEGRADED_UNRESOLVED';

export interface NLIInput {
  readonly premise: string; // Enforced <= 500 chars (INV-SEC-004)
  readonly hypothesis: string; // Enforced <= 200 chars
  readonly escalationRequest: EscalationRequest;
}

/**
 * NLIModelAssessment
 *
 * Captures advisory inference output from the model.
 *
 * Epistemic Distinction:
 * Model Assessment Confidence != Vigil Epistemic Confidence != Canonical Verdict.
 *
 * Invariants Enforced:
 * - INV-V4-016: Zero new evidence nodes introduced into graph.
 * - INV-V4-017: No canonical Finding or Verdict properties permitted.
 * - INV-V4-021: Removing, disabling, or failing the model preserves pipeline safety.
 */
export interface NLIModelAssessment {
  readonly assessmentId: string;
  readonly escalationRequestId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly sha256: string;
  readonly quantization: string;
  readonly adapterVersion: string;
  readonly labelScores: Readonly<Record<NLILabel, number>>;
  readonly modelAssessmentConfidence: number; // 0.0 to 1.0 (Model confidence != Vigil epistemic confidence)
  readonly ambiguitySignal: NLIAmbiguitySignal;
  readonly rationale: string;
  readonly limitations: readonly string[];
  readonly latencyMs: number;
  readonly timestamp: number;
  readonly inferenceTimestamp: number;
  readonly sourceObservationIds: readonly string[];
  readonly executionMode: 'WORKER_ONNX' | 'DETERMINISTIC_ADAPTER' | 'DEGRADED';
  readonly coldStart: boolean;
}

export interface NLIModelEvaluator {
  evaluate(input: NLIInput, options?: { maxBudgetMs?: number }): Promise<NLIModelAssessment>;
}

export interface ReconciliationResult {
  readonly navigationId: string;
  readonly originalHypothesis: CompetingHypothesis;
  readonly adjustedHypothesis: CompetingHypothesis;
  readonly confidenceDelta: number; // Strictly clamped to [-0.15, +0.15]
  readonly statusTransition: 'RETAINED_PLAUSIBLE' | 'REJECTED_UNFOUNDED' | 'EVALUATION_DEGRADED';
  readonly assessment: NLIModelAssessment;
  readonly reconciliationRationale: string;
  readonly auditTrail: readonly string[];
  readonly timestamp: number;
}
