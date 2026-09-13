import type { VerdictType } from '../shared/types';
import type { EvidenceSourceType } from './evidence';
import { CLAIM_PREDICATES } from './claims';

/**
 * A VerdictDefinition specifies the exact evidentiary requirements
 * for a specific verdict type. Every requirement is auditable and deterministic.
 */
export interface VerdictDefinition {
  verdictType: VerdictType;
  requiredPredicate: string;
  minimumSupport: number;
  maximumContradiction: number;
  requiresTemporalEvidence: boolean;
  minimumEvidenceNodes: number;
  requiredEvidenceTypes?: EvidenceSourceType[];
  /** Predicates that, if the claim matches, make this verdict ineligible */
  prohibitedInferencePredicates?: string[];
}

/**
 * Registry of verdict definitions.
 * Each entry specifies the minimum evidentiary bar for that verdict.
 */
export const VERDICT_DEFINITIONS: VerdictDefinition[] = [
  {
    verdictType: 'THIRD_PARTY_DATA_SHARING',
    requiredPredicate: CLAIM_PREDICATES.SHARES_DATA,
    minimumSupport: 0.70,
    maximumContradiction: 0.25,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'TRACKER_USAGE',
    requiredPredicate: CLAIM_PREDICATES.USES_TRACKERS,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'IDENTIFIER_EXFILTRATION',
    requiredPredicate: CLAIM_PREDICATES.COLLECTS_IDENTIFIER,
    minimumSupport: 0.80,
    maximumContradiction: 0.15,
    requiresTemporalEvidence: true,
    minimumEvidenceNodes: 2,
    requiredEvidenceTypes: ['NETWORK', 'STORAGE'],
  },
  {
    verdictType: 'CROSS_SITE_TRANSMISSION',
    requiredPredicate: CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION,
    minimumSupport: 0.60,
    maximumContradiction: 0.35,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'DECEPTIVE_UI_PATTERN',
    requiredPredicate: CLAIM_PREDICATES.M1_DETECTED,
    minimumSupport: 0.60,
    maximumContradiction: 0.35,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'PHISHING_RISK',
    requiredPredicate: CLAIM_PREDICATES.M2_DETECTED,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'CONSENT_VIOLATION',
    requiredPredicate: CLAIM_PREDICATES.M3_DETECTED,
    minimumSupport: 0.60,
    maximumContradiction: 0.35,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  // ─── Legal Auditor Verdicts ─────────────────────────────────────────────
  {
    verdictType: 'LEGAL_DATA_SALE_RISK',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_DATA_SALE,
    minimumSupport: 0.65,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
    prohibitedInferencePredicates: [CLAIM_PREDICATES.SHARES_DATA],
  },
  {
    verdictType: 'LEGAL_ARBITRATION_RISK',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_ARBITRATION,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'LEGAL_CLASS_ACTION_WAIVER',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_CLASS_ACTION,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'LEGAL_UNFAIR_DATA_PRACTICE',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_DATA_SHARING,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
    prohibitedInferencePredicates: [CLAIM_PREDICATES.LEGAL_DATA_SALE],
  },
  {
    verdictType: 'LEGAL_AI_TRAINING_RISK',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_AI_TRAINING,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'LEGAL_CONSUMER_RIGHTS_GOOD',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_USER_RIGHTS,
    minimumSupport: 0.60,
    maximumContradiction: 0.35,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'LEGAL_UNFAIR_TERM',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_TERMINATION,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
  {
    verdictType: 'LEGAL_INDENMNITY_RISK',
    requiredPredicate: CLAIM_PREDICATES.LEGAL_INDEMNIFICATION,
    minimumSupport: 0.60,
    maximumContradiction: 0.30,
    requiresTemporalEvidence: false,
    minimumEvidenceNodes: 1,
  },
];

/**
 * Look up the verdict definition for a given claim predicate.
 */
export function findVerdictDefinition(predicate: string): VerdictDefinition | undefined {
  return VERDICT_DEFINITIONS.find(d => d.requiredPredicate === predicate);
}
