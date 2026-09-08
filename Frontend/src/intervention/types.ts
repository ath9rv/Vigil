/**
 * Vigil Intervention & Reversibility Subsystem Types
 * Phase 4: Real-World Compatibility, Dry-Run Validation & False-Positive Calibration
 */

export type MutationType = 
  | 'VISUAL_FREEZE' 
  | 'SOFT_FADE' 
  | 'STYLE_OVERRIDE' 
  | 'ATTRIBUTE_FLAG';

export type InterventionConfidence = 
  | 'LOW' 
  | 'MODERATE' 
  | 'HIGH' 
  | 'CONFIRMED'
  | 'CONTESTED';

export type InterventionSafetyClass = 
  | 'SAFE'        // Passive visual de-emphasis / badge
  | 'CAUTIOUS'    // Freeze / isolate animation without layout shift
  | 'RESTRICTED'  // Modifies attributes/behavior; requires explicit approval
  | 'BLOCKED';    // Unsafe to mutate (forms, auth, payments, checkout)

export type CompatibilityLevel = 0 | 1 | 2 | 3 | 4;
// Level 0: No observable structural impact (advisories)
// Level 1: Visual-only mutation (scoped opacity/pointer-events)
// Level 2: Interaction-preserving mutation (freeze animations)
// Level 3: State-affecting mutation (requires authorization)
// Level 4: High-risk mutation (strictly BLOCKED from automatic mutation)

export type ProtectionMode = 
  | 'ACTIVE'       // Full two-axis decision and transaction execution
  | 'SAFE_ONLY'    // Only SAFE class mutations allowed; CAUTIOUS downgraded to report
  | 'OBSERVE_ONLY' // Zero DOM mutations; analysis/reports only
  | 'OFF';         // Completely disabled

export type TransactionState = 
  | 'PLANNED'
  | 'SNAPSHOTTED'
  | 'APPLYING'
  | 'APPLIED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'COMMITTED'
  | 'ROLLED_BACK'
  | 'ABORTED'
  | 'ABORTED_STALE';

export type VerificationResult = 
  | 'PASS' 
  | 'FAIL' 
  | 'PENDING';

export type InterventionStatus = 
  | 'ACTIVE' 
  | 'RESTORED' 
  | 'FAILED';

export interface GeometrySnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export type ShiftClassification = 
  | 'NO_SHIFT' 
  | 'EXPECTED_SHIFT' 
  | 'EXTERNAL_SHIFT'
  | 'UNKNOWN_SHIFT' 
  | 'INTERVENTION_CORRELATED_SHIFT';

export interface BlastRadiusAssessment {
  safetyClass: InterventionSafetyClass;
  compatibilityLevel: CompatibilityLevel;
  riskScore: number; // 0.0 to 1.0
  reasons: string[];
  interactiveDensity: number;
  hasFormControls: boolean;
  hasPaymentOrAuth: boolean;
  hasCrossIframe: boolean;
}

export interface MutationPlan {
  styles: Record<string, string>;
  attributes: Record<string, string>;
  freezeText?: string;
}

export interface OriginalElementState {
  opacity: string;
  pointerEvents: string;
  animation: string;
  transition: string;
  textContent?: string;
  attributes: Record<string, string | null>;
  boundingRect: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
}

export interface TransactionContext {
  origin: string;
  navigationId: string;
  frameId: string;
  nodeIdentity: string;
}

export interface CompatibilityDiagnostic {
  vector: string;
  score: number;
  evidence: string[];
  hardFailure: boolean;
}

export interface DiagnosticCompatibilityScore {
  layout: number;        // 0-100
  interaction: number;   // 0-100
  forms: number;         // 0-100
  accessibility: number; // 0-100
  runtime: number;       // 0-100
  performance: number;   // 0-100
  overall: number;       // weighted diagnostic score
  hardSafetyGatePassed: boolean;
  diagnostics: CompatibilityDiagnostic[];
}

export interface BaselineHealth {
  errorCount: number;
  unhandledRejectionCount: number;
  interactiveCount: number;
  formFieldCount: number;
  geometry: GeometrySnapshot;
  neighborGeometries: Map<string, GeometrySnapshot>;
  timestamp: number;
}

export interface PostHealth {
  errorCount: number;
  unhandledRejectionCount: number;
  interactiveCount: number;
  formFieldCount: number;
  geometry: GeometrySnapshot;
  neighborGeometries: Map<string, GeometrySnapshot>;
  timestamp: number;
}

export interface DifferentialResult {
  materiallyWorsened: boolean;
  baseline: BaselineHealth;
  post: PostHealth;
  newlyIntroducedErrors: number;
  newlyBrokenInteractions: number;
  correlatedLayoutShifts: number;
  attribution: 'PRE_EXISTING' | 'INTERVENTION_RELATED' | 'UNKNOWN';
  reasons: string[];
  hardSafetyViolation: boolean;
  diagnosticScore?: DiagnosticCompatibilityScore;
}

export interface SiteOverridePolicy {
  domain: string;
  protectionMode: ProtectionMode;
  neverIntervene: boolean;
  setAt: number;
  source: 'USER' | 'POLICY';
}

export interface InterventionTransactionRecord {
  id: string; // INT-XXXXX
  ruleId: string;
  context: TransactionContext;
  navigationId: string;
  frameId: string;
  origin: string;
  shadowRootHost?: string;
  safetyClass: InterventionSafetyClass;
  compatibilityLevel: CompatibilityLevel;
  detectionConfidence: InterventionConfidence;
  state: TransactionState;
  plan: MutationPlan;
  preSnapshot?: {
    geometry: GeometrySnapshot;
    inlineStyles: Record<string, string>;
    attributes: Record<string, string | null>;
  };
  postSnapshot?: {
    geometry: GeometrySnapshot;
  };
  createdAt: number;
  expiresAt: number;
  appliedAt?: number;
  verifiedAt?: number;
  rolledBackAt?: number;
  rollbackReason?: string;
  staleReason?: string;
  dryRun: boolean;
}

export interface InterventionRecord {
  id: string;
  targetSelector: string;
  elementTag: string;
  reason: string;
  triggeringEvidenceIds: string[];
  confidenceState: InterventionConfidence;
  mutationType: MutationType;
  timestamp: number;
  layoutPreserved: boolean;
  rollbackAvailable: boolean;
  verificationResult: VerificationResult;
  status: InterventionStatus;
  transactionId?: string;
  diagnosticScore?: DiagnosticCompatibilityScore;
}

export interface ApplyInterventionOptions {
  reason: string;
  ruleId?: string;
  triggeringEvidenceIds?: string[];
  confidenceState?: InterventionConfidence;
  mutationType?: MutationType;
  freezeText?: string;
  navigationId?: string;
  frameId?: string;
  origin?: string;
  dryRun?: boolean;
}
