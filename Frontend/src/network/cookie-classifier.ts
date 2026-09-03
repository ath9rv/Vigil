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
  },

  // ─── Amazon & AWS Ecosystem ───────────────────────────────────────────────
  {
    pattern: /^csm-hit$/i,
    category: 'ANALYTICS',
    risk: 'LOW',
    provider: 'Amazon Client-Side Metrics (CSM)',
    purpose: 'Amazon performance monitoring cookie. Measures page load speed, latency, render timing, and interaction telemetry to maintain high website availability.'
  },
  {
    pattern: /^session-id$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Primary shopping session identifier linking your page views, shopping cart contents, and search queries across Amazon.'
  },
  {
    pattern: /^session-id-time$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Amazon session creation timestamp used to validate active session duration and prevent session hijacking or replay attacks.'
  },
  {
    pattern: /^session-token$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Encrypted cryptographic authorization token verifying your signed-in customer account session.'
  },
  {
    pattern: /^ubid-(main|acbin|tacb|[a-z0-9]+)$/i,
    category: 'FUNCTIONAL',
    risk: 'MEDIUM',
    provider: 'Amazon Unique Browser ID',
    purpose: 'Amazon Unique Browser ID (UBID). Persists across visits to recognize your device, preserve shopping cart state, and detect fraudulent account activity.'
  },
  {
    pattern: /^at-(main|acbin|[a-z0-9]+)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Amazon customer authentication verification token required for account access and one-click purchasing.'
  },
  {
    pattern: /^x-(main|acbin|wl-uid)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Amazon cross-site routing and wishlist identifier maintaining your shopping preferences across regional domains.'
  },
  {
    pattern: /^(i18n-prefs|lc-(main|acbin|[a-z0-9]+))$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Remembers localization preferences including shopping currency (e.g. INR/USD), language, and delivery region.'
  },
  {
    pattern: /^sp-cdn$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon CloudFront CDN',
    purpose: 'Routes content delivery requests to the closest Amazon edge server to accelerate product image and page loading.'
  },
  {
    pattern: /^skin$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Remembers user interface styling preferences and responsive design layout modes.'
  },
  {
    pattern: /^appstore-dev-sid$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Amazon',
    purpose: 'Session identifier for Amazon Appstore and Developer Console operations.'
  },

  // ─── Google & YouTube Ecosystem ───────────────────────────────────────────
  {
    pattern: /^(VISITOR_INFO1_LIVE|YSC|GPS)$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'YouTube / Google',
    purpose: 'Measures video streaming bandwidth, playback performance, view counts, and video recommendations.'
  },
  {
    pattern: /^PREF$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'YouTube / Google',
    purpose: 'Remembers playback preferences including volume, autoplay, caption language, and video resolution.'
  },
  {
    pattern: /^(__Secure-)?(3P)?(AP)?(S)?SID$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Google Account',
    purpose: 'Secure authentication cookie verifying your signed-in Google account and protecting against fraudulent sign-ins.'
  },
  {
    pattern: /^(NID|1P_JAR|AEC|OGPC)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Google',
    purpose: 'User profiling and ad targeting cookie remembering search queries to serve personalized advertising.'
  },
  {
    pattern: /^SOCS$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'Google',
    purpose: 'Stores your cookie consent choice regarding Google services and personalized ads.'
  },

  // ─── Twitter / X Ecosystem ────────────────────────────────────────────────
  {
    pattern: /^(guest_id|guest_id_marketing|guest_id_ads)$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Twitter / X',
    purpose: 'Visitor tracking identifier assigned to non-logged-in users to build an ad profile based on viewed tweets.'
  },
  {
    pattern: /^(auth_token|twid)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Twitter / X',
    purpose: 'Authentication key proving your active sign-in status on Twitter / X.'
  },
  {
    pattern: /^ct0$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Twitter / X',
    purpose: 'Cross-Site Request Forgery (CSRF) protection token securing your account against unauthorized actions.'
  },
  {
    pattern: /^personalization_id$/i,
    category: 'MARKETING',
    risk: 'HIGH',
    provider: 'Twitter / X',
    purpose: 'Records visits across external websites embedding Twitter widgets to build ad personalization profiles.'
  },

  // ─── Meta / Facebook / Instagram ──────────────────────────────────────────
  {
    pattern: /^(c_user|xs)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Meta / Facebook',
    purpose: 'Facebook user account ID and encrypted session token maintaining your active login.'
  },
  {
    pattern: /^datr$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Meta / Facebook',
    purpose: 'Browser verification security cookie used to recognize trusted devices and block malicious login takeovers.'
  },
  {
    pattern: /^(sb|wd|dpr)$/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'Meta / Facebook',
    purpose: 'Stores browser window dimensions and device pixel ratio for proper interface scaling.'
  },

  // ─── Shopify & E-Commerce ─────────────────────────────────────────────────
  {
    pattern: /^(_shopify_s|_shopify_y|_shopify_m|_shopify_sa_p|_shopify_sa_t)$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Shopify',
    purpose: 'Shopify store analytics cookie tracking shopping funnel progression, visit duration, and marketing source.'
  },
  {
    pattern: /^(cart|cart_sig|cart_ts|checkout_token)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'E-Commerce Store',
    purpose: 'Stores your shopping cart items, quantities, and checkout state throughout the purchasing flow.'
  },

  // ─── Stripe & PayPal ──────────────────────────────────────────────────────
  {
    pattern: /^__stripe_(mid|sid)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Stripe',
    purpose: 'Fraud prevention and device telemetry cookie required to verify payments securely and prevent credit card fraud.'
  },
  {
    pattern: /^(nsid|ts|ts_c|paypal)$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'PayPal',
    purpose: 'PayPal authentication, transaction verification, and fraud detection cookie for secure payment checkout.'
  },

  // ─── Customer Data & Analytics Platforms ──────────────────────────────────
  {
    pattern: /^(ajs_anonymous_id|ajs_user_id)$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Segment (Twilio)',
    purpose: 'Customer Data Platform (CDP) client identifier tracking user interactions and funnel events.'
  },
  {
    pattern: /^mp_.*_mixpanel$/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Mixpanel',
    purpose: 'Product telemetry cookie tracking feature usage and application event sequences.'
  },
  {
    pattern: /^amplitude_id/i,
    category: 'ANALYTICS',
    risk: 'MEDIUM',
    provider: 'Amplitude',
    purpose: 'Product intelligence cookie tracking user behavior cohorts and feature adoption.'
  },

  // ─── CMS, Frameworks & CDNs ───────────────────────────────────────────────
  {
    pattern: /^wordpress_(logged_in|sec|test_cookie)/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'WordPress',
    purpose: 'WordPress authentication and cookie capability test verification.'
  },
  {
    pattern: /^wp-settings/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'WordPress',
    purpose: 'Customizes the WordPress administrative interface and editor display settings.'
  },
  {
    pattern: /^__next/i,
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: 'Next.js',
    purpose: 'Next.js frontend framework state cookie preserving routing data and hydration state.'
  },
  {
    pattern: /^_cfuvid$/i,
    category: 'ESSENTIAL',
    risk: 'LOW',
    provider: 'Cloudflare',
    purpose: 'Cloudflare rate limiting cookie used to apply Web Application Firewall (WAF) rules per visitor.'
  },
  {
    pattern: /^(aka-cdn|RT)$/i,
    category: 'ANALYTICS',
    risk: 'LOW',
    provider: 'Akamai / Boomerang',
    purpose: 'Real User Monitoring (RUM) measuring page load speed and asset download latency.'
  }
];

/**
 * Classifies a cookie based on its name, value, and origin using an extensive knowledge base
 * and multi-stage semantic heuristics.
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

  // ─── Supercharged Semantic Heuristic Classifier ───────────────────────────
  const lower = cleanName.toLowerCase();

  // 1. Performance & Telemetry (e.g. csm, hit, perf, metric, ping, log, stats)
  if (
    lower.includes('csm') || 
    lower.includes('hit') || 
    lower.includes('metric') || 
    lower.includes('telemetry') || 
    lower.includes('stat') || 
    lower.includes('perf') || 
    lower.includes('event') || 
    lower.includes('ping') || 
    lower.includes('rum') || 
    lower.includes('timing') ||
    lower.includes('speed') ||
    lower.includes('beacon')
  ) {
    return {
      category: 'ANALYTICS',
      risk: 'LOW',
      provider: `${domain} (Telemetry)`,
      purpose: 'Performance and telemetry cookie measuring page load times, click events, or server response latency.'
    };
  }

  // 2. Advertising & Cross-Site Tracking (e.g. track, ad, pixel, campaign, utm, affiliate)
  if (
    lower.includes('track') || 
    lower.includes('ad') || 
    lower.includes('pixel') || 
    lower.includes('campaign') || 
    lower.includes('utm') || 
    lower.includes('affiliate') || 
    lower.includes('retarget') || 
    lower.includes('audience') || 
    lower.includes('bid') || 
    lower.includes('partner') ||
    lower.includes('sync')
  ) {
    return {
      category: 'MARKETING',
      risk: 'HIGH',
      provider: `${domain} (Marketing)`,
      purpose: 'Advertising or cross-site tracking identifier used to profile your browsing behavior and target advertisements.'
    };
  }

  // 3. Essential Session, Security & Checkout (e.g. session, auth, token, csrf, cart, order)
  if (
    lower.includes('token') || 
    lower.includes('auth') || 
    lower.includes('sess') || 
    lower.includes('login') || 
    lower.includes('csrf') || 
    lower.includes('xsrf') || 
    lower.includes('secure') || 
    lower.includes('cart') || 
    lower.includes('basket') || 
    lower.includes('bag') || 
    lower.includes('order') || 
    lower.includes('checkout') || 
    lower.includes('pay') || 
    lower.includes('gate') || 
    (lower.includes('id') && cleanName.length > 15)
  ) {
    return {
      category: 'ESSENTIAL',
      risk: 'LOW',
      provider: `${domain} (Session)`,
      purpose: 'Session security or checkout state cookie maintaining your authenticated status and cart items.'
    };
  }

  // 4. Functional Preferences (e.g. lang, theme, dark, pref, mode, currency)
  if (
    lower.includes('lang') || 
    lower.includes('theme') || 
    lower.includes('pref') || 
    lower.includes('mode') || 
    lower.includes('locale') || 
    lower.includes('curr') || 
    lower.includes('font') || 
    lower.includes('layout') || 
    lower.includes('skin') || 
    lower.includes('view') ||
    lower.includes('dismiss')
  ) {
    return {
      category: 'FUNCTIONAL',
      risk: 'LOW',
      provider: `${domain} (Preferences)`,
      purpose: 'Remembers user display settings, regional language, preferred currency, or interface customization.'
    };
  }

  // 5. General Application Cookie
  return {
    category: 'FUNCTIONAL',
    risk: 'LOW',
    provider: domain,
    purpose: 'First-party application cookie managing site features or internal session state.'
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

/**
 * Returns plain-English explanations of why a cookie is risky or safe for normal people.
 */
export function getPlainEnglishRiskExplanation(category: CookieCategory, risk: CookieRisk, name: string): { title: string; explanation: string; isSafe: boolean } {
  if (category === 'MARKETING' || risk === 'HIGH') {
    return {
      title: '🚨 Why is this risky for you?',
      explanation: 'This cookie tags your browser with a permanent advertising ID. As you browse other websites across the internet, ad networks read this cookie to follow your trail, remembering what jobs, articles, or products you looked at so they can show you targeted ads.',
      isSafe: false
    };
  }
  if (category === 'ESSENTIAL') {
    return {
      title: '🛡️ Why is this safe?',
      explanation: 'This is a completely necessary and harmless cookie. It keeps you securely logged into your account or protects the site from automated bots. It does NOT spy on your personal browsing habits on other sites.',
      isSafe: true
    };
  }
  if (category === 'FUNCTIONAL') {
    return {
      title: '⚙️ What this does for you:',
      explanation: 'This remembers your personal display preferences (like Dark Mode, font size, or language) so the website looks the way you like every time you return.',
      isSafe: true
    };
  }
  if (category === 'ANALYTICS') {
    return {
      title: '📊 What this means for you:',
      explanation: 'This measures general site traffic (such as how many people visited this page or which buttons are popular). It is low-to-medium risk because it generally measures general site usage rather than selling your private identity.',
      isSafe: true
    };
  }
  return {
    title: '❓ Unknown Cookie:',
    explanation: 'This cookie is not yet cataloged in Vigil\'s dictionary. It is set directly by this website, usually for internal website features or temporary session state.',
    isSafe: true
  };
}
