export type EvidenceSourceType = 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL';
export type EvidenceLevel = 'OBSERVED' | 'SUGGESTIVE' | 'CORROBORATED' | 'CONFIRMED';
export type ForensicVerdict = 'CONFIRMED' | 'NEEDS_REVIEW' | 'INCONCLUSIVE';

export interface TemporalContext {
  firstSeen: number;
  lastSeen: number;
  observationCount: number;
}

/**
 * The forensic record answers three separate questions: what was observed,
 * why it may matter, and what legitimate explanation has not been ruled out.
 * Keeping them separate prevents a UI label from becoming an accusation.
 */
export interface ForensicAnalysis {
  level: EvidenceLevel;
  verdict: ForensicVerdict;
  observed: string[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  assumptions: string[];
  temporal: TemporalContext;
  coverage: Record<string, boolean>;
}

export interface Evidence {
  sourceType: EvidenceSourceType;
  sourceUrl: string;
  capturedAt: number;
  documentHash?: string;
  excerpt?: string;
  context?: string;
  forensics?: ForensicAnalysis;
}

export type FindingCategory = 'SECURITY' | 'PRIVACY' | 'DARK_PATTERN' | 'LEGAL';
export type SeverityLevel = 'INFO' | 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' | 'CRITICAL';
export type ConfidenceLevel = 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' | 'INCONCLUSIVE';
export type ReviewStatus = 'CONFIRMED' | 'REVIEW_NEEDED' | 'INCONCLUSIVE';

import type { CanonicalForensicReport } from './forensic-report/types';

export interface LocationTarget {
  readonly selector?: string;
  readonly text?: string;
  readonly ruleName?: string;
  readonly findingId: string;
  readonly severity?: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  reviewStatus: ReviewStatus;

  // What triggered this finding?
  ruleId?: string;
  ruleName?: string;

  // Explain why it matters
  interpretation: string;

  // The immutable evidence backing this finding
  evidence: Evidence;

  // Optional DOM selector or locatable target
  elementSelector?: string;
  locationTarget?: LocationTarget;

  // Layer 3 Canonical Forensic Report (Explain Mode)
  report?: CanonicalForensicReport;
}

/**
 * Extracts a typed LocationTarget from any Finding without untyped casts.
 */
export function extractLocationTarget(finding: Finding): LocationTarget | null {
  if (finding.locationTarget) return finding.locationTarget;
  const selector = finding.elementSelector;
  const text = finding.evidence?.excerpt || finding.interpretation;
  if (!selector && (!text || !text.trim())) {
    return null;
  }
  return {
    selector,
    text: text?.trim(),
    ruleName: finding.ruleName,
    findingId: finding.id,
    severity: finding.severity,
  };
}
