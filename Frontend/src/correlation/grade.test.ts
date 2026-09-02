import { describe, it, expect } from 'vitest';
import { calculatePrivacyGrade } from './grade';

describe('Privacy Grade & Moral Hazard Defense', () => {
  it('should give A+ for clean sites with no trackers or dark patterns', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: false,
      trackersFound: 0,
      trackersBlocked: 0,
      trackerPrevalence: 0,
      tosdrGrade: 'A',
      cookieConsentAutoHandled: false,
      darkPatternsFound: 0,
      phishingRisk: false
    });

    expect(result.verdict).toBe('SAFE');
    expect(result.reputationGrade).toBe('A+');
    expect(result.protectedGrade).toBe('A+');
  });

  it('should strictly cap protected grade at F for phishing sites regardless of tracker blocks', () => {
    // Moral hazard test: A site that is phishing should NEVER get an A or B just because trackers were blocked!
    const result = calculatePrivacyGrade({
      httpsUpgrade: false,
      trackersFound: 50,
      trackersBlocked: 50,
      trackerPrevalence: 90,
      tosdrGrade: 'A',
      cookieConsentAutoHandled: true,
      darkPatternsFound: 0,
      phishingRisk: true // Phishing detected
    });

    expect(result.verdict).toBe('DANGEROUS');
    expect(result.reputationGrade).toBe('F');
    expect(result.protectedGrade).toBe('F');
  });

  it('should penalize dark patterns and cap score for heavy deception', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: false,
      trackersFound: 0,
      trackersBlocked: 0,
      trackerPrevalence: 0,
      tosdrGrade: null,
      cookieConsentAutoHandled: false,
      darkPatternsFound: 5,
      phishingRisk: false
    });

    expect(result.verdict).toBe('SUSPICIOUS');
    expect(['C', 'C-', 'D', 'F']).toContain(result.protectedGrade);
  });
});
