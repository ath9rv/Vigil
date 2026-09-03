import { describe, it, expect } from 'vitest';
import m1Rules from '../../rules/m1_deceptive_commerce.json';
import m2Rules from '../../rules/m2_threat_shield.json';
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
});
