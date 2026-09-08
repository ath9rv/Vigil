import type {
  VerdictResolution,
  ForensicReport,
} from '../shared/types';
import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';
import { EvidenceTimeline } from './timeline';

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

    const observations = this.synthesizeObservations(resolution, nodes);
    const inferences = this.synthesizeInferences(resolution, correlations);
    const intent = this.synthesizeIntent(resolution);
    const confidenceState = this.mapConfidenceState(resolution);
    const why = this.synthesizeWhy(resolution, correlations);

    return {
      verdictType: resolution.verdict.type,
      confidenceLabel: this.mapConfidence(resolution.confidence),
      observations,
      rationale: this.synthesizeRationale(resolution, correlations),
      rejectedInferences: this.synthesizeRejectedInferences(resolution),
      claimId: resolution.claimId,
      evidenceNodeIds: resolution.supportingEvidenceIds,
      temporalCorrelationIds: resolution.supportingEvidenceIds.length > 0 ? correlations.map(c => c.id) : [],
      eligibility: resolution.eligibility,

      // Phase 1: Observability & Explainability enhancements
      observed: observations,
      inferred: inferences,
      intent,
      confidenceState,
      actionTaken: resolution.verdict.type === 'CROSS_SITE_TRANSMISSION' || resolution.verdict.type === 'TRACKER_USAGE'
        ? 'Network transmission logged and analyzed; local identifier monitored.'
        : 'Finding reported to user interface with evidence lineage.',
      canActionBeReversed: true,
      why,
    };
  }

  private mapConfidence(confidence: number): 'HIGH' | 'MODERATE' | 'LOW' {
    if (confidence >= 0.80) return 'HIGH';
    if (confidence >= 0.55) return 'MODERATE';
    return 'LOW';
  }

  private mapConfidenceState(
    resolution: VerdictResolution
  ): 'UNSUPPORTED' | 'LOW' | 'MODERATE' | 'HIGH' | 'CONFIRMED' | 'CONTESTED' {
    if (resolution.contradictingEvidenceIds && resolution.contradictingEvidenceIds.length > 0) {
      return 'CONTESTED';
    }
    if (resolution.confidence >= 0.90) return 'CONFIRMED';
    if (resolution.confidence >= 0.75) return 'HIGH';
    if (resolution.confidence >= 0.50) return 'MODERATE';
    if (resolution.confidence >= 0.25) return 'LOW';
    return 'UNSUPPORTED';
  }

  private synthesizeObservations(resolution: VerdictResolution, nodes: EvidenceNode<any>[]): string[] {
    const observations: string[] = [];
    const supportingNodes = nodes.filter(n => resolution.supportingEvidenceIds.includes(n.id));

    const hasPolicy = supportingNodes.some(n => n.type === 'DOCUMENT');
    const networkNodes = supportingNodes.filter(n => n.type === 'NETWORK');
    const storageNodes = supportingNodes.filter(n => n.type === 'STORAGE');
    const domNodes = supportingNodes.filter(n => n.type === 'DOM');

    if (hasPolicy) {
      observations.push('Policy statement explicitly permits or acknowledges this behavior.');
    }

    if (storageNodes.length > 0) {
      observations.push(`Identifier or tracking cookie created/accessed (${storageNodes.length} instance${storageNodes.length > 1 ? 's' : ''}).`);
    }

    if (networkNodes.length > 0) {
      const crossSiteCount = networkNodes.filter(n => n.data?.crossSite).length;
      if (crossSiteCount > 0) {
        observations.push(`Transmission sent to third-party endpoints (${crossSiteCount} instance${crossSiteCount > 1 ? 's' : ''}).`);
      } else {
        observations.push(`Network transmission observed (${networkNodes.length} instance${networkNodes.length > 1 ? 's' : ''}).`);
      }
    }

    if (domNodes.length > 0) {
      observations.push(`DOM behavioral cues observed across ${domNodes.length} node${domNodes.length > 1 ? 's' : ''}.`);
    }

    // Deduplicate and fallback
    if (observations.length === 0) {
      observations.push('Behavioral evidence observed supporting this conclusion.');
    }

    return observations;
  }

  private synthesizeInferences(resolution: VerdictResolution, correlations: TemporalCorrelation[]): string[] {
    const inferences: string[] = [];
    const relevantCorrelations = correlations.filter(c => 
      c.supportingNodeIds.some(id => resolution.supportingEvidenceIds.includes(id))
    );

    if (relevantCorrelations.length > 0) {
      inferences.push(`Temporal sequence indicates programmatic coordination across ${relevantCorrelations.length} event sequence${relevantCorrelations.length > 1 ? 's' : ''}.`);
    }

    if (resolution.verdict?.type === 'CROSS_SITE_TRANSMISSION') {
      inferences.push('Identifier appears to propagate across origin boundaries.');
    } else if (resolution.verdict?.type === 'TRACKER_USAGE') {
      inferences.push('Observed telemetry requests match cross-origin tracking behavior patterns.');
    } else {
      inferences.push('Corroborated evidence patterns suggest deliberate interface design.');
    }

    return inferences;
  }

  private synthesizeIntent(
    resolution: VerdictResolution
  ): 'UNKNOWN' | 'BENIGN' | 'SUSPICIOUS' | 'MALICIOUS_UNPROVEN' {
    // Crucial: never equate tracking or DOM manipulation with confirmed malice
    if (resolution.confidence >= 0.85) {
      return 'SUSPICIOUS';
    }
    return 'UNKNOWN';
  }

  private synthesizeWhy(resolution: VerdictResolution, correlations: TemporalCorrelation[]): string {
    const relevantCorrelations = correlations.filter(c => 
      c.supportingNodeIds.some(id => resolution.supportingEvidenceIds.includes(id))
    );

    const verdictName = resolution.verdict?.type ? resolution.verdict.type.replace(/_/g, ' ') : 'Verdict reached';
    if (relevantCorrelations.length > 0) {
      return `${verdictName}: Multiple independent evidence nodes (${resolution.supportingEvidenceIds.length}) were observed in temporal alignment (${relevantCorrelations.length} sequence), satisfying the evidential threshold for this verdict.`;
    }

    return `${verdictName}: Observed ${resolution.supportingEvidenceIds.length} corroborating evidence node(s) with confidence score ${(resolution.confidence * 100).toFixed(0)}%.`;
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
