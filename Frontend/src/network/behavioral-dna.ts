/**
 * Vigil V3 — Behavioral DNA Feature Extraction Engine
 * 
 * Computes structural, cryptographic, and runtime characteristics of cookies:
 * - Shannon Entropy (bits/byte)
 * - Charset Profiling (UUID, JWT, Base64, Hex, Alphanumeric, Human-readable)
 * - Temporal Lifespan & Persistence
 * - Security & Scoping Posture (HttpOnly, Secure, SameSite, Third-Party)
 */

import { isSameSite } from '../shared/domain-intelligence';

export type CharsetProfile = 
  | 'uuid'
  | 'jwt'
  | 'hex'
  | 'base64'
  | 'alphanumeric'
  | 'numeric'
  | 'structured'
  | 'human_readable';

export interface RawCookieInput {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  session?: boolean;
  expirationDate?: number;
}

export interface RuntimeContext {
  activeDomain?: string;
  crossSiteCount?: number;
  beaconCorrelated?: boolean;
  knownTracker?: boolean;
}

export interface CookieBehavioralDNA {
  name: string;
  value: string;
  domain: string;
  entropy: number;
  length: number;
  charsetProfile: CharsetProfile;
  lifespanDays: number;
  isPersistent: boolean;
  isHttpOnly: boolean;
  isSecure: boolean;
  sameSite: 'strict' | 'lax' | 'none' | 'unspecified';
  isThirdParty: boolean;
  crossSiteCount: number;
  beaconCorrelated: boolean;
  knownTracker: boolean;
}

/**
 * Calculates the Shannon Entropy of a string in bits per byte.
 * Maximum entropy for typical ASCII strings is ~6.0–8.0 bits/byte.
 * Highly random UUIDs / tracking tokens typically have entropy >= 3.8.
 * Single repeated characters have entropy = 0.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;

  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  // Return rounded to 2 decimal places
  return Math.round(entropy * 100) / 100;
}

/**
 * Classifies string morphology into specific encoding and format patterns.
 */
export function detectCharsetProfile(value: string): CharsetProfile {
  if (!value || value.length === 0) return 'human_readable';

  const trimmed = value.trim();

  // 1. JSON Web Token (JWT) format: header.payload.signature
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    return 'jwt';
  }

  // 2. Canonical UUID / GUID (8-4-4-4-12)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
    return 'uuid';
  }

  // 3. Hexadecimal hash (MD5, SHA, raw hex tokens)
  if (/^[0-9a-fA-F]{16,}$/.test(trimmed)) {
    return 'hex';
  }

  // 4. Base64 encoded string
  if (/^[A-Za-z0-9+/=]{16,}$/.test(trimmed) && trimmed.length % 4 === 0) {
    return 'base64';
  }

  // 5. Numeric identifier / timestamp
  if (/^\d+$/.test(trimmed)) {
    return 'numeric';
  }

  // 6. Delimited structured telemetry string (e.g. key:val|time:val or v=1&t=2)
  if (/[:|&][A-Za-z0-9_-]+/.test(trimmed)) {
    return 'structured';
  }

  // 7. Alphanumeric random token
  if (/^[A-Za-z0-9_-]{12,}$/.test(trimmed)) {
    return 'alphanumeric';
  }

  return 'human_readable';
}

/**
 * Computes remaining lifespan in days from expiration timestamp.
 */
export function calculateLifespanDays(cookie: RawCookieInput): number {
  if (cookie.session || !cookie.expirationDate) {
    return 0;
  }

  const nowMs = Date.now();
  const expireMs = cookie.expirationDate > 1e11 ? cookie.expirationDate : cookie.expirationDate * 1000;
  const diffDays = (expireMs - nowMs) / (1000 * 60 * 60 * 24);

  return Math.max(0, Math.round(diffDays));
}

/**
 * Normalizes SameSite attribute into standard enum.
 */
export function normalizeSameSite(raw?: string): 'strict' | 'lax' | 'none' | 'unspecified' {
  if (!raw) return 'unspecified';
  const lower = raw.toLowerCase();
  if (lower === 'strict') return 'strict';
  if (lower === 'lax') return 'lax';
  if (lower === 'no_restriction' || lower === 'none') return 'none';
  return 'unspecified';
}

/**
 * Determines whether a cookie domain is third-party relative to the active page origin.
 */
export function isThirdPartyDomain(cookieDomain: string, activeDomain?: string): boolean {
  if (!activeDomain || !cookieDomain) return false;

  const cleanCookieDomain = cookieDomain.replace(/^\./, '').toLowerCase();
  const cleanActiveDomain = activeDomain.replace(/^www\./, '').toLowerCase();

  // If activeDomain ends with cookieDomain, it is first-party (e.g. sub.amazon.in on amazon.in)
  if (isSameSite(cleanActiveDomain, cleanCookieDomain)) {
    return false;
  }

  return true;
}

/**
 * Extracts comprehensive Behavioral DNA features from a raw cookie and runtime context.
 */
export function extractCookieDNA(
  cookie: RawCookieInput,
  context: RuntimeContext = {}
): CookieBehavioralDNA {
  const entropy = calculateShannonEntropy(cookie.value);
  const length = (cookie.value || '').length;
  const charsetProfile = detectCharsetProfile(cookie.value);
  const lifespanDays = calculateLifespanDays(cookie);
  const isPersistent = !cookie.session && lifespanDays > 0;
  const isHttpOnly = Boolean(cookie.httpOnly);
  const isSecure = Boolean(cookie.secure);
  const sameSite = normalizeSameSite(cookie.sameSite);
  const isThirdParty = isThirdPartyDomain(cookie.domain, context.activeDomain);
  const crossSiteCount = context.crossSiteCount || 1;
  const beaconCorrelated = Boolean(context.beaconCorrelated);
  const knownTracker = Boolean(context.knownTracker);

  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    entropy,
    length,
    charsetProfile,
    lifespanDays,
    isPersistent,
    isHttpOnly,
    isSecure,
    sameSite,
    isThirdParty,
    crossSiteCount,
    beaconCorrelated,
    knownTracker
  };
}
