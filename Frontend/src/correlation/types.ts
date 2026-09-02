import { Finding, ConfidenceLevel } from '../evidence/evidence';
import { ThreatStatus } from '../threat-intel/types';

export interface DimensionScore {
  score: number; // 0-100
  confidence: ConfidenceLevel;
  evidenceCount: number;
}

export interface CoverageState {
  pageBehavior: boolean;
  threatIntel: boolean;
  thirdPartyRequests: boolean;
  legalReviewed: boolean;
  strictPrivacyEnabled: boolean;
}

export interface SiteAssessment {
  security: DimensionScore;
  privacy: DimensionScore;
  fairness: DimensionScore;
  legal: DimensionScore;

  overall?: number; // UI convenience
  confidence: ConfidenceLevel;
  coverage: CoverageState;

  threatStatus: ThreatStatus;

  findingCount: number;
  generatedAt: number;
  
  correlatedFindings: Finding[];
}
