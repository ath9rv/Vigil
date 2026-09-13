import type { ReadOnlyEvidenceGraph } from '../graph';
import type {
  HypothesisEvaluationResult,
  CompetingHypothesis,
  AmbiguityGateResult,
  EscalationRequest,
} from './types';

export interface AmbiguityGateOptions {
  readonly maxInputChars?: number; // Default 500 (INV-SEC-004 / Admission Budget)
  readonly confidenceThreshold?: number; // Default 0.80
}

const DEFAULT_MAX_CHARS = 500;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.80;

/**
 * AmbiguityGate
 *
 * Enforces the strict epistemic boundary between deterministic reasoning
 * and downstream probabilistic / NLI inference.
 *
 * Governing Principle:
 * "Step 5 is impossible to invoke unless Step 3 + Step 4 have demonstrated
 * genuine unresolved ambiguity. Vigil does not let intelligence create authority."
 *
 * Invariants Enforced:
 * - INV-V4-016: Probabilistic reasoning may not introduce new evidence nodes.
 * - INV-V4-017: NLI output cannot directly create a canonical Finding or Verdict.
 * - INV-V4-018: Every probabilistic conclusion must reference deterministic hypotheses and observations.
 * - INV-V4-019: A probabilistic model may resolve ambiguity but cannot override a hard contradiction.
 * - INV-V4-020: Model failure, timeout, malformed output, or low confidence must degrade to UNRESOLVED.
 */
export class AmbiguityGate {
  /**
   * Evaluates whether a deterministic hypothesis result qualifies for probabilistic escalation.
   */
  public evaluateEscalation(
    navigationId: string,
    hypothesisResult: HypothesisEvaluationResult,
    graph: ReadOnlyEvidenceGraph,
    targetText?: string,
    options: AmbiguityGateOptions = {}
  ): AmbiguityGateResult {
    const timestamp = Date.now();
    const maxChars = options.maxInputChars ?? DEFAULT_MAX_CHARS;
    const confThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

    // ── 1. INV-V4-020: Check Governor Pressure & Yield ───────────────────────
    if (hypothesisResult.governorYielded) {
      return Object.freeze({
        navigationId,
        status: 'INSUFFICIENT_EVIDENCE',
        escalationAllowed: false,
        reason: 'Governor yielded or execution budget exhausted; degrading to UNRESOLVED (INV-V4-020)',
        governorYielded: true,
        timestamp,
      });
    }

    const leadingHyp = hypothesisResult.leadingHypothesis;
    if (!leadingHyp) {
      return Object.freeze({
        navigationId,
        status: 'INSUFFICIENT_EVIDENCE',
        escalationAllowed: false,
        reason: 'No leading hypothesis found in evaluation timeline',
        governorYielded: false,
        timestamp,
      });
    }

    // ── 2. INV-V4-019: Check for Hard Contradictions in Evidence Substrate ───
    const sourceNodeIds = this.extractSourceNodeIds(leadingHyp, graph);
    if (this.hasHardContradiction(graph, sourceNodeIds)) {
      return Object.freeze({
        navigationId,
        status: 'CONTRADICTED_BY_TRUST_SUBSTRATE',
        escalationAllowed: false,
        reason: 'TrustEngine established hard contradiction; probabilistic override strictly forbidden (INV-V4-019)',
        governorYielded: false,
        timestamp,
      });
    }

    // ── 3. Check if Deterministic Evidence Already Resolved the Case ────────
    if (leadingHyp.status === 'CONFIRMED') {
      return Object.freeze({
        navigationId,
        status: 'RESOLVED',
        escalationAllowed: false,
        resolvedHypothesis: leadingHyp,
        reason: 'Leading hypothesis deterministically confirmed by structural evidence; escalation not permitted',
        governorYielded: false,
        timestamp,
      });
    }

    if (leadingHyp.status === 'DISPROVED') {
      return Object.freeze({
        navigationId,
        status: 'RESOLVED',
        escalationAllowed: false,
        resolvedHypothesis: leadingHyp,
        reason: 'Leading hypothesis deterministically disproved; escalation not permitted',
        governorYielded: false,
        timestamp,
      });
    }

    const cf = hypothesisResult.counterfactualAnalysis;
    if (cf) {
      if (cf.aggregateResult === 'CONTRADICTED') {
        return Object.freeze({
          navigationId,
          status: 'RESOLVED',
          escalationAllowed: false,
          reason: 'Counterfactual evidence decisively contradicts hypothesis; escalation denied',
          governorYielded: false,
          timestamp,
        });
      }

      if (cf.aggregateResult === 'SUPPORTED' && leadingHyp.confidence >= confThreshold) {
        return Object.freeze({
          navigationId,
          status: 'RESOLVED',
          escalationAllowed: false,
          resolvedHypothesis: leadingHyp,
          reason: 'Counterfactual evidence decisively supports hypothesis with high confidence',
          governorYielded: false,
          timestamp,
        });
      }
    }

    // ── 4. Verify Ambiguity: Only PLAUSIBLE Hypotheses with Unresolved CF ────
    const isPlausible = leadingHyp.status === 'PLAUSIBLE';
    const isCfUnresolved = !cf || cf.aggregateResult === 'UNRESOLVED' || cf.aggregateResult === 'WEAKLY_SUPPORTED';

    if (!isPlausible || !isCfUnresolved) {
      return Object.freeze({
        navigationId,
        status: 'INSUFFICIENT_EVIDENCE',
        escalationAllowed: false,
        reason: 'Evidence state does not meet criteria for genuine unresolved ambiguity',
        governorYielded: false,
        timestamp,
      });
    }

    // ── 5. INV-V4-018: Grounding in Deterministic Observations ──────────────
    const sourceObsIds = this.extractSourceObservationIds(leadingHyp, graph);
    if (sourceObsIds.length === 0) {
      return Object.freeze({
        navigationId,
        status: 'INSUFFICIENT_EVIDENCE',
        escalationAllowed: false,
        reason: 'Zero source observations grounded in deterministic evidence (INV-V4-018)',
        governorYielded: false,
        timestamp,
      });
    }

    // ── 6. Step 5 Admission Budget: Strict Input Ceiling (<= 500 Chars) ─────
    const rawText = (targetText ?? '').trim();
    if (rawText.length === 0) {
      return Object.freeze({
        navigationId,
        status: 'INSUFFICIENT_EVIDENCE',
        escalationAllowed: false,
        reason: 'Target text is empty; no linguistic candidate for probabilistic evaluation',
        governorYielded: false,
        timestamp,
      });
    }

    const boundedInputText = rawText.slice(0, maxChars);
    const competingHypothesisIds = hypothesisResult.activeHypotheses
      .filter(h => h.id !== leadingHyp.id)
      .map(h => h.id);

    // ── 7. Construct Immutable Escalation Request ────────────────────────────
    const escalationRequest: EscalationRequest = Object.freeze({
      requestId: `esc-${navigationId}-${Date.now()}`,
      navigationId,
      leadingHypothesisId: leadingHyp.id,
      candidateId: leadingHyp.supportingCandidateIds[0],
      boundedInputText,
      sourceObservationIds: Object.freeze(sourceObsIds),
      competingHypothesisIds: Object.freeze(competingHypothesisIds),
      deterministicContext: Object.freeze({
        leadingType: leadingHyp.type,
        leadingConfidence: leadingHyp.confidence,
        counterfactualResult: cf?.aggregateResult ?? 'NONE',
        charCount: boundedInputText.length,
      }),
      reason: 'Deterministic causal and counterfactual rules identified unresolved ambiguity; escalated to NLI gate',
      timestamp,
    });

    return Object.freeze({
      navigationId,
      status: 'ESCALATE_TO_PROBABILISTIC',
      escalationAllowed: true,
      escalationRequest,
      reason: 'Genuine unresolved ambiguity demonstrated: deterministic rules have earned the right to ask a harder question',
      governorYielded: false,
      timestamp,
    });
  }

  /**
   * Checks if any relevant graph nodes have CONTRADICTS edges.
   */
  private hasHardContradiction(graph: ReadOnlyEvidenceGraph, nodeIds: readonly string[]): boolean {
    for (const id of nodeIds) {
      const neighbors = graph.getNeighborsByRelation(id, 'CONTRADICTS');
      if (neighbors && neighbors.length > 0) {
        return true;
      }
    }
    return false;
  }

  private extractSourceNodeIds(hyp: CompetingHypothesis, graph: ReadOnlyEvidenceGraph): string[] {
    const ids: string[] = [];
    for (const node of graph.getNodes()) {
      if (node.navigationId === hyp.navigationId) {
        ids.push(node.id);
      }
    }
    return ids;
  }

  private extractSourceObservationIds(hyp: CompetingHypothesis, graph: ReadOnlyEvidenceGraph): string[] {
    const obsIds = new Set<string>();
    for (const node of graph.getNodes()) {
      if (node.navigationId === hyp.navigationId && node.provenance?.observationId) {
        obsIds.add(node.provenance.observationId);
      }
    }
    return Array.from(obsIds);
  }
}
