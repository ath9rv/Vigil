import type {
  VerdictResolution,
  ForensicReport,
} from '../shared/types';
import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';

export class ExplanationEngine {
  /**
   * Generates a structured human-readable forensic report from a VerdictResolution.
   * Throws an error if the resolution is not ELIGIBLE.
   */
  generateReport(
    resolution: VerdictResolution,
    nodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[]
  ): ForensicReport {
    if (resolution.eligibility !== 'ELIGIBLE' || !resolution.verdict) {
      throw new Error(`Cannot generate report for non-eligible resolution (eligibility: ${resolution.eligibility})`);
    }

    return {
      verdictType: resolution.verdict.type,
      confidenceLabel: this.mapConfidence(resolution.confidence),
      observations: this.synthesizeObservations(resolution, nodes),
      rationale: this.synthesizeRationale(resolution, correlations),
      rejectedInferences: this.synthesizeRejectedInferences(resolution),
      claimId: resolution.claimId,
      evidenceNodeIds: resolution.supportingEvidenceIds,
      temporalCorrelationIds: resolution.supportingEvidenceIds.length > 0 ? correlations.map(c => c.id) : [], // Simplified for now, just include all correlations if there are any nodes
      eligibility: resolution.eligibility,
    };
  }

  private mapConfidence(confidence: number): 'HIGH' | 'MODERATE' | 'LOW' {
    if (confidence >= 0.80) return 'HIGH';
    if (confidence >= 0.55) return 'MODERATE';
    return 'LOW';
  }

  private synthesizeObservations(resolution: VerdictResolution, nodes: EvidenceNode<any>[]): string[] {
    const observations: string[] = [];
    const supportingNodes = nodes.filter(n => resolution.supportingEvidenceIds.includes(n.id));

    const hasPolicy = supportingNodes.some(n => n.type === 'DOCUMENT');
    const networkNodes = supportingNodes.filter(n => n.type === 'NETWORK');
    const storageNodes = supportingNodes.filter(n => n.type === 'STORAGE');

    if (hasPolicy) {
      observations.push('Policy statement explicitly permits or acknowledges this behavior.');
    }

    if (storageNodes.length > 0) {
      observations.push(`Identifier or tracking cookie created/accessed (${storageNodes.length} instance${storageNodes.length > 1 ? 's' : ''}).`);
    }

    if (networkNodes.length > 0) {
      const crossSiteCount = networkNodes.filter(n => n.data.crossSite).length;
      if (crossSiteCount > 0) {
        observations.push(`Transmission sent to third-party endpoints (${crossSiteCount} instance${crossSiteCount > 1 ? 's' : ''}).`);
      } else {
        observations.push(`Network transmission observed (${networkNodes.length} instance${networkNodes.length > 1 ? 's' : ''}).`);
      }
    }

    // Deduplicate and fallback
    if (observations.length === 0) {
      observations.push('Behavioral evidence observed supporting this conclusion.');
    }

    return observations;
  }

  private synthesizeRationale(resolution: VerdictResolution, correlations: TemporalCorrelation[]): string {
    const relevantCorrelations = correlations.filter(c => 
      c.supportingNodeIds.some(id => resolution.supportingEvidenceIds.includes(id))
    );

    if (relevantCorrelations.length > 0) {
      const isExfiltration = resolution.verdict?.type === 'IDENTIFIER_EXFILTRATION';
      
      if (isExfiltration) {
        return 'The identifier was transmitted shortly after being created/accessed and was directly observable in the outbound request.';
      }
      
      return `Behavioral events occurred in a tight temporal sequence (${relevantCorrelations.length} correlated sequence${relevantCorrelations.length > 1 ? 's' : ''}), strongly indicating programmed intent rather than coincidence.`;
    }

    return 'Multiple distinct observations independently corroborate this conclusion.';
  }

  private synthesizeRejectedInferences(resolution: VerdictResolution): string[] {
    return resolution.rejectedInferences.map(r => r.reason);
  }
}
