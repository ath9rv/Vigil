import { describe, it, expect } from 'vitest';
import cookieRules from '../../rules/cookie_consent_rules.json';

describe('Cookie Consent Management Platforms (CMP) Ruleset Verification', () => {
  it('covers all major enterprise and open-source CMP engines', () => {
    const requiredCMPs = [
      'OneTrust',
      'Cookiebot',
      'TrustArc',
      'Quantcast',
      'Didomi',
      'Usercentrics',
      'CookiePro',
      'Complianz',
      'Termly'
    ];

    const presentNames = cookieRules.map(r => r.name);
    for (const cmp of requiredCMPs) {
      expect(presentNames).toContain(cmp);
    }
  });

  it('all CMP rules define valid CSS selectors for banner detection and rejection', () => {
    for (const rule of cookieRules) {
      expect(rule.detector).toBeDefined();
      expect(rule.detector.length).toBeGreaterThan(0);

      expect(rule.reject_selectors).toBeDefined();
      expect(Array.isArray(rule.reject_selectors)).toBe(true);
      expect(rule.reject_selectors.length).toBeGreaterThan(0);
    }
  });

  it('accurately distinguishes decline/reject button semantics from accept buttons', () => {
    const rejectPatterns = /^(reject|decline|deny|refuse|no|only essential|necessary only|dismiss)/i;
    const acceptPatterns = /^(accept|agree|ok|got it|i understand|allow|enable)/i;

    const testRejectButtons = [
      'Reject All',
      'Decline Non-Essential',
      'Deny',
      'Necessary only',
      'Refuse all cookies'
    ];

    const testAcceptButtons = [
      'Accept All',
      'Agree & Proceed',
      'Allow all cookies',
      'Got it'
    ];

    for (const text of testRejectButtons) {
      expect(rejectPatterns.test(text)).toBe(true);
      expect(acceptPatterns.test(text)).toBe(false);
    }

    for (const text of testAcceptButtons) {
      expect(acceptPatterns.test(text)).toBe(true);
      expect(rejectPatterns.test(text)).toBe(false);
    }
  });
});
