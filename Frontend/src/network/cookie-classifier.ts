export type CookieCategory = 'ESSENTIAL' | 'ANALYTICS' | 'MARKETING' | 'FUNCTIONAL' | 'UNKNOWN';
export type CookieRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DetailedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  category: CookieCategory;
  risk: CookieRisk;
  purpose: string;
  provider: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  session?: boolean;
  expiryText?: string;
}

interface CookieDef {
  pattern: RegExp;
  category: CookieCategory;
  risk: CookieRisk;
  provider: string;
  purpose: string;
}

const COOKIE_KNOWLEDGE_BASE: CookieDef[] = [
  // ─── Google Analytics ────────────────────────────────────────────────────────
  {
    pattern: /^_ga($|_)/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Google Analytics',
    purpose: 'Distinguishes unique website visitors by assigning a randomly generated client identifier to measure site traffic and usage.'
  },
  {
    pattern: /^_gid$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Google Analytics',
    purpose: 'Stores and updates a 24-hour unique identifier to track and group page views across a single browsing session.'
  },
  {
    pattern: /^_gat($|_)/i,
    category: 'ANALYTICS',
    risk: 'LOW',
    provider: 'Google Analytics',
    purpose: 'Throttles the request rate to Google Analytics servers on high-traffic websites to limit data collection overhead.'
  },
  {
    pattern: /^__utm[a-z]$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Google Universal Analytics (Legacy)',
    purpose: 'Legacy analytics tracker recording visitor sessions, traffic campaign sources, and navigation timestamps.'
  },

  // ─── Meta / Facebook ────────────────────────────────────────────────────────
  {
    pattern: /^_fbp$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Meta / Facebook',
    purpose: 'Identifies users across third-party websites to target behavioral advertisements and measure ad conversion efficiency.'
  },
  {
    pattern: /^_fbc$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Meta / Facebook',
    purpose: 'Stores the unique Facebook click identifier (fbclid) when a user arrives from a Facebook advertisement.'
  },
  {
    pattern: /^fr$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Meta / Facebook',
    purpose: 'Primary Facebook advertising cookie containing encrypted browser and user IDs to serve cross-context ads.'
  },

  // ─── Google Advertising & DoubleClick ───────────────────────────────────────
  {
    pattern: /^(IDE|test_cookie|DSID|ANID)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Google DoubleClick',
    purpose: 'Registers and reports user actions after viewing or clicking targeted advertisements across multiple domains.'
  },
  {
    pattern: /^_gcl_/i,
    category: 'MARKETING',
    risk: 'MEDIUM',
    provider: 'Google AdSense / Ads',
    purpose: 'Conversion linker cookie recording campaign clicks to measure ad conversion performance.'
  },

  // ─── Microsoft / Bing ───────────────────────────────────────────────────────
  {
    pattern: /^(MUID|MUIDB)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Microsoft Advertising',
    purpose: 'Widely used by Microsoft as a unique user ID to track visitors across domains for targeted Bing ad delivery.'
  },
  {
    pattern: /^_uet(sid|vid)$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Microsoft Bing Ads (UET)',
    purpose: 'Universal Event Tracking cookie recording user behavior on site after clicking a sponsored search result.'
  },

  // ─── LinkedIn ───────────────────────────────────────────────────────────────
  {
    pattern: /^(bcookie|UserMatchHistory)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'LinkedIn',
    purpose: 'Primary browser tracking ID used to follow your visits across LinkedIn and partner websites to deliver targeted ads and job sponsorships.'
  },
  {
    pattern: /^li_sugr$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'LinkedIn',
    purpose: 'Synthesized User Global Request tracker used to match your identity outside LinkedIn for cross-site behavioral ad targeting.'
  },
  {
    pattern: /^(liap|li_at|bscookie)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'LinkedIn',
    purpose: 'Secure authentication key proving you are signed into your LinkedIn account so you don\'t have to re-login on every page.'
  },
  {
    pattern: /^(li_theme|li_theme_set)$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'LinkedIn',
    purpose: 'Remembers your personal display preferences (such as Light Mode vs Dark Mode).'
  },
  {
    pattern: /^lidc$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'LinkedIn',
    purpose: 'Directs your network traffic to the nearest LinkedIn data center to make pages load quickly.'
  },
  {
    pattern: /^AnalyticsSyncHistory$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'LinkedIn',
    purpose: 'Records the timestamp of when your advertising analytics data was last synchronized with partner networks.'
  },

  // ─── TikTok ────────────────────────────────────────────────────────────────
  {
    pattern: /^_tt(p|_enable_cookie)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'TikTok',
    purpose: 'Custom behavioral pixel used to monitor user conversion flows and deliver targeted TikTok video advertisements.'
  },

  // ─── Cloudflare & Bot Shield ───────────────────────────────────────────────
  {
    pattern: /^__cf_bm$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Cloudflare',
    purpose: 'Essential security cookie distinguishing humans from malicious automated bot traffic. Does not track across sites.'
  },
  {
    pattern: /^cf_clearance$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Cloudflare',
    purpose: 'Stores proof of successful completion of a CAPTCHA or Managed Challenge to grant secure access.'
  },
  {
    pattern: /^AWSALB(CORS)?$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon Web Services',
    purpose: 'Enables load-balancer server stickiness to ensure successive HTTP requests reach the same backend compute instance.'
  },

  // ─── Web Sessions & Authentication ─────────────────────────────────────────
  {
    pattern: /^(JSESSIONID|PHPSESSID|ASP\.NET_SessionId|connect\.sid|sid|sessionid|sess_id|session)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Web Server / Host',
    purpose: 'Maintains user session state, shopping cart contents, or logged-in status between HTTP page navigations.'
  },
  {
    pattern: /^(csrftoken|_csrf|xsrf[-_]token|csrf[-_]token)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Security Defense',
    purpose: 'Cryptographic anti-tamper token that protects web forms against Cross-Site Request Forgery attacks.'
  },

  // ─── Consent & Preferences ─────────────────────────────────────────────────
  {
    pattern: /(consent|cookie_notice|cookie-agreed|has_js|optanon|gdpr|terms)/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'First-Party / CMP',
    purpose: 'Remembers user cookie consent choices and browser feature flags so notice banners are not shown on every click.'
  },

  // ─── Analytics Suites ───────────────────────────────────────────────────────
  {
    pattern: /^_cl(ck|sk)$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Microsoft Clarity',
    purpose: 'Records anonymized user clicks, mouse movements, and scroll activity to generate visual session heatmaps.'
  },
  {
    pattern: /^_hj(Session|SessionUser|id|IncludedIn)/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Hotjar',
    purpose: 'Retains Hotjar User ID and session recording state to analyze UX friction points and navigational drops.'
  },
  {
    pattern: /^_pk_(id|ses|ref)/i,
    category: 'ANALYTICS',
    risk: 'LOW',
    provider: 'Matomo (Privacy-Friendly)',
    purpose: 'Self-hosted privacy-respecting web analytics tracking site visits without cross-domain commercial data sale.'
  }
];

/**
 * Classifies a cookie based on its name, value, and origin.
 */
export function classifyCookie(name: string, value: string, domain: string): {
  category: CookieCategory;
  risk: CookieRisk;
  provider: string;
  purpose: string;
} {
  const cleanName = name.trim();
  for (const def of COOKIE_KNOWLEDGE_BASE) {
    if (def.pattern.test(cleanName)) {
      return {
        category: def.category,
        risk: def.risk,
        provider: def.provider,
        purpose: def.purpose
      };
    }
  }

  // Heuristics for unknown cookies
  const lower = cleanName.toLowerCase();
  if (lower.includes('token') || lower.includes('auth') || lower.includes('id') && cleanName.length > 20) {
    return {
      category: 'ESSENTIAL',
      risk: 'LOW',
      provider: domain,
      purpose: 'Identifier or authorization token used by the site to maintain state or verify requests.'
    };
  }
  if (lower.includes('lang') || lower.includes('theme') || lower.includes('pref') || lower.includes('mode')) {
    return {
      category: 'FUNCTIONAL',
      risk: 'LOW',
      provider: domain,
      purpose: 'Remembers user preferences such as display language, color scheme, or localization.'
    };
  }
  if (lower.includes('track') || lower.includes('ad') || lower.includes('pixel')) {
    return {
      category: 'MARKETING',
      risk: 'HIGH',
      provider: domain,
      purpose: 'Likely advertising or behavioral tracking identifier.'
    };
  }

  return {
    category: 'UNKNOWN',
    risk: 'LOW',
    provider: domain,
    purpose: 'First-party cookie set by this domain for site functionality or internal preferences.'
  };
}

/**
 * Parse document.cookie string into structured DetailedCookie array.
 */
export function parseDocumentCookies(cookieStr: string, currentDomain: string): DetailedCookie[] {
  if (!cookieStr || !cookieStr.trim()) return [];

  const pairs = cookieStr.split(';');
  const results: DetailedCookie[] = [];

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const splitIdx = trimmed.indexOf('=');
    const name = splitIdx > -1 ? trimmed.substring(0, splitIdx).trim() : trimmed;
    const value = splitIdx > -1 ? trimmed.substring(splitIdx + 1).trim() : '';

    const classification = classifyCookie(name, value, currentDomain);

    results.push({
      name,
      value: value.length > 40 ? value.substring(0, 37) + '...' : value,
      domain: currentDomain,
      path: '/',
      category: classification.category,
      risk: classification.risk,
      provider: classification.provider,
      purpose: classification.purpose,
      session: true,
      secure: typeof window !== 'undefined' && window.location ? window.location.protocol === 'https:' : true,
      expiryText: 'Session'
    });
  }

  return results;
}

export interface CookieSummary {
  headline: string;
  verdict: 'SAFE' | 'CAUTION' | 'TRACKED';
  verdictText: string;
  essentialCount: number;
  functionalCount: number;
  marketingCount: number;
  analyticsCount: number;
  unknownCount: number;
  bulletPoints: string[];
}

/**
 * Summarizes cookies in plain, simple everyday language for normal people.
 */
export function generateCookieSummary(cookies: DetailedCookie[], domain: string): CookieSummary {
  const marketing = cookies.filter(c => c.category === 'MARKETING');
  const analytics = cookies.filter(c => c.category === 'ANALYTICS');
  const essential = cookies.filter(c => c.category === 'ESSENTIAL');
  const functional = cookies.filter(c => c.category === 'FUNCTIONAL');
  const unknown = cookies.filter(c => c.category === 'UNKNOWN');

  let verdict: 'SAFE' | 'CAUTION' | 'TRACKED' = 'SAFE';
  let verdictText = '';
  let headline = '';

  if (marketing.length > 0) {
    verdict = 'TRACKED';
    headline = `Ad Tracking Detected`;
    const topTrackers = marketing.map(m => m.name).slice(0, 2).join(', ');
    verdictText = `This site uses ${marketing.length} ad tracker${marketing.length > 1 ? 's' : ''} (${topTrackers}) to follow what you do and show you targeted ads across the web.`;
  } else if (analytics.length > 0) {
    verdict = 'CAUTION';
    headline = `Visitor Stats Recorded`;
    verdictText = `This site counts page views to see what content is popular, but isn't following you with cross-site ad trackers.`;
  } else {
    verdict = 'SAFE';
    headline = `Clean & Essential Only`;
    verdictText = `Only essential cookies are present to keep the site working safely (like keeping you logged in). No advertising trackers!`;
  }

  const bulletPoints: string[] = [];
  if (essential.length > 0) {
    bulletPoints.push(`${essential.length} safe cookie${essential.length > 1 ? 's' : ''} to keep you logged in and protect your account.`);
  }
  if (functional.length > 0) {
    bulletPoints.push(`${functional.length} setting${functional.length > 1 ? 's' : ''} to remember your preferences (like dark mode or language).`);
  }
  if (marketing.length > 0) {
    bulletPoints.push(`${marketing.length} ad tracker${marketing.length > 1 ? 's' : ''} watching your activity to profile you for advertising.`);
  }
  if (analytics.length > 0) {
    bulletPoints.push(`${analytics.length} analytics counter${analytics.length > 1 ? 's' : ''} measuring page traffic.`);
  }

  return {
    headline,
    verdict,
    verdictText,
    essentialCount: essential.length,
    functionalCount: functional.length,
    marketingCount: marketing.length,
    analyticsCount: analytics.length,
    unknownCount: unknown.length,
    bulletPoints
  };
}
