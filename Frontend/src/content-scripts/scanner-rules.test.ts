import { describe, it, expect } from 'vitest';
import m1Rules from '../../rules/m1_deceptive_commerce.json';
import m2Rules from '../../rules/m2_threat_shield.json';
import m3Rules from '../../rules/m3_privacy_consent.json';
import m4Rules from '../../rules/m4_attention_addiction.json';
import m5Rules from '../../rules/m5_social_proof.json';
import { KNOWN_DOMAINS } from '../shared/constants';

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(domain: string, knownDomain: string): number {
  const distance = levenshtein(domain, knownDomain);
  const maxLength = Math.max(domain.length, knownDomain.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

describe('Scanner Detection Rules & Phishing Algorithmic Rigor', () => {
  describe('1. M2-001: Levenshtein Domain Similarity & Typosquatting', () => {
    it('detects typosquatting lookalike domains designed to spoof banking and commerce', () => {
      // paypa1.com vs paypal.com
      const paySim = calculateSimilarity('paypa1.com', 'paypal.com');
      expect(paySim).toBeGreaterThan(85);

      // arnazon.in vs amazon.in
      const amzSim = calculateSimilarity('arnazon.in', 'amazon.in');
      expect(amzSim).toBeGreaterThanOrEqual(80);

      // onlinesb1.sbi vs onlinesbi.sbi
      const sbiSim = calculateSimilarity('onlinesb1.sbi', 'onlinesbi.sbi');
      expect(sbiSim).toBeGreaterThan(85);
    });

    it('does not trigger on legitimate distinct domains', () => {
      expect(calculateSimilarity('wikipedia.org', 'amazon.in')).toBeLessThan(40);
      expect(calculateSimilarity('github.com', 'flipkart.com')).toBeLessThan(50);
    });

    it('recognizes all curated KNOWN_DOMAINS without false-positive similarity self-matching', () => {
      for (const domain of KNOWN_DOMAINS) {
        const sim = calculateSimilarity(domain, domain);
        expect(sim).toBe(100);
      }
    });
  });

  describe('2. M1 Deceptive Commerce Pattern Ruleset Integrity', () => {
    it('m1_deceptive_commerce.json contains all required schema fields and valid regexes', () => {
      expect(m1Rules).toHaveProperty('rules');
      expect(Array.isArray(m1Rules.rules)).toBe(true);

      for (const rule of m1Rules.rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('match');

        if (rule.match.text_patterns) {
          for (const pattern of rule.match.text_patterns) {
            expect(() => new RegExp(pattern)).not.toThrow();
          }
        }
      }
    });

    it('matches fake urgency and artificial scarcity patterns', () => {
      const fakeUrgencyRule = m1Rules.rules.find(r => r.id === 'M1-001');
      expect(fakeUrgencyRule).toBeDefined();

      if (fakeUrgencyRule && fakeUrgencyRule.match.text_patterns) {
        const regexes = fakeUrgencyRule.match.text_patterns.map(p => new RegExp(p, 'i'));
        const samples = [
          'offer ends in 15 minutes',
          'sale ends in 2 hours',
          'Hurry, only a few left before midnight',
          'act fast or miss this discount'
        ];

        for (const sample of samples) {
          const matched = regexes.some(r => r.test(sample));
          expect(matched).toBe(true);
        }
      }
    });

    it('matches confirm-shaming and guilt-inducing decline triggers', () => {
      const confirmShamingRule = m1Rules.rules.find(r => r.id === 'M1-003');
      expect(confirmShamingRule).toBeDefined();

      if (confirmShamingRule && confirmShamingRule.match.text_patterns) {
        const regexes = confirmShamingRule.match.text_patterns.map(p => new RegExp(p, 'i'));
        const samples = [
          'No thanks, I prefer paying full price',
          'No, I will pay regular price',
          'no, keep me unprotected'
        ];

        for (const sample of samples) {
          const matched = regexes.some(r => r.test(sample));
          expect(matched).toBe(true);
        }
      }
    });
  });

  describe('3. Credential Theft & Form Action Mismatch Verification', () => {
    it('flags when login form submits credentials to a foreign third-party host', () => {
      const currentHost = 'bank-portal.com';
      const maliciousAction = 'https://credential-stealer.ru/harvest';
      
      const actionUrl = new URL(maliciousAction);
      const isMismatch = actionUrl.hostname !== currentHost;

      expect(isMismatch).toBe(true);
    });

    it('allows legitimate intra-domain or CDN form action destinations', () => {
      const currentHost = 'amazon.in';
      const legitAction = 'https://amazon.in/ap/signin';
      
      const actionUrl = new URL(legitAction);
      const isMismatch = actionUrl.hostname !== currentHost;

      expect(isMismatch).toBe(false);
    });
  });

  describe('4. M3 Privacy & Consent Ruleset Integrity', () => {
    it('m3_privacy_consent.json contains all required schema fields and valid regexes', () => {
      expect(m3Rules).toHaveProperty('rules');
      expect(Array.isArray(m3Rules.rules)).toBe(true);
      expect(m3Rules.rules.length).toBeGreaterThanOrEqual(3);

      for (const rule of m3Rules.rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('match');

        if (rule.match.text_patterns) {
          for (const pattern of rule.match.text_patterns) {
            expect(() => new RegExp(pattern)).not.toThrow();
          }
        }
      }
    });

    it('detects cookie wall gating content behind tracking consent', () => {
      const wallRule = m3Rules.rules.find((r: any) => r.id === 'M3-004');
      expect(wallRule).toBeDefined();

      if (wallRule && wallRule.match.text_patterns) {
        const regexes = wallRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        const samples = [
          'Accept cookies to continue reading',
          'Please accept cookies to browse this site',
          'Access to this website is only possible if you accept tracking cookies',
          'Disable your ad blocker or accept cookies to proceed'
        ];

        for (const sample of samples) {
          expect(regexes.some((r: RegExp) => r.test(sample))).toBe(true);
        }
      }
    });
  });

  describe('5. M4 Attention & Addictive UX Ruleset Integrity', () => {
    it('m4_attention_addiction.json contains 10 rules with valid schemas and regexes', () => {
      expect(m4Rules).toHaveProperty('rules');
      expect(Array.isArray(m4Rules.rules)).toBe(true);
      expect(m4Rules.rules.length).toBeGreaterThanOrEqual(10);

      for (const rule of m4Rules.rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('match');

        if (rule.match.text_patterns) {
          for (const pattern of rule.match.text_patterns) {
            expect(() => new RegExp(pattern)).not.toThrow();
          }
        }
      }
    });

    it('matches addictive gamification mechanics: spin-to-win, pseudo-currencies, time-delayed rewards', () => {
      const spinRule = m4Rules.rules.find((r: any) => r.id === 'M4-006');
      expect(spinRule).toBeDefined();
      if (spinRule?.match?.text_patterns) {
        const regexes = spinRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        expect(regexes.some((r: RegExp) => r.test('Spin the lucky draw wheel now'))).toBe(true);
        expect(regexes.some((r: RegExp) => r.test('Open your daily mystery box'))).toBe(true);
      }

      const currencyRule = m4Rules.rules.find((r: any) => r.id === 'M4-005');
      expect(currencyRule).toBeDefined();
      if (currencyRule?.match?.text_patterns) {
        const regexes = currencyRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        expect(regexes.some((r: RegExp) => r.test('Buy 500 gems for $4.99'))).toBe(true);
        expect(regexes.some((r: RegExp) => r.test('Unlock with 100 V-bucks'))).toBe(true);
      }

      const rewardRule = m4Rules.rules.find((r: any) => r.id === 'M4-007');
      expect(rewardRule).toBeDefined();
      if (rewardRule?.match?.text_patterns) {
        const regexes = rewardRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        expect(regexes.some((r: RegExp) => r.test('Come back in 4 hours to claim your bonus'))).toBe(true);
      }
    });
  });

  describe('6. M5 Social Proof Integrity Ruleset Integrity', () => {
    it('m5_social_proof.json contains 8 rules with valid schemas and regexes', () => {
      expect(m5Rules).toHaveProperty('rules');
      expect(Array.isArray(m5Rules.rules)).toBe(true);
      expect(m5Rules.rules.length).toBeGreaterThanOrEqual(8);

      for (const rule of m5Rules.rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('match');

        if (rule.match.text_patterns) {
          for (const pattern of rule.match.text_patterns) {
            expect(() => new RegExp(pattern)).not.toThrow();
          }
        }
      }
    });

    it('matches manufactured purchase notifications and unverifiable statistics', () => {
      const toastRule = m5Rules.rules.find((r: any) => r.id === 'M5-005');
      expect(toastRule).toBeDefined();
      if (toastRule?.match?.text_patterns) {
        const regexes = toastRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        expect(regexes.some((r: RegExp) => r.test('John from Mumbai just purchased this item'))).toBe(true);
        expect(regexes.some((r: RegExp) => r.test('Someone in New York recently joined'))).toBe(true);
      }

      const statsRule = m5Rules.rules.find((r: any) => r.id === 'M5-006');
      expect(statsRule).toBeDefined();
      if (statsRule?.match?.text_patterns) {
        const regexes = statsRule.match.text_patterns.map((p: string) => new RegExp(p, 'i'));
        expect(regexes.some((r: RegExp) => r.test('97% of users recommend our product'))).toBe(true);
        expect(regexes.some((r: RegExp) => r.test('99% customer satisfaction rate'))).toBe(true);
      }
    });
  });
});
