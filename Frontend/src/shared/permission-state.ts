export type StrictIntent = "OFF" | "SITE" | "ALL_SITES";
export type DeepAuditMode = "LOCAL_ONLY" | "EXTERNAL_VERIFICATION";

export interface Capabilities {
  siteAccessGranted: boolean; // Computed dynamically for the current active tab
  allSitesAccessGranted: boolean; // True if <all_urls> is granted
  scriptRegistered: boolean; // True if dynamic content scripts are active
}

export interface PermissionState {
  onboardingComplete: boolean;
  strictIntent: StrictIntent;
  protectedOrigins: string[]; // User's intended list
  deepAudit: DeepAuditMode;
  lastConsentVersion: string;
  vigilPaused: boolean;
  capabilities: Capabilities; // The actual Chrome Reality
}

export const DEFAULT_PERMISSION_STATE: PermissionState = {
  onboardingComplete: false,
  strictIntent: "OFF",
  protectedOrigins: [],
  deepAudit: "LOCAL_ONLY",
  lastConsentVersion: "3.0",
  vigilPaused: false,
  capabilities: {
    siteAccessGranted: false,
    allSitesAccessGranted: false,
    scriptRegistered: false
  }
};

