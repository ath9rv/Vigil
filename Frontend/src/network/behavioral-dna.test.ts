import { describe, it, expect, beforeEach } from 'vitest';
import { 
  calculateShannonEntropy, 
  detectCharsetProfile, 
  extractCookieDNA 
} from './behavioral-dna';
import { scoreCookieBehavior } from './behavioral-scorer';
import { recordCookieObservation, getAllLearnedSignatures } from './behavioral-store';

describe('Vigil V3 — Behavioral DNA & Explainable Scoring Engine', () => {
  let storageMock: Record<string, any> = {};

  beforeEach(() => {
    storageMock = {};
    (globalThis as any).chrome = {
      runtime: { id: 'vigil-test-id' },
      storage: {
        local: {
          get: async (key: string | null) => {
            if (key === null) return storageMock;
            if (typeof key === 'string') return { [key]: storageMock[key] };
            return {};
          },
          set: async (obj: Record<string, any>) => {
            Object.assign(storageMock, obj);
          },
          clear: async () => {
            storageMock = {};
          }
        }
      }
    };
  });

  describe('1. Shannon Entropy Mathematical Soundness', () => {
    it('returns 0 for empty or homogeneous single-character strings', () => {
      expect(calculateShannonEntropy('')).toBe(0);
      expect(calculateShannonEntropy('aaaaaaa')).toBe(0);
      expect(calculateShannonEntropy('11111111')).toBe(0);
    });

    it('accurately computes entropy for binary and multi-symbol strings', () => {
      // 50% 0s and 50% 1s has theoretical entropy of 1.0 bit
      expect(calculateShannonEntropy('01010101')).toBe(1);

      // 4 equally probable characters (a, b, c, d) has theoretical entropy of 2.0 bits
      expect(calculateShannonEntropy('abcdabcd')).toBe(2);
    });

    it('identifies high entropy in realistic tracking hashes and tokens', () => {
      const hexUuid = '4f9a3c2b-81e0-4781-9dfc-112c8ab12345';
      const entropy = calculateShannonEntropy(hexUuid);
      expect(entropy).toBeGreaterThan(3.5);

      const base64RandomToken = 'dGhpcyBpcyBhIHNhbXBsZSByYW5kb20gdHJhY2tpbmcgdG9rZW4=';
      expect(calculateShannonEntropy(base64RandomToken)).toBeGreaterThan(4.0);
    });
  });

  describe('2. Charset & Morphology Profiling', () => {
    it('accurately identifies UUIDs, JWTs, and structured tokens', () => {
      expect(detectCharsetProfile('c4adf9c6-8d24-4fef-b03d-9ffec0eb121c')).toBe('uuid');
      expect(detectCharsetProfile('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG6x8mQ0y')).toBe('jwt');
      expect(detectCharsetProfile('900fd65a2d4dcd319311dfa3d28271204674ef99')).toBe('hex');
      expect(detectCharsetProfile('1788468357209')).toBe('numeric');
      expect(detectCharsetProfile('v=1&t=event&cid=555')).toBe('structured');
      expect(detectCharsetProfile('dark_mode')).toBe('human_readable');
    });
  });

  describe('3. False Positive Prevention (Authentication Safeguards)', () => {
    it('ensures high-entropy, long-lived server-side authentication tokens are rated BENIGN', () => {
      // Even with 365-day persistence and high entropy, HttpOnly + SameSite=Strict + Auth semantics
      // must trigger safeguard dampeners and remain safely in the BENIGN band.
      const authDna = extractCookieDNA({
        name: 'auth_token',
        value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG6x8mQ0y',
        domain: 'example.com',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        session: false,
        expirationDate: Date.now() / 1000 + (365 * 24 * 3600) // 1 year
      }, {
        activeDomain: 'example.com',
        crossSiteCount: 1,
        beaconCorrelated: false
      });

      const scored = scoreCookieBehavior(authDna);

      expect(scored.category).toBe('benign');
      expect(scored.score).toBeLessThanOrEqual(30);
      expect(scored.reasons.some(r => r.includes('HttpOnly'))).toBe(true);
      expect(scored.reasons.some(r => r.includes('JWT') || r.includes('Authentication'))).toBe(true);
    });

    it('dampens session-only CSRF tokens to BENIGN', () => {
      const csrfDna = extractCookieDNA({
        name: 'csrftoken',
        value: 'a1b2c3d4e5f678901234567890abcdef',
        domain: 'bank.com',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        session: true
      }, {
        activeDomain: 'bank.com'
      });

      const scored = scoreCookieBehavior(csrfDna);
      expect(scored.category).toBe('benign');
      expect(scored.score).toBeLessThanOrEqual(25);
    });
  });

  describe('4. Explainable Tracking Identifier Detection', () => {
    it('flags persistent, third-party, client-accessible tracking identifiers with transparent reasons', () => {
      const trackerDna = extractCookieDNA({
        name: 'uid_sync',
        value: '4f9a3c2b-81e0-4781-9dfc-112c8ab12345',
        domain: '.adnetwork.net',
        httpOnly: false, // Accessible to JavaScript
        secure: true,
        sameSite: 'none',
        session: false,
        expirationDate: Date.now() / 1000 + (730 * 24 * 3600) // 2 years
      }, {
        activeDomain: 'shopping-site.com',
        crossSiteCount: 4,
        beaconCorrelated: true
      });

      const scored = scoreCookieBehavior(trackerDna);

      expect(scored.category).toBe('high_risk_tracker');
      expect(scored.score).toBeGreaterThanOrEqual(80);
      expect(scored.reasons.some(r => r.includes('Third-party'))).toBe(true);
      expect(scored.reasons.some(r => r.includes('Client-accessible'))).toBe(true);
      expect(scored.reasons.some(r => r.includes('recurring across 4'))).toBe(true);
      expect(scored.reasons.some(r => r.includes('analytics/telemetry'))).toBe(true);
    });
  });

  describe('5. Zero-Secret Evidence Store', () => {
    it('stores ONLY derived fingerprints and never leaks raw cookie values into persistent storage', async () => {
      const secretValue = 'SECRET_BANK_CREDENTIAL_XYZ_98765';
      const dna = extractCookieDNA({
        name: 'session_key',
        value: secretValue,
        domain: 'bank.com',
        httpOnly: true,
        session: true
      }, { activeDomain: 'bank.com' });

      const scored = scoreCookieBehavior(dna);
      await recordCookieObservation('session_key', 'bank.com', scored, 'https://bank.com');

      const signatures = await getAllLearnedSignatures();
      const savedSig = signatures['session_key'];

      expect(savedSig).toBeDefined();
      expect(savedSig.entropy).toBe(scored.entropy);
      expect(savedSig.score).toBe(scored.score);

      // Verify raw secret value does NOT exist anywhere in the saved signature JSON
      const serialized = JSON.stringify(signatures);
      expect(serialized).not.toContain(secretValue);
    });
  });

  describe('6. Extreme Lifecycle & Cross-Site Observation Scaling', () => {
    it('elevates tracking score monotonically as identifier recurs across more distinct websites', () => {
      const baseCookie = {
        name: 'cross_net_uid',
        value: '4f9a3c2b-81e0-4781-9dfc-112c8ab12345',
        domain: '.trackernet.com',
        httpOnly: false,
        session: false,
        expirationDate: Date.now() / 1000 + (365 * 24 * 3600)
      };

      const dna1Site = extractCookieDNA(baseCookie, { activeDomain: 'store1.com', crossSiteCount: 1 });
      const dna3Sites = extractCookieDNA(baseCookie, { activeDomain: 'store2.com', crossSiteCount: 3 });
      const dna10Sites = extractCookieDNA(baseCookie, { activeDomain: 'store3.com', crossSiteCount: 10 });

      const score1 = scoreCookieBehavior(dna1Site).score;
      const score3 = scoreCookieBehavior(dna3Sites).score;
      const score10 = scoreCookieBehavior(dna10Sites).score;

      expect(score3).toBeGreaterThan(score1);
      expect(score10).toBeGreaterThanOrEqual(score3);
    });

    it('penalizes extreme persistent lifespans (>5 years)', () => {
      const extremeCookie = extractCookieDNA({
        name: 'super_cookie',
        value: '9a8b7c6d5e4f3a2b1c',
        domain: '.ads.com',
        session: false,
        expirationDate: Date.now() / 1000 + (10 * 365 * 24 * 3600) // 10 years!
      }, { activeDomain: 'news.com' });

      expect(extremeCookie.lifespanDays).toBeGreaterThan(3600);
      const scored = scoreCookieBehavior(extremeCookie);
      expect(scored.reasons.some(r => r.includes('Long-term persistence'))).toBe(true);
    });
  });
});
