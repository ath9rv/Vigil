export type EvidenceSourceType = 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL';

export interface Evidence {
  sourceType: EvidenceSourceType;
  sourceUrl: string;
  capturedAt: number;
  documentHash?: string;
  excerpt?: string;
  context?: string;
}

export type FindingCategory = 'SECURITY' | 'PRIVACY' | 'DARK_PATTERN' | 'LEGAL';
export type SeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReviewStatus = 'DETECTED' | 'REVIEW_NEEDED' | 'CONFIRMED';

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
}
