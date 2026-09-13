import { EvidenceClaim, ClaimContext } from '../shared/types';

/**
 * Registry of known claim predicates to ensure vocabulary consistency.
 */
export const CLAIM_PREDICATES = {
  CROSS_SITE_TRANSMISSION: 'cross_site_transmission',
  SHARES_DATA: 'shares_personal_information',
  SELLS_DATA: 'sells_personal_information',
  USES_TRACKERS: 'uses_trackers',
  COLLECTS_IDENTIFIER: 'collects_identifier',
  REQUIRES_CONSENT: 'requires_consent',
  // DOM Finding Claims
  M1_DETECTED: 'm1_deceptive_commerce_detected',
  M2_DETECTED: 'm2_threat_shield_detected',
  M3_DETECTED: 'm3_privacy_consent_detected',
  M4_DETECTED: 'm4_attention_addiction_detected',
  M5_DETECTED: 'm5_social_proof_detected',

  // Legal Auditor Claims (ML classifier / keyword classifier outputs)
  LEGAL_DATA_SALE: 'legal_data_sale_detected',
  LEGAL_ARBITRATION: 'legal_arbitration_detected',
  LEGAL_CLASS_ACTION: 'legal_class_action_detected',
  LEGAL_DATA_SHARING: 'legal_data_sharing_detected',
  LEGAL_USER_RIGHTS: 'legal_user_rights_detected',
  LEGAL_AI_TRAINING: 'legal_ai_training_detected',
  LEGAL_CONTENT_LICENSE: 'legal_content_license_detected',
  LEGAL_AUTO_RENEWAL: 'legal_auto_renewal_detected',
  LEGAL_TERMINATION: 'legal_termination_detected',
  LEGAL_INDEMNIFICATION: 'legal_indemnification_detected',
  LEGAL_GOVERNING_LAW: 'legal_governing_law_detected',
  LEGAL_DATA_BREACH: 'legal_data_breach_detected',
  LEGAL_DATA_COLLECTION: 'legal_data_collection_detected',
  LEGAL_DATA_RETENTION: 'legal_data_retention_detected',
  LEGAL_CHILDREN_DATA: 'legal_children_data_detected',
  LEGAL_GOV_DISCLOSURE: 'legal_gov_disclosure_detected',
  LEGAL_COOKIE_POLICY: 'legal_cookie_policy_detected',
  LEGAL_PRICE_CHANGE: 'legal_price_change_detected',
  LEGAL_LIABILITY: 'legal_liability_detected',
} as const;

let claimIdCounter = 0;

/**
 * Factory for generating structured evidence claims.
 */
export class ClaimFactory {
  /**
   * Create a formal EvidenceClaim.
   */
  static createClaim(
    type: string,
    subject: string,
    predicate: string,
    object?: string,
    navigationId?: string,
    context?: ClaimContext
  ): EvidenceClaim {
    return {
      id: `claim-${++claimIdCounter}-${Date.now()}`,
      type,
      subject,
      predicate,
      object,
      navigationId,
      createdAt: Date.now(),
      context,
    };
  }

  /**
   * Extract a claim from a privacy policy statement.
   * e.g., "We do not sell your personal information" -> Subject: "Company", Predicate: "sells_personal_information"
   * (The fact that it's a denial is handled by the rules, the claim represents the *concept* being discussed)
   */
  static fromPolicyStatement(
    subject: string,
    predicate: string,
    object?: string,
    context?: ClaimContext
  ): EvidenceClaim {
    return this.createClaim('POLICY_STATEMENT', subject, predicate, object, undefined, context);
  }

  /**
   * Extract a claim from observed behavior in a specific navigation.
   */
  static fromBehavior(
    navigationId: string,
    subject: string,
    predicate: string,
    object?: string,
    context?: ClaimContext
  ): EvidenceClaim {
    return this.createClaim('BEHAVIORAL_ASSERTION', subject, predicate, object, navigationId, context);
  }

  /**
   * Extract a claim from a legal auditor classification.
   * The ML/keyword classifier has identified a clause in a legal document.
   */
  static fromLegalClassification(
    subject: string,
    predicate: string,
    object?: string,
    context?: ClaimContext
  ): EvidenceClaim {
    return this.createClaim('LEGAL_CLASSIFICATION', subject, predicate, object, undefined, context);
  }
}
