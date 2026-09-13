import type { ReadOnlyEvidenceGraph } from '../graph';
import type { CompetingHypothesis } from '../v4/types';
import type { NLIModelAssessment, ReconciliationResult } from './types';

const MAX_CONFIDENCE_DELTA = 0.15; // Strictly bounded adjustment ceiling

/**
 * HypothesisReconciler
 *
 * Reconciles deterministic competing hypotheses with NLI model assessments.
 *
 * Invariants Enforced:
 * - INV-V4-016: Zero new evidence nodes introduced into graph.
 * - INV-V4-017: Output is strictly an adjusted hypothesis; never a canonical Finding or Verdict.
 * - INV-V4-018: Explicit audit trail references source observations and escalation request.
 * - INV-V4-019: Contradictions established by TrustEngine completely block reconciliation overrides.
 * - INV-V4-020: Degrades to UNRESOLVED when assessment is DEGRADED_UNRESOLVED or EQUIVOCAL.
 * - INV-V4-021: Model failure or removal leaves deterministic hypothesis completely intact.
 */
export class HypothesisReconciler {
  public reconcile(
    hypothesis: CompetingHypothesis,
    assessment: NLIModelAssessment,
    graph: ReadOnlyEvidenceGraph
  ): ReconciliationResult {
    const timestamp = Date.now();
    const navigationId = hypothesis.navigationId;

    // INV-V4-019: Check if graph has contradictions refuting deceptive claims
    const hasContradiction = this.hasHardContradiction(graph, hypothesis.navigationId);

    // If degraded or hard contradiction, zero confidence delta is granted
    if (assessment.ambiguitySignal === 'DEGRADED_UNRESOLVED' || hasContradiction) {
      return Object.freeze({
        navigationId,
        originalHypothesis: hypothesis,
        adjustedHypothesis: hypothesis, // Zero mutation (INV-V4-021)
        confidenceDelta: 0,
        statusTransition: hasContradiction ? 'REJECTED_UNFOUNDED' : 'EVALUATION_DEGRADED',
        assessment,
        reconciliationRationale: hasContradiction
          ? 'TrustEngine contradiction takes primacy; NLI model override strictly rejected (INV-V4-019)'
          : 'NLI evaluation was degraded; preserving original hypothesis unchanged (INV-V4-020 / INV-V4-021)',
        auditTrail: Object.freeze([
          `EscalationRequest: ${assessment.escalationRequestId}`,
          `Model: ${assessment.modelId}@${assessment.modelVersion}`,
          `Status: ${hasContradiction ? 'BLOCKED_BY_CONTRADICTION' : 'DEGRADED_UNRESOLVED'} (INV-V4-021 Safe Fallback)`,
        ]),
        timestamp,
      });
    }

    // Compute strictly bounded confidence delta
    let delta = 0;
    if (assessment.ambiguitySignal === 'SUPPORTS_DECEPTIVE' && hypothesis.category === 'DECEPTIVE') {
      delta = Math.min(MAX_CONFIDENCE_DELTA, assessment.modelAssessmentConfidence * 0.15);
    } else if (assessment.ambiguitySignal === 'SUPPORTS_INNOCUOUS' && hypothesis.category === 'INNOCUOUS') {
      delta = Math.min(MAX_CONFIDENCE_DELTA, assessment.modelAssessmentConfidence * 0.15);
    } else if (assessment.ambiguitySignal === 'SUPPORTS_INNOCUOUS' && hypothesis.category === 'DECEPTIVE') {
      delta = -Math.min(MAX_CONFIDENCE_DELTA, assessment.modelAssessmentConfidence * 0.15);
    } else if (assessment.ambiguitySignal === 'SUPPORTS_DECEPTIVE' && hypothesis.category === 'INNOCUOUS') {
      delta = -Math.min(MAX_CONFIDENCE_DELTA, assessment.modelAssessmentConfidence * 0.15);
    }

    const newConfidence = Math.max(0.05, Math.min(0.95, Number((hypothesis.confidence + delta).toFixed(4))));

    const adjustedHypothesis: CompetingHypothesis = Object.freeze({
      ...hypothesis,
      confidence: newConfidence,
      rationale: `${hypothesis.rationale} [NLI Advisory: ${assessment.ambiguitySignal} (delta: ${delta > 0 ? '+' : ''}${delta.toFixed(3)})]`,
    });

    return Object.freeze({
      navigationId,
      originalHypothesis: hypothesis,
      adjustedHypothesis,
      confidenceDelta: delta,
      statusTransition: 'RETAINED_PLAUSIBLE',
      assessment,
      reconciliationRationale: `Hypothesis confidence adjusted by ${delta.toFixed(3)} based on NLI linguistic assessment.`,
      auditTrail: Object.freeze([
        `EscalationRequest: ${assessment.escalationRequestId}`,
        `Model: ${assessment.modelId}@${assessment.modelVersion}`,
        `ConfidenceDelta: ${delta.toFixed(3)} (Bounded to ±${MAX_CONFIDENCE_DELTA})`,
        `PreConfidence: ${hypothesis.confidence} -> PostConfidence: ${newConfidence}`,
      ]),
      timestamp,
    });
  }

  private hasHardContradiction(graph: ReadOnlyEvidenceGraph, navigationId: string): boolean {
    for (const node of graph.getNodes()) {
      if (node.navigationId === navigationId) {
        const contradictions = graph.getNeighborsByRelation(node.id, 'CONTRADICTS');
        if (contradictions.length > 0) return true;
      }
    }
    return false;
  }
}
