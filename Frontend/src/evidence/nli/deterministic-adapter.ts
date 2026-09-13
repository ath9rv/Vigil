import type { NLIModelEvaluator, NLIInput, NLIModelAssessment, NLILabel, NLIAmbiguitySignal } from './types';
import { ModelCatalog } from './model-catalog';

/**
 * DeterministicNLIAdapter (Step 5C/D)
 *
 * Deterministic, hermetic NLI evaluator conforming to NLIModelEvaluator.
 * Used for CI, unit testing, adversarial fuzzing, and baseline performance verification
 * without downloading external multi-megabyte model weights.
 */
export class DeterministicNLIAdapter implements NLIModelEvaluator {
  private readonly modelMetadata = ModelCatalog.getCertifiedModel('xenova-nli-deberta-v3-xsmall', '1.0.0');

  public async evaluate(input: NLIInput, options: { maxBudgetMs?: number } = {}): Promise<NLIModelAssessment> {
    const start = performance.now();
    const budgetMs = options.maxBudgetMs ?? 50;

    // Check timeout / budget (INV-V4-020)
    if (budgetMs <= 0) {
      return this.degradedResult(input, 'Execution budget exceeded or timed out (INV-V4-020)', performance.now() - start);
    }

    const premise = input.premise.toLowerCase();
    const hypothesis = input.hypothesis.toLowerCase();

    // Enforce input bounds (INV-SEC-004 / Step 5 admission budget)
    if (premise.length === 0 || premise.length > this.modelMetadata.maxInputChars) {
      return this.degradedResult(input, 'Premise length violates Step 5 admission budget (INV-SEC-004)', performance.now() - start);
    }

    let labelScores: Record<NLILabel, number>;
    let ambiguitySignal: NLIAmbiguitySignal;
    let rationale: string;

    const deceptiveTerms = ['mandatory', 'plus', 'additional fee', 'cleaning fee', 'undisclosed', 'automatically added'];
    const innocuousTerms = ['optional', 'selected', 'user choice', 'upgrade', 'freely chosen', 'express shipping'];

    const hasDeceptiveSemantic = deceptiveTerms.some(t => premise.includes(t) || hypothesis.includes(t));
    const hasInnocuousSemantic = innocuousTerms.some(t => premise.includes(t) || hypothesis.includes(t));

    if (hasDeceptiveSemantic && !hasInnocuousSemantic) {
      labelScores = { ENTAILMENT: 0.82, NEUTRAL: 0.12, CONTRADICTION: 0.06 };
      ambiguitySignal = 'SUPPORTS_DECEPTIVE';
      rationale = 'Linguistic analysis indicates premise entails unannounced mandatory price progression.';
    } else if (hasInnocuousSemantic && !hasDeceptiveSemantic) {
      labelScores = { ENTAILMENT: 0.78, NEUTRAL: 0.15, CONTRADICTION: 0.07 };
      ambiguitySignal = 'SUPPORTS_INNOCUOUS';
      rationale = 'Linguistic analysis indicates premise entails voluntary optional selection.';
    } else {
      labelScores = { ENTAILMENT: 0.35, NEUTRAL: 0.45, CONTRADICTION: 0.20 };
      ambiguitySignal = 'EQUIVOCAL';
      rationale = 'Linguistic semantics remain equivocal; premise lacks decisive indicators.';
    }

    const duration = performance.now() - start;

    return Object.freeze({
      assessmentId: `nli-assess-${Date.now()}`,
      escalationRequestId: input.escalationRequest.requestId,
      modelId: this.modelMetadata.modelId,
      modelVersion: this.modelMetadata.version,
      sha256: this.modelMetadata.sha256,
      quantization: this.modelMetadata.quantization,
      adapterVersion: '1.0.0-deterministic',
      labelScores: Object.freeze(labelScores),
      modelAssessmentConfidence: labelScores.ENTAILMENT, // Model assessment confidence != Vigil epistemic confidence
      ambiguitySignal,
      rationale,
      limitations: Object.freeze([
        'NLI output is an advisory signal and possesses zero authority to emit canonical findings (INV-V4-017).',
        'Inference is bounded by deterministic escalation premise and cannot invent evidence (INV-V4-016).',
        'Model assessment confidence reflects linguistic alignment only, not final legal certainty.',
      ]),
      latencyMs: duration,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: Object.freeze([...(input.escalationRequest.sourceObservationIds ?? [])]),
      executionMode: 'DETERMINISTIC_ADAPTER',
      coldStart: false,
    });
  }

  private degradedResult(input: NLIInput, reason: string, latencyMs: number): NLIModelAssessment {
    return Object.freeze({
      assessmentId: `nli-assess-${Date.now()}`,
      escalationRequestId: input.escalationRequest.requestId,
      modelId: this.modelMetadata.modelId,
      modelVersion: this.modelMetadata.version,
      sha256: this.modelMetadata.sha256,
      quantization: this.modelMetadata.quantization,
      adapterVersion: '1.0.0-deterministic',
      labelScores: Object.freeze({ ENTAILMENT: 0, NEUTRAL: 1.0, CONTRADICTION: 0 }),
      modelAssessmentConfidence: 0,
      ambiguitySignal: 'DEGRADED_UNRESOLVED',
      rationale: reason,
      limitations: Object.freeze([
        'Model evaluation degraded cleanly to UNRESOLVED (INV-V4-020).',
        'Pipeline remains safe and auditable under model non-authority (INV-V4-021).',
      ]),
      latencyMs,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: Object.freeze([...(input.escalationRequest.sourceObservationIds ?? [])]),
      executionMode: 'DEGRADED',
      coldStart: false,
    });
  }
}
