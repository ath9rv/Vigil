import { generateLookupExpressions } from './canonicalize';
import { hashUrl, toBase64, getPrefixBase64 } from './hash';
import { lookupPrefixesLocally, getConfirmationCache } from './local-index';
import { ThreatMatch } from './types';
import { KNOWN_DOMAINS } from '../shared/constants';

// Top brands commonly targeted by phishing campaigns
const SENSITIVE_TARGETS = [
  'paypal', 'google', 'apple', 'microsoft', 'amazon', 'netflix', 'facebook',
  'instagram', 'chase', 'wellsfargo', 'bankofamerica', 'binance', 'coinbase'
];

// Suspicious security / credential-harvesting keyword combinations
const HARVESTING_PATTERNS = [
  /login[-_.]verify/i,
  /account[-_.]security/i,
  /update[-_.]billing/i,
  /secure[-_.]banking/i,
  /auth[-_.]confirm/i,
  /signin[-_.]prompt/i,
  /wallet[-_.]connect/i
];

/**
 * Calculates Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Detects Cyrillic and Greek characters commonly used in Punycode / IDN homograph attacks.
 */
function hasHomographCharacters(str: string): boolean {
  // Cyrillic and Greek characters that visually mirror Latin letters: a, c, e, o, p, s, x, y, i, j
  const homoglyphRegex = /[\u0400-\u04FF\u0370-\u03FF]/;
  return homoglyphRegex.test(str);
}

/**
 * Evaluates URL safety using a 100% offline, deterministic heuristic threat engine.
 * Never transmits candidate URLs or credentials to external services.
 */
export async function evaluateUrlThreat(url: string, isDeepAudit = false): Promise<ThreatMatch> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      status: 'UNKNOWN',
      confidence: 'LOW',
      details: 'Malformed URL could not be parsed.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Layer 1: Punycode & IDN Homograph Attack Detection
  if (hostname.startsWith('xn--') || hasHomographCharacters(hostname)) {
    return {
      status: 'KNOWN_PHISHING',
      source: 'LOCAL_HEURISTIC',
      confidence: 'HIGH',
      details: `Punycode / IDN homograph impersonation detected in hostname: ${hostname}`
    };
  }

  // Layer 2: Typosquatting / Visual Brand Impersonation (Levenshtein Distance)
  // Extract base domain without subdomains (e.g. paypa1.com -> paypa1)
  const hostParts = hostname.split('.');
  const baseName = hostParts.length >= 2 ? hostParts[hostParts.length - 2] : hostname;

  for (const target of SENSITIVE_TARGETS) {
    if (baseName !== target && baseName.includes(target)) {
      // Direct brand-in-subdomain or domain embedding (e.g. paypal-security.xyz)
      for (const pattern of HARVESTING_PATTERNS) {
        if (pattern.test(hostname) || pattern.test(parsed.pathname)) {
          return {
            status: 'KNOWN_PHISHING',
            source: 'LOCAL_HEURISTIC',
            confidence: 'HIGH',
            details: `Credential harvesting pattern matching brand "${target}": ${hostname}`
          };
        }
      }
    }

    const dist = levenshteinDistance(baseName, target);
    if (dist === 1 || (dist === 2 && baseName.length > 5 && !(KNOWN_DOMAINS as readonly string[]).includes(hostname))) {
      return {
        status: 'KNOWN_PHISHING',
        source: 'LOCAL_HEURISTIC',
        confidence: 'HIGH',
        details: `Typosquatting brand impersonation detected. Base domain "${baseName}" is deceptively similar to "${target}" (Levenshtein distance: ${dist}).`
      };
    }
  }

  // Layer 3: Credential Harvesting Keyword Stacking on Unknown Domains
  if (!(KNOWN_DOMAINS as readonly string[]).includes(hostname)) {
    for (const pattern of HARVESTING_PATTERNS) {
      if (pattern.test(hostname) || (isDeepAudit && pattern.test(parsed.pathname))) {
        return {
          status: 'KNOWN_PHISHING',
          source: 'LOCAL_HEURISTIC',
          confidence: 'MEDIUM',
          details: `Suspicious credential harvesting keyword pattern detected on unknown domain: ${hostname}`
        };
      }
    }
  }

  // Layer 4: Local Hash Prefix Database Lookup (from offline feed if loaded)
  const expressions = generateLookupExpressions(url);
  for (const exp of expressions) {
    try {
      const hashBuffer = await hashUrl(exp);
      const prefix4 = getPrefixBase64(hashBuffer, 4);
      const localMatches = await lookupPrefixesLocally([prefix4]);
      if (localMatches.length > 0) {
        return {
          status: 'KNOWN_MALWARE',
          source: 'LOCAL_HEURISTIC',
          confidence: 'MEDIUM',
          details: `URL matched local threat database prefix (${prefix4}).`
        };
      }
    } catch {
      // Continue to next expression if hashing fails
    }
  }

  return {
    status: 'NO_KNOWN_THREAT',
    confidence: 'HIGH',
    details: 'Verified clean against local heuristic threat engine.'
  };
}
