import {
  EvidenceClaim,
  ClaimEvidence,
  ConsistencyState,
  ConsistencyScore,
} from '../shared/types';
import { EvidenceNode } from './graph';
import { TemporalCorrelation } from './temporal';
import { CLAIM_PREDICATES } from './claims';

/**
 * Interface for a deterministic contradiction rule.
 */
export interface ContradictionRule {
  id: string;

  /**
   * Determine if this rule should evaluate the given claim.
   */
  appliesTo(claim: EvidenceClaim): boolean;

  /**
   * Evaluate the claim against the provided evidence and temporal correlations.
   * Returns a ClaimEvidence array detailing how the evidence supports or contradicts the claim.
   */
  evaluate(
    claim: EvidenceClaim,
    evidenceNodes: EvidenceNode<any>[],
    correlations: TemporalCorrelation[]
  ): ClaimEvidence[];
}

/**
 * Rule: DATA_SHARING_VS_NO_SHARING
 *
 * Evaluates claims about sharing data with third parties.
 * - Network requests to third parties SUPPORT the claim that data is shared.
 * - This rule is explicitly isolated from "selling data" claims.
 */
export const DATA_SHARING_VS_NO_SHARING: ContradictionRule = {
  id: 'DATA_SHARING_VS_NO_SHARING',

  appliesTo(claim: EvidenceClaim): boolean {
    return claim.predicate === CLAIM_PREDICATES.SHARES_DATA;
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];

    // Look for network requests to third parties
    const networkNodes = evidenceNodes.filter(n => n.type === 'NETWORK' && n.data.crossSite);

    for (const node of networkNodes) {
      // If we observe third-party network transmission, that supports "shares data"
      results.push({
        claimId: claim.id,
        nodeIds: [node.id],
        temporalCorrelationIds: [],
        polarity: 'SUPPORTS',
        strength: 0.8, // Strong behavioral evidence of sharing
        rationale: `Observed cross-site network request to ${node.data.domain}`,
      });
    }

    return results;
  }
};

/**
 * Rule: POLICY_STATEMENT_EVALUATOR
 *
 * Evaluates claims based on privacy policy statements.
 * If the policy explicitly denies a behavior, it CONTRADICTS the claim that the behavior occurs.
 */
export const POLICY_STATEMENT_EVALUATOR: ContradictionRule = {
  id: 'POLICY_STATEMENT_EVALUATOR',

  appliesTo(claim: EvidenceClaim): boolean {
    return true; // Applies to all claims if relevant policy evidence exists
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];

    // Look for policy evidence targeting this claim's predicate
    const policyNodes = evidenceNodes.filter(n =>
      n.type === 'DOCUMENT' &&
      n.data.predicate === claim.predicate
    );

    for (const node of policyNodes) {
      // If the policy explicitly denies it (e.g., "We do not sell...")
      if (node.data.availability === 'EXPLICITLY_DENIED') {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'CONTRADICTS',
          strength: 0.9,
          rationale: `Policy explicitly denies: ${claim.predicate}`,
        });
      } else if (node.data.availability === 'EXPLICITLY_ALLOWED') {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'SUPPORTS',
          strength: 0.9,
          rationale: `Policy explicitly allows: ${claim.predicate}`,
        });
      }
    }

    return results;
  }
};

/**
 * Rule: SELLS_DATA_CONSTRAINT
 *
 * Evaluates claims about *selling* data.
 * - Critically, standard third-party network requests do NOT automatically support "sells data".
 * - This rule requires specific evidence of a data broker or explicit sale.
 * - Absence of evidence is UNKNOWN/NEUTRAL.
 */
export const SELLS_DATA_CONSTRAINT: ContradictionRule = {
  id: 'SELLS_DATA_CONSTRAINT',

  appliesTo(claim: EvidenceClaim): boolean {
    return claim.predicate === CLAIM_PREDICATES.SELLS_DATA;
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];

    // In Phase 2C, we don't have perfect data broker classification yet,
    // so we return neutral/unknown for standard network requests rather than
    // manufacturing a contradiction.
    //
    // If we *did* have a node tagged as a known data broker, it would support the claim:
    const brokerNodes = evidenceNodes.filter(n => n.type === 'NETWORK' && n.data.isDataBroker);

    for (const node of brokerNodes) {
      results.push({
        claimId: claim.id,
        nodeIds: [node.id],
        temporalCorrelationIds: [],
        polarity: 'SUPPORTS',
        strength: 0.9,
        rationale: `Observed transmission to known data broker: ${node.data.domain}`,
      });
    }

    return results;
  }
};

/**
 * Rule: TRACKER_PRESENT_VS_TRACKER_ABSENCE
 *
 * Evaluates claims about tracker usage.
 * Correlated Tracking Initialization patterns strongly support usage.
 */
export const TRACKER_PRESENT_VS_TRACKER_ABSENCE: ContradictionRule = {
  id: 'TRACKER_PRESENT_VS_TRACKER_ABSENCE',

  appliesTo(claim: EvidenceClaim): boolean {
    return claim.predicate === CLAIM_PREDICATES.USES_TRACKERS;
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];

    // Look for Tracking Initialization temporal patterns
    const trackingPatterns = correlations.filter(c => c.pattern === 'TRACKING_INITIALIZATION');

    for (const corr of trackingPatterns) {
      results.push({
        claimId: claim.id,
        nodeIds: corr.supportingNodeIds,
        temporalCorrelationIds: [corr.id],
        polarity: 'SUPPORTS',
        strength: 0.95, // Temporal sequence is extremely strong evidence
        rationale: `Observed full tracking initialization sequence (Script -> Cookie -> Request)`,
      });
    }

    // Also look for isolated tracking cookies if no temporal pattern exists
    if (trackingPatterns.length === 0) {
      const trackingCookies = evidenceNodes.filter(n => n.type === 'STORAGE' && n.data.isTracker);
      for (const node of trackingCookies) {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'SUPPORTS',
          strength: 0.7, // Lower strength than a full temporal sequence
          rationale: `Observed tracking cookie: ${node.data.cookieName}`,
        });
      }
    }

    return results;
  }
};

/**
 * Rule: CROSS_SITE_TRANSMISSION_RULE
 *
 * Evaluates claims about cross-site network transmission.
 */
export const CROSS_SITE_TRANSMISSION_RULE: ContradictionRule = {
  id: 'CROSS_SITE_TRANSMISSION_RULE',

  appliesTo(claim: EvidenceClaim): boolean {
    return claim.predicate === CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION;
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];
    const networkNodes = evidenceNodes.filter(n => n.type === 'NETWORK' && n.data.crossSite);

    for (const node of networkNodes) {
      results.push({
        claimId: claim.id,
        nodeIds: [node.id],
        temporalCorrelationIds: [],
        polarity: 'SUPPORTS',
        strength: 0.85,
        rationale: `Observed cross-site network request to ${node.data.domain || 'third-party'}`,
      });
    }

    return results;
  }
};

/**
 * Rule: DOM_FINDING_EVALUATOR
 *
 * Evaluates claims derived from DOM detections (M1-M5).
 */
export const DOM_FINDING_EVALUATOR: ContradictionRule = {
  id: 'DOM_FINDING_EVALUATOR',

  appliesTo(claim: EvidenceClaim): boolean {
    return [
      CLAIM_PREDICATES.M1_DETECTED,
      CLAIM_PREDICATES.M2_DETECTED,
      CLAIM_PREDICATES.M3_DETECTED,
      CLAIM_PREDICATES.M4_DETECTED,
      CLAIM_PREDICATES.M5_DETECTED,
    ].includes(claim.predicate as any);
  },

  evaluate(claim, evidenceNodes, correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];
    const domNodes = evidenceNodes.filter(n => n.type === 'DOM');

    for (const node of domNodes) {
      const p = node.data as any;
      if (!p) continue;
      const modMatches =
        (claim.predicate === CLAIM_PREDICATES.M1_DETECTED && p.module === 'M1') ||
        (claim.predicate === CLAIM_PREDICATES.M2_DETECTED && p.module === 'M2') ||
        (claim.predicate === CLAIM_PREDICATES.M3_DETECTED && p.module === 'M3') ||
        (claim.predicate === CLAIM_PREDICATES.M4_DETECTED && p.module === 'M4') ||
        (claim.predicate === CLAIM_PREDICATES.M5_DETECTED && p.module === 'M5');

      if (modMatches) {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'SUPPORTS',
          strength: 0.85,
          rationale: `Observed DOM pattern for ${p.module} (${p.legacyRuleId || 'DOM scanner'})`,
        });
      }
    }

    // Threat intelligence nodes also evaluate M2_DETECTED claims
    if (claim.predicate === CLAIM_PREDICATES.M2_DETECTED) {
      const threatNodes = evidenceNodes.filter(n => n.type === 'THREAT_INTEL');
      for (const node of threatNodes) {
        const p = node.data as any;
        if (p && (p.threatStatus === 'KNOWN_PHISHING' || p.threatStatus === 'KNOWN_MALWARE')) {
          results.push({
            claimId: claim.id,
            nodeIds: [node.id],
            temporalCorrelationIds: [],
            polarity: 'SUPPORTS',
            strength: p.confidence === 'CONFIRMED' ? 0.95 : 0.85,
            rationale: `Threat intelligence indicator: ${p.details || p.threatStatus}`,
          });
        }
      }
    }

    return results;
  }
};

/**
 * Rule: LEGAL_CLASSIFIER_EVALUATOR
 *
 * Evaluates claims derived from legal auditor clause classifications against
 * DOCUMENT evidence nodes.
 *
 * Invariant: Treats legal classifications strictly as evidentiary signals,
 * never as authoritative proof of statutory consumer law violations.
 */
export const LEGAL_CLASSIFIER_EVALUATOR: ContradictionRule = {
  id: 'LEGAL_CLASSIFIER_EVALUATOR',

  appliesTo(claim: EvidenceClaim): boolean {
    const LEGAL_PREDICATES = [
      'legal_data_sale_detected',
      'legal_arbitration_detected',
      'legal_class_action_detected',
      'legal_data_sharing_detected',
      'legal_user_rights_detected',
      'legal_ai_training_detected',
      'legal_content_license_detected',
      'legal_auto_renewal_detected',
      'legal_termination_detected',
      'legal_indemnification_detected',
      'legal_governing_law_detected',
      'legal_data_breach_detected',
      'legal_data_collection_detected',
      'legal_data_retention_detected',
      'legal_children_data_detected',
      'legal_gov_disclosure_detected',
      'legal_cookie_policy_detected',
      'legal_price_change_detected',
      'legal_liability_detected',
    ];
    return LEGAL_PREDICATES.includes(claim.predicate);
  },

  evaluate(claim, evidenceNodes, _correlations): ClaimEvidence[] {
    const results: ClaimEvidence[] = [];

    // Look for DOCUMENT nodes from the legal-auditor that match this claim's category
    const legalNodes = evidenceNodes.filter(n =>
      n.type === 'DOCUMENT' &&
      n.provenance.collector === 'legal-auditor' &&
      n.data?.category
    );

    for (const node of legalNodes) {
      // Map the legal category back to the expected claim predicate
      const category = node.data.category as string;
      const categoryPredicate = `legal_${category.toLowerCase()}_detected`;

      if (categoryPredicate !== claim.predicate) continue;

      // Determine polarity from the availability field
      // EXPLICITLY_DENIED â†’ the clause appears protective/negated â†’ CONTRADICTS risk claim
      // EXPLICITLY_ALLOWED â†’ the clause appears to permit the practice â†’ SUPPORTS risk claim
      if (node.data.availability === 'EXPLICITLY_DENIED') {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'CONTRADICTS',
          strength: 0.85,
          rationale: `Legal classifier: Policy clause appears to disclaim or restrict ${category} (negated clause detected)`,
        });
      } else if (node.data.availability === 'EXPLICITLY_ALLOWED') {
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'SUPPORTS',
          strength: 0.9,
          rationale: `Legal classifier: Policy confirms ${category} practice appears permitted (confidence: ${node.data.confidence || 'UNKNOWN'})`,
        });
      } else {
        // OBSERVED/UNKNOWN â€” the classifier detected the topic but cannot establish direction
        results.push({
          claimId: claim.id,
          nodeIds: [node.id],
          temporalCorrelationIds: [],
          polarity: 'SUPPORTS',
          strength: 0.6,
          rationale: `Legal classifier: Topic "${category}" noted in policy text (confidence: ${node.data.confidence || 'OBSERVED'})`,
        });
      }
    }

    return results;
  }
};

export const RULE_REGISTRY: ContradictionRule[] = [
  DATA_SHARING_VS_NO_SHARING,
  POLICY_STATEMENT_EVALUATOR,
  SELLS_DATA_CONSTRAINT,
  TRACKER_PRESENT_VS_TRACKER_ABSENCE,
  CROSS_SITE_TRANSMISSION_RULE,
  DOM_FINDING_EVALUATOR,
  LEGAL_CLASSIFIER_EVALUATOR,
];
