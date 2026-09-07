import {
  EvidenceClaim,
  ClaimEvidence,
  ConsistencyState,
  ConsistencyScore,
} from '../shared/types';
import { EvidenceNode } from './graph';
import { TemporalCorrelation } from './temporal';
import { RULE_REGISTRY } from './contradiction-rules';

export class ConsistencyEngine {
  /**
   * Evaluate a claim against the available evidence.
   */
  evaluateClaim(
    claim: EvidenceClaim,
    evidenceNodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[]
  ): ConsistencyScore {
    // 1. Filter evidence and correlations to match the claim's navigation context, if specified.
    // Cross-navigation claims/behavior must NOT construct contradiction unless the claim is global.
    const relevantNodes = claim.navigationId 
      ? evidenceNodes.filter(n => n.navigationId === claim.navigationId)
      : evidenceNodes;

    const relevantCorrelations = claim.navigationId
      ? correlations.filter(c => c.navigationId === claim.navigationId)
      : correlations;

    // 2. Gather all evaluations from applicable rules
    const evaluations: ClaimEvidence[] = [];
    for (const rule of RULE_REGISTRY) {
      if (rule.appliesTo(claim)) {
        evaluations.push(...rule.evaluate(claim, relevantNodes, relevantCorrelations));
      }
    }

    // 3. Separate supporting and contradicting evidence
    const supporting = evaluations.filter(e => e.polarity === 'SUPPORTS');
    const contradicting = evaluations.filter(e => e.polarity === 'CONTRADICTS');

    // 4. Calculate scores
    // Basic aggregation for Phase 2C: cap at 1.0. 
    // In a mature system, this would use a proper probabilistic model (e.g. Dempster-Shafer).
    const supportScore = Math.min(1.0, supporting.reduce((sum, e) => sum + e.strength, 0));
    const contradictionScore = Math.min(1.0, contradicting.reduce((sum, e) => sum + e.strength, 0));

    // 5. Determine State
    const state = this.determineState(claim, supportScore, contradictionScore, evaluations.length);

    // 6. Calculate Confidence
    // Confidence is high if we have strong signal in either direction, or if we are actively contested.
    // It is low if we have very little signal.
    const confidence = Math.max(supportScore, contradictionScore);

    return {
      supportScore,
      contradictionScore,
      state,
      confidence,
      supportingEvidenceIds: supporting.flatMap(e => e.nodeIds),
      contradictingEvidenceIds: contradicting.flatMap(e => e.nodeIds),
    };
  }

  /**
   * Determine the ConsistencyState based on evidence scores.
   * Hard Rule: Absence of evidence != CONTRADICTED.
   */
  private determineState(
    claim: EvidenceClaim,
    support: number,
    contradiction: number,
    totalEvaluations: number
  ): ConsistencyState {
    // Hard Rule: If there's no evidence either way, it's UNKNOWN or UNSUPPORTED.
    // Never manufacture a contradiction from absence.
    if (totalEvaluations === 0) {
      return 'UNKNOWN';
    }

    if (support < 0.2 && contradiction < 0.2) {
      return 'UNSUPPORTED';
    }

    // CONTESTED: Both sides have significant evidence (> 0.4)
    if (support > 0.4 && contradiction > 0.4) {
      return 'CONTESTED';
    }

    if (support > contradiction + 0.3) {
      return 'SUPPORTED';
    }

    if (contradiction > support + 0.3) {
      return 'CONTRADICTED';
    }

    // Fallback if scores are moderate but not clearly separated
    return 'UNSUPPORTED';
  }
}
