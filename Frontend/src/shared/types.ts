import type { ForensicAnalysis } from '../evidence/evidence';

// ─── Module & Severity Enums ────────────────────────────────────────────────

export type ModuleId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export type SeverityLevel = 'INFO' | 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' | 'CRITICAL';

export type ConfidenceState = 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' | 'INCONCLUSIVE';

export type ReviewStatus = 'CONFIRMED' | 'REVIEW_NEEDED' | 'INCONCLUSIVE';

// ─── Rule Definitions ───────────────────────────────────────────────────────

export type SelectorStrategy =
  | 'text_pattern'
  | 'structural'
  | 'attribute'
  | 'timing'
  | 'domain_analysis';

export interface RuleMatch {
  /** CSS selector targeting candidate elements */
  target: string;
  /** Regex patterns to test against element text content */
  text_patterns?: string[];
  /** Whether text matching is case-insensitive */
  case_insensitive?: boolean;
  /** Structural checks (e.g., "has_nearby_element", "visibility_ratio") */
  structural_check?: StructuralCheck;
  /** Attribute-based checks */
  attribute_check?: AttributeCheck;
}

export interface StructuralCheck {
  type:
    | 'visibility_suppressed'
    | 'pre_checked_checkbox'
    | 'missing_nearby_element'
    | 'size_ratio'
    | 'repeated_modal';
  /** CSS selector for the reference element in comparison checks */
  reference_selector?: string;
  /** Threshold for ratio-based checks (e.g., font-size ratio) */
  threshold?: number;
  /** Selector that should exist nearby but is missing */
  expected_nearby?: string;
  /** Maximum pixel distance for "nearby" checks */
  proximity_px?: number;
}

export interface AttributeCheck {
  /** Attribute name to inspect */
  attribute: string;
  /** Expected value or pattern */
  pattern: string;
}

export interface Rule {
  id: string;
  name: string;
  module: ModuleId;
  statute_ref: string;
  severity: SeverityLevel;
  selector_strategy: SelectorStrategy;
  match: RuleMatch;
  explanation_template: string;
}

export interface RuleSet {
  module: string;
  version: string;
  rules: Rule[];
}

// ─── Findings ───────────────────────────────────────────────────────────────

export interface Evidence {
  sourceType: 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL';
  sourceUrl: string;
  capturedAt: number;
  documentHash?: string;
  excerpt?: string;
  context?: string;
  forensics?: ForensicAnalysis;
}

// ScanContext imported from ./scan-context
export interface Coverage {
  dom: boolean;
  threatIntel: boolean;
  network: boolean;
  cookies: boolean;
  dynamicEvents: boolean;
  storage: boolean;
  crossSite: boolean;
  jurisdictionalReviewNeeded?: boolean;
}
// ─── Phase 2C: Contradiction & Consistency ───────────────────────────────────

export type LogicalRelation =
  | 'ENTAILS'
  | 'CONTRADICTS'
  | 'REFUTES'
  | 'REFINES'
  | 'QUALIFIES'
  | 'UNRELATED';

export type ClaimPolarity = 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL';

export type EvidenceAvailability =
  | 'OBSERVED'
  | 'EXPLICITLY_DENIED'
  | 'EXPLICITLY_ALLOWED'
  | 'UNKNOWN';

export type ConsistencyState =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'CONTESTED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface ClaimContext {
  scope?: string;
  jurisdiction?: string;
  timeRange?: {
    start?: number;
    end?: number;
  };
  actor?: string;
  condition?: string;
}

export interface EvidenceClaim {
  id: string;
  type: string; // e.g., 'POLICY_STATEMENT', 'BEHAVIORAL_ASSERTION'
  subject: string;
  predicate: string;
  object?: string;
  navigationId?: string;
  createdAt: number;
  context?: ClaimContext;
}

export interface ClaimEvidence {
  claimId: string;
  nodeIds: string[];
  temporalCorrelationIds: string[];
  polarity: ClaimPolarity;
  strength: number; // 0.0 to 1.0
  rationale: string;
}

export interface ConsistencyScore {
  supportScore: number;
  contradictionScore: number;
  state: ConsistencyState;
  confidence: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
}

// ─── Phase 3: Verdict Resolver ────────────────────────────────────────────────

export type VerdictEligibility =
  | 'ELIGIBLE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTESTED'
  | 'BLOCKED';

export type VerdictType =
  | 'CROSS_SITE_TRANSMISSION'
  | 'THIRD_PARTY_DATA_SHARING'
  | 'TRACKER_USAGE'
  | 'IDENTIFIER_EXFILTRATION'
  | 'DECEPTIVE_UI_PATTERN'
  | 'CONSENT_VIOLATION'
  | 'PHISHING_RISK';

export interface RejectedInference {
  claimPredicate: string;
  reason: string;
  evidenceConsidered: string[];
}

export interface Verdict {
  type: VerdictType;
  summary: string;
}

export interface VerdictResolution {
  eligibility: VerdictEligibility;
  verdict?: Verdict;
  claimId: string;
  confidence: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  rejectedInferences: RejectedInference[];
  explanation: string;
}

// ─── Phase 4: Explanation & Presentation ──────────────────────────────────────

export interface ForensicReport {
  verdictType: VerdictType;
  confidenceLabel: 'HIGH' | 'MODERATE' | 'LOW';
  observations: string[];
  rationale: string;
  rejectedInferences: string[];
  claimId: string;
  evidenceNodeIds: string[];
  temporalCorrelationIds: string[];
  eligibility: VerdictEligibility;
}

export interface EvidenceGraphRef {
  graphId: string;
  nodeIds: string[];
  edgeIds: string[];
  temporalEventIds: string[];
  temporalCorrelationIds: string[];
  createdAt: number;
}

export interface FindingContext {
  scan: ScanContext;
  // Legacy array-based evidence is retained during transition to V4 graph
  evidence?: Evidence[];
  // Canonical immutable graph reference for V4 Trust Engine
  graphRef?: EvidenceGraphRef;
  // Attached ForensicReport from the TrustEngine
  trustEngineReport?: ForensicReport;
  coverage: Coverage;
}

// ─── Phase 5: Trust Engine Integration ────────────────────────────────────────

export interface RawObservation {
  id: string;
  tabId: number;
  navigationId: string;
  timestamp: number;
  sourceType: 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL';
  source: string;
  payload: any;
  collector: string;
  collectorVersion: string;
}

export interface TrustEngineResult {
  navigationId: string;
  resolutions: VerdictResolution[];
  reports: ForensicReport[];
  rejectedCount: number;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  module: ModuleId;
  category?: 'SECURITY' | 'PRIVACY' | 'DARK_PATTERN' | 'LEGAL';
  severity: SeverityLevel;
  confidenceState: ConfidenceState;
  reviewStatus?: ReviewStatus;
  statuteRef: string;
  explanation: string;
  interpretation?: string;
  /** CSS selector path to the matched DOM element for re-highlighting */
  elementSelector: string;
  /** Bounding rect snapshot for overlay positioning */
  elementRect?: ElementRect;
  /** URL of the page where finding was detected */
  pageUrl: string;
  /** ISO timestamp of detection */
  detectedAt: string;
  
  /** 
   * V4 Trust Engine Architecture
   * A finding CANNOT exist without a strictly bound forensic context. 
   */
  context: FindingContext;
}

export interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Trust Score ─────────────────────────────────────────────────────────────

export interface ModuleScore {
  module: ModuleId;
  score: number; // 0–100
  findingCount: number;
}

export interface DomainTrustData {
  domain: string;
  unifiedScore: number; // 0–100
  moduleScores: ModuleScore[];
  lastUpdated: string;
}

// ─── Extension Messages ─────────────────────────────────────────────────────

import type { ScanContext } from './scan-context';

export interface PageBoundMessage {
  context: ScanContext;
}

export interface VigilLayoutShiftMessage extends PageBoundMessage {
  type: 'VIGIL_LAYOUT_SHIFT';
  payload: {
    value: number;
    sources: Array<{
      selector: string;
      movement: number;
    }>;
  };
}

export interface VigilCookieActionMessage extends PageBoundMessage {
  type: 'VIGIL_COOKIE_ACTION';
  action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER';
  cmp: string | null;
}

export interface VigilTrackerReportMessage extends PageBoundMessage {
  type: 'VIGIL_TRACKER_REPORT';
  payload: Omit<TrackerReport, 'domain' | 'capturedAt'>; // Will be hydrated
}

/** A report belongs to one site only; never reuse it for another active tab. */
export interface TrackerReport {
  domain: string;
  capturedAt: number;
  trackerCount: number;
  trackersBlocked: number;
  trackersByCategory: Record<string, number>;
  trackerDomains: string[];
  trackingCookies: string[];
  httpsUpgraded: boolean;
}

export interface ScanCoverageReport {
  domain: string;
  capturedAt: number;
  dom: boolean;
  threatIntel: boolean;
  network: boolean;
  cookies: boolean;
  dynamicEvents: boolean;
  storage: boolean;
  crossSite: boolean;
}

export interface VigilCapabilitiesChangedMessage {
  type: 'VIGIL_CAPABILITIES_CHANGED';
}

export interface VigilNavigationStartedMessage extends PageBoundMessage {
  type: 'NAVIGATION_STARTED';
}

export type ExtensionMessage =
  | ScanCompleteMessage
  | GetRulesMessage
  | RulesResponseMessage
  | HighlightRequestMessage
  | ClearHighlightsMessage
  | ReportFindingMessage
  | ToggleSiteMessage
  | GetStatusMessage
  | StatusResponseMessage
  | FastLaneAlertMessage
  | VigilLayoutShiftMessage
  | VigilCookieActionMessage
  | VigilTrackerReportMessage
  | VigilNavigationStartedMessage
  | VigilCapabilitiesChangedMessage;

export interface ScanCompleteMessage extends PageBoundMessage {
  type: 'SCAN_COMPLETE';
  findings: Finding[];
  scanDurationMs: number;
  termsUrl?: string;
  privacyUrl?: string;
}

export interface GetRulesMessage {
  type: 'GET_RULES';
  module: ModuleId;
}

export interface RulesResponseMessage {
  type: 'RULES_RESPONSE';
  rules: Rule[];
  source: 'bundle' | 'cache';
}

export interface HighlightRequestMessage {
  type: 'HIGHLIGHT_REQUEST';
  findingId: string;
}

export interface ClearHighlightsMessage {
  type: 'CLEAR_HIGHLIGHTS';
}

export interface ReportFindingMessage {
  type: 'REPORT_FINDING';
  findingId: string;
}

export interface ToggleSiteMessage {
  type: 'TOGGLE_SITE';
  domain: string;
  enabled: boolean;
}

export interface GetStatusMessage {
  type: 'GET_STATUS';
  domain: string;
}

export interface StatusResponseMessage {
  type: 'STATUS_RESPONSE';
  trustData: DomainTrustData | null;
  findings: Finding[];
  enabled: boolean;
}

export interface FastLaneAlertMessage {
  type: 'FAST_LANE_ALERT';
  finding: Finding;
  domain: string;
}

// ─── Storage Schema ─────────────────────────────────────────────────────────

export interface StorageSchema {
  enabled: boolean;
  site_denylist: string[];
  install_id: string;
  onboarding_complete: boolean;
  /** Cached findings keyed by domain */
  findings_cache: Record<string, Finding[]>;
  /** Cached trust data keyed by domain */
  trust_data: Record<string, DomainTrustData>;
  /** Cached rule sets */
  rules_m1: RuleSet | null;
  rules_m2: RuleSet | null;
  rules_m3: RuleSet | null;
  rules_m4: RuleSet | null;
  rules_m5: RuleSet | null;
  /** V4 Storage Keys */
  vigil_cookie_action?: {
    domain: string;
    action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER';
    cmp: string | null;
    timestamp: number;
  } | null;
  /** Legacy single-page report, retained only to read old installations. */
  vigil_tracker_report?: TrackerReport | null;
  /** Per-domain tracker reports used by the popup and assessment. */
  vigil_tracker_reports?: Record<string, TrackerReport>;
  scan_coverage?: Record<string, ScanCoverageReport>;
  vigil_threat_prefixes?: any;
  vigil_threat_state?: any;
  vigil_threat_confirm_cache?: any;
  [key: `tosdr_${string}`]: any;
}
