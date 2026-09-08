/**
 * Vigil Intervention & Reversibility Subsystem Types
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
  | 'CONFIRMED';

export type VerificationResult = 
  | 'PASS' 
  | 'FAIL' 
  | 'PENDING';

export type InterventionStatus = 
  | 'ACTIVE' 
  | 'RESTORED' 
  | 'FAILED';

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
}

export interface ApplyInterventionOptions {
  reason: string;
  triggeringEvidenceIds?: string[];
  confidenceState?: InterventionConfidence;
  mutationType?: MutationType;
  freezeText?: string;
}
