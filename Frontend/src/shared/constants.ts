// ─── Performance Budgets ────────────────────────────────────────────────────

/** Maximum allowed scan duration in milliseconds (M1 + M2 combined) */
export const SCAN_TIMEOUT_MS = 150;

/** MutationObserver debounce interval in milliseconds */
export const OBSERVER_DEBOUNCE_MS = 500;

/** Timeout for requesting rules from service worker before falling back to cache */
export const WORKER_RULES_TIMEOUT_MS = 150;

// ─── Module Identifiers ────────────────────────────────────────────────────

export const MODULE_NAMES: Record<string, string> = {
  M1: 'Deceptive Commerce',
  M2: 'Threat & Security Shield',
  M3: 'Privacy & Consent',
  M4: 'Attention & Addictive UX',
  M5: 'Social Proof Integrity',
} as const;

// ─── Rule File Paths ───────────────────────────────────────────────────────

export const RULE_FILE_PATHS: Record<string, string> = {
  M1: 'rules/m1_deceptive_commerce.json',
  M2: 'rules/m2_threat_shield.json',
  M3: 'rules/m3_privacy_consent.json',
  M4: 'rules/m4_attention_addiction.json',
  M5: 'rules/m5_social_proof.json',
} as const;

// ─── Trust Score Thresholds ────────────────────────────────────────────────

/** Score at or below which the site is considered dangerous */
export const SCORE_DANGER_THRESHOLD = 40;

/** Score at or below which the site warrants caution */
export const SCORE_CAUTION_THRESHOLD = 70;

/** Penalty applied per finding based on severity */
export const SEVERITY_PENALTIES: Record<string, number> = {
  low: 3,
  medium: 8,
  high: 15,
  severe: 30,
} as const;

/** EMA alpha for domain score smoothing (higher = more recent weight) */
export const SCORE_EMA_ALPHA = 0.4;

// ─── Badge Colors ──────────────────────────────────────────────────────────

export const BADGE_COLORS = {
  safe: '#22c55e',
  caution: '#f59e0b',
  danger: '#ef4444',
  disabled: '#94a3b8',
} as const;

// ─── Jagriti Integration ───────────────────────────────────────────────────

/**
 * Jagriti portal deep-link URL template.
 * Placeholders: {domain}, {category}, {description}
 * 
 * Since no public API has been confirmed, this uses the web portal URL
 * with query parameters for pre-filling.
 */
export const JAGRITI_PORTAL_URL = 'https://jagritihelpline.gov.in/complaint';
export const JAGRITI_DEEPLINK_TEMPLATE =
  'https://jagritihelpline.gov.in/complaint?domain={domain}&category={category}&description={description}';

// ─── Interactive Element Selectors ─────────────────────────────────────────

/** Master selector for all interactive elements scanned by the detection engine */
export const INTERACTIVE_SELECTORS = [
  'button',
  'a[role="button"]',
  'a[href]',
  'input[type="checkbox"]',
  'input[type="submit"]',
  'input[type="button"]',
  'select',
  'form',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '.modal',
  '[class*="modal"]',
  '[class*="popup"]',
  '[class*="overlay"]',
  '[class*="banner"]',
  '[class*="cookie"]',
  '[class*="consent"]',
  '[class*="timer"]',
  '[class*="countdown"]',
  '[class*="urgency"]',
].join(', ');

// ─── Highlighter Styles ───────────────────────────────────────────────────

export const HIGHLIGHT_COLORS = {
  severe: 'rgba(220, 38, 38, 0.15)', // Red 600
  high: 'rgba(234, 88, 12, 0.15)',   // Orange 600
  medium: 'rgba(217, 119, 6, 0.15)', // Amber 600
  low: 'rgba(202, 138, 4, 0.15)',    // Yellow 600
};

export const HIGHLIGHT_BORDER_COLORS = {
  severe: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#ca8a04',
};

// V3 Subscription Trap Defeater Database
export const CANCELLATION_URLS: Record<string, string> = {
  'netflix.com': 'https://www.netflix.com/CancelPlan',
  'amazon.com': 'https://www.amazon.com/mc',
  'amazon.in': 'https://www.amazon.in/mc',
  'amazon.co.uk': 'https://www.amazon.co.uk/mc',
  'spotify.com': 'https://www.spotify.com/account/cancel/',
  'nytimes.com': 'https://myaccount.nytimes.com/seg/cancel',
  'wsj.com': 'https://customercenter.wsj.com/cancel',
  'hulu.com': 'https://secure.hulu.com/account/cancel',
  'adobe.com': 'https://account.adobe.com/plans',
  'audible.com': 'https://www.audible.com/account/cancel-membership',
  'linkedin.com': 'https://www.linkedin.com/premium/cancel',
  'discord.com': 'https://discord.com/settings/billing'
};

// ─── Version ───────────────────────────────────────────────────────────────

export const EXTENSION_VERSION = '0.1.0';

// ─── Known Domains for M2 Similarity Check ─────────────────────────────────

/** Curated list of high-value domains for phishing similarity detection */
export const KNOWN_DOMAINS = [
  // Indian E-commerce
  'amazon.in', 'flipkart.com', 'myntra.com', 'ajio.com', 'snapdeal.com',
  'meesho.com', 'jiomart.com', 'tatacliq.com', 'nykaa.com', 'bigbasket.com',
  // Indian Banking
  'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
  'kotak.com', 'yesbank.in', 'bankofbaroda.in', 'pnbindia.in',
  // Indian UPI / Payments
  'paytm.com', 'phonepe.com', 'gpay.app',
  // Global
  'amazon.com', 'paypal.com', 'google.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'linkedin.com', 'microsoft.com', 'apple.com', 'netflix.com',
  'github.com', 'stackoverflow.com',
] as const;
