import type {
  EvidenceClaim,
  ConsistencyScore,
  ConsistencyState,
  VerdictEligibility,
  VerdictResolution,
  RejectedInference,
  Verdict,
} from '../shared/types';
import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';
import { findVerdictDefinition, type VerdictDefinition } from './verdict-registry';

/**
 * The Verdict Resolver.
 *
 * This is a **pure consumer** — it reads evidence, temporal correlations,
 * consistency scores, and claims, then produces a VerdictResolution.
 * It NEVER mutates the EvidenceGraph, TemporalBuffer, Finding state,
 * or NavigationState.
 *
 * Hard invariants:
 * 1. Eligibility is determined FIRST, before verdict type or confidence.
 * 2. High confidence can NEVER override an ineligible evidence state.
 * 3. CONTRADICTED does NOT automatically become ELIGIBLE.
 * 4. Every resolution is returned (even blocked ones) for forensic traceability.
 */
export class VerdictResolver {

  /**
   * Resolve a claim into a VerdictResolution.
   * Always returns a structured result, even when the verdict is blocked.
   */
  resolve(
    claim: EvidenceClaim,
    consistencyScore: ConsistencyScore,
    evidenceNodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[]
  ): VerdictResolution {

    // ── Step 1: Eligibility Gate ──────────────────────────────────────────
    const eligibility = this.determineEligibility(consistencyScore.state);

    // ── Step 2: Find verdict definition ──────────────────────────────────
    const definition = findVerdictDefinition(claim.predicate);

    // ── Step 3: Collect rejected inferences ──────────────────────────────
    const rejectedInferences = this.collectRejectedInferences(
      claim, consistencyScore, definition, evidenceNodes, correlations
    );

    // ── Step 4: If not eligible, return blocked resolution ───────────────
    if (eligibility !== 'ELIGIBLE') {
      return {
        eligibility,
        claimId: claim.id,
        confidence: 0,
        supportingEvidenceIds: consistencyScore.supportingEvidenceIds,
        contradictingEvidenceIds: consistencyScore.contradictingEvidenceIds,
        rejectedInferences,
        explanation: this.synthesizeExplanation(
          claim, consistencyScore, eligibility, undefined, rejectedInferences
        ),
      };
    }

    // ── Step 5: Validate against verdict definition ──────────────────────
    if (!definition) {
      return {
        eligibility: 'BLOCKED',
        claimId: claim.id,
        confidence: 0,
        supportingEvidenceIds: consistencyScore.supportingEvidenceIds,
        contradictingEvidenceIds: consistencyScore.contradictingEvidenceIds,
        rejectedInferences: [{
          claimPredicate: claim.predicate,
          reason: `No verdict definition exists for predicate: ${claim.predicate}`,
          evidenceConsidered: consistencyScore.supportingEvidenceIds,
        }],
        explanation: `No verdict definition registered for claim predicate "${claim.predicate}".`,
      };
    }

    // ── Step 6: Check evidentiary thresholds ─────────────────────────────
    const meetsThresholds = this.checkThresholds(
      definition, consistencyScore, evidenceNodes, correlations, claim
    );

    if (!meetsThresholds.passes) {
      return {
        eligibility: 'INSUFFICIENT_EVIDENCE',
        claimId: claim.id,
        confidence: consistencyScore.supportScore,
        supportingEvidenceIds: consistencyScore.supportingEvidenceIds,
        contradictingEvidenceIds: consistencyScore.contradictingEvidenceIds,
        rejectedInferences: [
          ...rejectedInferences,
          {
            claimPredicate: claim.predicate,
            reason: meetsThresholds.reason,
            evidenceConsidered: consistencyScore.supportingEvidenceIds,
          },
        ],
        explanation: this.synthesizeExplanation(
          claim, consistencyScore, 'INSUFFICIENT_EVIDENCE', undefined, rejectedInferences
        ),
      };
    }

    // ── Step 7: Emit verdict ─────────────────────────────────────────────
    const confidence = this.computeConfidence(consistencyScore, correlations);

    const verdict: Verdict = {
      type: definition.verdictType,
      summary: `Evidence supports: ${definition.verdictType.replace(/_/g, ' ').toLowerCase()}`,
    };

    return {
      eligibility: 'ELIGIBLE',
      verdict,
      claimId: claim.id,
      confidence,
      supportingEvidenceIds: consistencyScore.supportingEvidenceIds,
      contradictingEvidenceIds: consistencyScore.contradictingEvidenceIds,
      rejectedInferences,
      explanation: this.synthesizeExplanation(
        claim, consistencyScore, 'ELIGIBLE', verdict, rejectedInferences
      ),
    };
  }

  // ─── Step 1: Eligibility ────────────────────────────────────────────────

  private determineEligibility(state: ConsistencyState): VerdictEligibility {
    switch (state) {
      case 'SUPPORTED':
        return 'ELIGIBLE';
      case 'CONTRADICTED':
        // A contradiction tells us the original claim is false/unsupported,
        // but does NOT automatically generate a replacement verdict.
        return 'BLOCKED';
      case 'CONTESTED':
        return 'CONTESTED';
      case 'UNSUPPORTED':
        return 'INSUFFICIENT_EVIDENCE';
      case 'UNKNOWN':
        return 'BLOCKED';
    }
  }

  // ─── Step 5: Rejected Inferences ────────────────────────────────────────

  private collectRejectedInferences(
    claim: EvidenceClaim,
    score: ConsistencyScore,
    definition: VerdictDefinition | undefined,
    nodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[]
  ): RejectedInference[] {
    const rejected: RejectedInference[] = [];

    // Check if there are related but non-matching predicates that could be confused
    if (definition?.prohibitedInferencePredicates) {
      for (const prohibited of definition.prohibitedInferencePredicates) {
        rejected.push({
          claimPredicate: prohibited,
          reason: `"${prohibited}" is not established by evidence for "${claim.predicate}".`,
          evidenceConsidered: score.supportingEvidenceIds,
        });
      }
    }

    // If the claim is about data sharing but not data sale, explicitly reject the sale inference
    if (claim.predicate === 'shares_personal_information') {
      rejected.push({
        claimPredicate: 'sells_personal_information',
        reason: 'Third-party data sharing does not establish data sale.',
        evidenceConsidered: score.supportingEvidenceIds,
      });
    }

    return rejected;
  }

  // ─── Step 6: Threshold Validation ───────────────────────────────────────

  private checkThresholds(
    definition: VerdictDefinition,
    score: ConsistencyScore,
    nodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[],
    claim: EvidenceClaim
  ): { passes: boolean; reason: string } {
    if (score.supportScore < definition.minimumSupport) {
      return {
        passes: false,
        reason: `Support score ${score.supportScore.toFixed(2)} is below minimum ${definition.minimumSupport} for ${definition.verdictType}.`,
      };
    }

    if (score.contradictionScore > definition.maximumContradiction) {
      return {
        passes: false,
        reason: `Contradiction score ${score.contradictionScore.toFixed(2)} exceeds maximum ${definition.maximumContradiction} for ${definition.verdictType}.`,
      };
    }

    // Filter nodes relevant to this claim's navigation
    const relevantNodes = claim.navigationId
      ? nodes.filter(n => n.navigationId === claim.navigationId)
      : nodes;

    if (relevantNodes.length < definition.minimumEvidenceNodes) {
      return {
        passes: false,
        reason: `Only ${relevantNodes.length} evidence node(s) available; ${definition.minimumEvidenceNodes} required for ${definition.verdictType}.`,
      };
    }

    if (definition.requiresTemporalEvidence) {
      const relevantCorrelations = claim.navigationId
        ? correlations.filter(c => c.navigationId === claim.navigationId)
        : correlations;

      if (relevantCorrelations.length === 0) {
        return {
          passes: false,
          reason: `${definition.verdictType} requires temporal evidence, but none was found.`,
        };
      }
    }

    if (definition.requiredEvidenceTypes) {
      for (const requiredType of definition.requiredEvidenceTypes) {
        if (!relevantNodes.some(n => n.type === requiredType)) {
          return {
            passes: false,
            reason: `${definition.verdictType} requires evidence of type "${requiredType}", but none was found.`,
          };
        }
      }
    }

    return { passes: true, reason: '' };
  }

  // ─── Step 7: Confidence ─────────────────────────────────────────────────

  private computeConfidence(
    score: ConsistencyScore,
    correlations: TemporalCorrelation[]
  ): number {
    // Base confidence from consistency support
    let confidence = score.supportScore;

    // Temporal evidence strengthens confidence
    if (correlations.length > 0) {
      const avgTemporalScore = correlations.reduce((s, c) => s + c.score.total, 0) / correlations.length;
      confidence = Math.min(1.0, confidence * 0.7 + avgTemporalScore * 0.3);
    }

    // Contradiction weakens confidence
    confidence = Math.max(0, confidence - score.contradictionScore * 0.5);

    return Math.round(confidence * 100) / 100;
  }

  // ─── Step 8: Explanation Synthesis ───────────────────────────────────────

  private synthesizeExplanation(
    claim: EvidenceClaim,
    score: ConsistencyScore,
    eligibility: VerdictEligibility,
    verdict: Verdict | undefined,
    rejected: RejectedInference[]
  ): string {
    const lines: string[] = [];

    // Observed
    lines.push(`Observed: Claim "${claim.predicate}" regarding "${claim.subject}".`);

    // Consistency
    lines.push(`Consistency: support=${score.supportScore.toFixed(2)}, contradiction=${score.contradictionScore.toFixed(2)}, state=${score.state}.`);

    // Conclusion
    if (verdict) {
      lines.push(`Conclusion: ${verdict.summary}.`);
    } else {
      lines.push(`Conclusion: No verdict issued (eligibility=${eligibility}).`);
    }

    // Boundary / rejected
    if (rejected.length > 0) {
      lines.push(`Boundary: ${rejected.map(r => r.reason).join(' ')}`);
    }

    return lines.join(' ');
  }
}
