/**
 * Vigil Domain Intelligence
 * 
 * Centralized authority for host and domain relationship semantics.
 * Replaces ad-hoc string matching (like `.endsWith()`) with strict
 * registrable domain parsing.
 */

// A lightweight heuristic list of multi-part public suffixes for the fallback parser.
// In MV3 with Chrome 153+, chrome.publicSuffix could be used, but this fallback
// ensures deterministic correctness for common TLDs across all browser targets.
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'co.nz', 'net.nz', 'org.nz', 'ac.nz', 'govt.nz',
  'co.in', 'net.in', 'org.in', 'ac.in', 'gov.in',
  'co.za', 'net.za', 'org.za', 'ac.za', 'gov.za',
  'com.br', 'net.br', 'org.br', 'edu.br', 'gov.br'
]);

export type HostRelationship = 'SAME_HOST' | 'SAME_SITE' | 'CROSS_SITE' | 'UNKNOWN' | 'INVALID';

/**
 * Normalizes a URL or hostname string into a clean lowercase hostname without ports.
 */
export function normalizeHostname(input: string): string {
  if (!input) return '';
  try {
    // If it's a full URL, parse it
    if (input.includes('://')) {
      return new URL(input).hostname.toLowerCase();
    }
    // If it's just a host/port, extract hostname
    const host = input.split(':')[0].toLowerCase();
    // Clean up trailing dots (FQDNs)
    return host.endsWith('.') ? host.slice(0, -1) : host;
  } catch {
    return '';
  }
}

/**
 * Extracts the registrable domain (eTLD+1) from a hostname.
 * e.g., 'shop.amazon.com' -> 'amazon.com'
 * e.g., 'www.bbc.co.uk' -> 'bbc.co.uk'
 */
export function getRegistrableDomain(hostname: string): string {
  const host = normalizeHostname(hostname);
  if (!host) return '';

  // Handle IPs
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) {
    return host;
  }
  if (host === 'localhost') return host;

  const parts = host.split('.');
  if (parts.length <= 1) return host;
  if (parts.length === 2) return host;

  // Check against our heuristic multi-part TLDs
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (MULTI_PART_SUFFIXES.has(lastTwo)) {
    if (parts.length >= 3) {
      return `${parts[parts.length - 3]}.${lastTwo}`;
    }
    return lastTwo;
  }

  // Standard fallback (assume 1-part TLD like .com, .org, .io)
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

/**
 * Determines the strict relationship between two hosts.
 */
export function getHostRelationship(hostA: string, hostB: string): HostRelationship {
  try {
    const cleanA = normalizeHostname(hostA);
    const cleanB = normalizeHostname(hostB);

    if (!cleanA || !cleanB) return 'INVALID';
    if (cleanA.includes(' ') || cleanB.includes(' ')) return 'INVALID';
    
    if (cleanA === cleanB) return 'SAME_HOST';

    const regA = getRegistrableDomain(cleanA);
    const regB = getRegistrableDomain(cleanB);

    if (regA && regB && regA === regB) return 'SAME_SITE';

    return 'CROSS_SITE';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Convenience method for credential detectors and strict policies.
 */
export function isSameOrigin(hostA: string, hostB: string): boolean {
  return getHostRelationship(hostA, hostB) === 'SAME_HOST';
}

/**
 * Convenience method for cookie and consent detectors.
 */
export function isSameSite(hostA: string, hostB: string): boolean {
  const rel = getHostRelationship(hostA, hostB);
  return rel === 'SAME_HOST' || rel === 'SAME_SITE';
}

/**
 * Convenience method for tracker detectors.
 */
export function isCrossSite(hostA: string, hostB: string): boolean {
  return getHostRelationship(hostA, hostB) === 'CROSS_SITE';
}
