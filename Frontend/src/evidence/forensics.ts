import type { ConfidenceLevel, EvidenceLevel, ForensicAnalysis, ForensicVerdict, ReviewStatus } from './evidence';

interface ForensicsInput {
  confidence: ConfidenceLevel;
  reviewStatus: ReviewStatus;
  observed: string[];
  supportingEvidence?: string[];
  contradictingEvidence?: string[];
  assumptions?: string[];
  capturedAt?: number;
  coverage?: Record<string, boolean>;
}

export function createForensicAnalysis(input: ForensicsInput): ForensicAnalysis {
  const capturedAt = input.capturedAt ?? Date.now();
  const level: EvidenceLevel = input.reviewStatus === 'CONFIRMED'
    ? 'CONFIRMED'
    : input.supportingEvidence?.length
      ? 'SUGGESTIVE'
      : 'OBSERVED';
  const verdict: ForensicVerdict = input.reviewStatus === 'CONFIRMED'
    ? 'CONFIRMED'
    : input.contradictingEvidence?.length
      ? 'INCONCLUSIVE'
      : 'NEEDS_REVIEW';

  return {
    level,
    verdict,
    observed: input.observed,
    supportingEvidence: input.supportingEvidence || [],
    contradictingEvidence: input.contradictingEvidence || [],
    assumptions: input.assumptions || [],
    temporal: { firstSeen: capturedAt, lastSeen: capturedAt, observationCount: 1 },
    coverage: { dom: false, network: false, cookies: false, storage: false, scripts: false, ...input.coverage }
  };
}
