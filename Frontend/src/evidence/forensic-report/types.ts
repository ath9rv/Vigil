import type { VerdictResolution } from '../../shared/types';
import type { CompetingHypothesis, HypothesisEvaluationResult } from '../v4/types';
import type { CounterfactualAnalysisResult } from '../counterfactual/types';
import type { ReconciliationResult, NLIModelAssessment } from '../nli/types';

export interface EvidenceReference {
  readonly observationId: string;
  readonly nodeId?: string;
  readonly timestamp: number;
  readonly source: string;
  readonly description: string;
}

export interface TimelineEntry {
  readonly sequence: number;
  readonly timestamp: number;
  readonly relativeTimeMs: number;
  readonly eventType: string;
  readonly source: string;
  readonly summary: string;
  readonly observationId: string;
}

export interface HypothesisExplanation {
  readonly hypothesisId: string;
  readonly type: string;
  readonly category: 'INNOCUOUS' | 'DECEPTIVE';
  readonly status: string;
  readonly confidence: number;
  readonly evaluationSummary: string;
  readonly rejectedReason?: string;
}

export interface CounterfactualExplanation {
  readonly ruleId: string;
  readonly condition: string;
  readonly result: string;
  readonly interpretation: string;
  readonly limitations: readonly string[];
}

export interface ModelContribution {
  readonly modelId: string;
  readonly version: string;
  readonly modelAssessmentConfidence: number;
  readonly ambiguitySignal: string;
  readonly confidenceDelta: number;
  readonly rationale: string;
}

export type UncertaintyLevel =
  | 'STRONG_EVIDENCE'
  | 'MODERATE_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTRADICTORY_EVIDENCE';

export interface UncertaintyStatement {
  readonly level: UncertaintyLevel;
  readonly statement: string;
  readonly primaryFactor: string;
}

export interface ForensicReportSubject {
  readonly url: string;
  readonly domain: string;
}

export interface ForensicReportVerdict {
  readonly type: string;
  readonly summary: string;
  readonly confidence: number; // 0.0 - 1.0 (Vigil epistemic confidence)
  readonly eligibility: string;
}

/**
 * CanonicalForensicReport
 *
 * Canonical immutable output object for Layer 3 Forensic Explanation.
 *
 * Invariant:
 * - INV-V4-022: Purely exposes already-performed reasoning over frozen snapshots.
 */
export interface CanonicalForensicReport {
  readonly reportId: string;
  readonly navigationId: string;
  readonly subject: ForensicReportSubject;
  readonly verdict: ForensicReportVerdict;
  readonly summary: string;
  readonly timeline: readonly TimelineEntry[];
  readonly observations: readonly EvidenceReference[];
  readonly supportingEvidence: readonly EvidenceReference[];
  readonly contradictions: readonly EvidenceReference[];
  readonly hypotheses: readonly HypothesisExplanation[];
  readonly counterfactuals: readonly CounterfactualExplanation[];
  readonly modelAssessment?: ModelContribution;
  readonly uncertainty: readonly UncertaintyStatement[];
  readonly limitations: readonly string[];
  readonly generatedAt: number;
}

// Progressive Disclosure Views

export interface UserExplanationAlternative {
  readonly name: string;
  readonly verdict: string;
  readonly explanation: string;
}

export interface UserExplanationView {
  readonly title: string;
  readonly headline: string;
  readonly whatVigilSaw: string;
  readonly whyThisMatters: string;
  readonly consideredAlternatives: readonly UserExplanationAlternative[];
  readonly confidenceDisplay: { readonly label: string; readonly explanation: string };
  readonly nonIntentDisclaimer: string;
}

export interface EvidenceView {
  readonly timelineEntries: readonly TimelineEntry[];
  readonly supportingEvidenceCount: number;
  readonly primaryObservations: readonly EvidenceReference[];
  readonly evaluatedHypotheses: readonly HypothesisExplanation[];
  readonly counterfactualSummary: readonly CounterfactualExplanation[];
  readonly supports?: readonly string[];
  readonly rejectedAlternatives?: readonly string[];
  readonly remainingUncertainty?: string;
}

export interface ForensicView {
  readonly fullReport: CanonicalForensicReport;
  readonly auditLineage: {
    readonly navigationId: string;
    readonly reportId: string;
    readonly observationCount: number;
    readonly contradictionCount: number;
    readonly reconciliationDelta?: number;
    readonly modelProvenance?: string;
  };
}
