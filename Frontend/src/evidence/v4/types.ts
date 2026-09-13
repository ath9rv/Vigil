export type EvidenceNodeType = 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL' | 'USER_EVENT';

export interface TemporalEvent {
  readonly eventId: string;
  readonly observationId: string;
  readonly navigationId: string;
  readonly timestamp: number;
  readonly sequence: number;
  readonly type: EvidenceNodeType;
  readonly source: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type CausalRelationshipType =
  | 'TEMPORALLY_PRECEDES'
  | 'STATE_TRANSITION'
  | 'USER_TRIGGERED'
  | 'DOM_RESPONSE'
  | 'NETWORK_RESPONSE';

export type CausalCandidateStatus =
  | 'CANDIDATE'
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'REJECTED';

export interface CausalCandidate {
  readonly candidateId: string;
  readonly navigationId: string;
  readonly causeEventId: string;
  readonly effectEventId: string;
  readonly causeObservationId: string;
  readonly effectObservationId: string;
  readonly temporalDistanceMs: number;
  readonly sequenceDistance: number;
  readonly relationship: CausalRelationshipType;
  readonly status: CausalCandidateStatus;
  readonly supportingObservations: readonly string[];
  readonly contradictoryObservations: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type HypothesisType =
  | 'INNOCUOUS_REGIONAL_TAX'
  | 'INNOCUOUS_SHIPPING_SELECTION'
  | 'INNOCUOUS_OPTIONAL_UPGRADE'
  | 'INNOCUOUS_RESPONSIVE_LAYOUT'
  | 'DECEPTIVE_DRIP_PRICING'
  | 'DECEPTIVE_SUBSCRIPTION_REVEAL'
  | 'DECEPTIVE_URGENCY_RESET'
  | 'DECEPTIVE_CONFIRM_SHAMING';

export type HypothesisStatus =
  | 'EVALUATING'
  | 'PLAUSIBLE'
  | 'CONFIRMED'
  | 'DISPROVED'
  | 'REJECTED_INSUFFICIENT_EVIDENCE';

export interface CompetingHypothesis {
  readonly id: string;
  readonly navigationId: string;
  readonly type: HypothesisType;
  readonly category: 'INNOCUOUS' | 'DECEPTIVE';
  readonly status: HypothesisStatus;
  readonly confidence: number; // 0.0 to 1.0 (calibrated, non-dogmatic)
  readonly supportingCandidateIds: readonly string[];
  readonly contradictoryCandidateIds: readonly string[];
  readonly rationale: string;
  readonly rejectedReason?: string;
}

import type { CounterfactualAnalysisResult } from '../counterfactual/types';

export interface HypothesisEvaluationResult {
  readonly navigationId: string;
  readonly activeHypotheses: readonly CompetingHypothesis[];
  readonly leadingHypothesis: CompetingHypothesis | null;
  readonly rejectedAlternatives: readonly CompetingHypothesis[];
  readonly timestamp: number;
  readonly totalEvaluated: number;
  readonly governorYielded: boolean;
  readonly counterfactualAnalysis?: CounterfactualAnalysisResult;
}

export type AmbiguityGateStatus =
  | 'RESOLVED'
  | 'ESCALATE_TO_PROBABILISTIC'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTRADICTED_BY_TRUST_SUBSTRATE';

export interface EscalationRequest {
  readonly requestId: string;
  readonly navigationId: string;
  readonly leadingHypothesisId: string;
  readonly candidateId?: string;
  readonly boundedInputText: string; // Enforced <= 500 chars (INV-SEC-004 / Admission Budget)
  readonly sourceObservationIds: readonly string[]; // INV-V4-018: Grounded in deterministic observations
  readonly competingHypothesisIds: readonly string[];
  readonly deterministicContext: Readonly<Record<string, unknown>>;
  readonly reason: string;
  readonly timestamp: number;
}

export interface AmbiguityGateResult {
  readonly navigationId: string;
  readonly status: AmbiguityGateStatus;
  readonly escalationAllowed: boolean;
  readonly escalationRequest?: EscalationRequest;
  readonly resolvedHypothesis?: CompetingHypothesis;
  readonly reason: string;
  readonly governorYielded: boolean;
  readonly timestamp: number;
}
