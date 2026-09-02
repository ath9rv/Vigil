// ─── Module & Severity Enums ────────────────────────────────────────────────

export type ModuleId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'severe';

export type ConfidenceState = 'under_review' | 'confirmed' | 'disputed';

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
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  module: ModuleId;
  category?: 'SECURITY' | 'PRIVACY' | 'DARK_PATTERN' | 'LEGAL';
  severity: SeverityLevel | 'info' | 'critical' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidenceState: ConfidenceState | 'LOW' | 'MEDIUM' | 'HIGH';
  reviewStatus?: 'DETECTED' | 'REVIEW_NEEDED' | 'CONFIRMED';
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
  evidence?: Evidence;
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

export interface VigilLayoutShiftMessage {
  type: 'VIGIL_LAYOUT_SHIFT';
  payload: {
    value: number;
    sources: Array<{
      selector: string;
      movement: number;
    }>;
  };
  pageUrl: string;
}

export interface VigilCookieActionMessage {
  type: 'VIGIL_COOKIE_ACTION';
  domain: string;
  action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER';
  cmp: string | null;
}

export interface VigilTrackerReportMessage {
  type: 'VIGIL_TRACKER_REPORT';
  payload: any;
  pageUrl: string;
}

export interface VigilCapabilitiesChangedMessage {
  type: 'VIGIL_CAPABILITIES_CHANGED';
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
  | VigilCapabilitiesChangedMessage;

export interface ScanCompleteMessage {
  type: 'SCAN_COMPLETE';
  findings: Finding[];
  pageUrl: string;
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
  vigil_tracker_report?: any | null;
  vigil_threat_prefixes?: any;
  vigil_threat_state?: any;
  vigil_threat_confirm_cache?: any;
  [key: `tosdr_${string}`]: any;
}
