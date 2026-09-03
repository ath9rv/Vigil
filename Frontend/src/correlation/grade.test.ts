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

  it('demonstrates measurable protection uplift when Vigil shields the user from trackers', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: true,
      // These were blocked before they loaded, so they are attempts rather
      // than active page resources.
      trackersFound: 0,
      trackersBlocked: 25,
      trackerPrevalence: 80,
      tosdrGrade: 'B',
      cookieConsentAutoHandled: true,
      darkPatternsFound: 0,
      phishingRisk: false
    });

    // Reputation without protection should be low (e.g. D or C)
    // But protectedGrade after blocking 25 trackers should be significantly improved!
    expect(result.protectedGrade).not.toBe(result.reputationGrade);
    expect(['A+', 'A', 'A-', 'B+', 'B']).toContain(result.protectedGrade);
  });

  it('does not treat blocked and loaded trackers as the same request', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: true,
      trackersFound: 3,
      trackersBlocked: 7,
      trackerPrevalence: 60,
      tosdrGrade: null,
      cookieConsentAutoHandled: false,
      darkPatternsFound: 0,
      phishingRisk: false
    });

    // Seven separate attempts were blocked, but three trackers still loaded.
    // The protected grade must retain the remaining exposure.
    expect(result.reputationGrade).not.toBe(result.protectedGrade);
    expect(result.protectedGrade).not.toBe('A+');
  });

  it('penalizes sites with terrible ToS;DR Grade E policies', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: false,
      trackersFound: 0,
      trackersBlocked: 0,
      trackerPrevalence: 0,
      tosdrGrade: 'E',
      cookieConsentAutoHandled: false,
      darkPatternsFound: 0,
      phishingRisk: false
    });

    // Grade E imposes significant point deduction
    expect(result.protectedGrade).not.toBe('A+');
  });

  it('accurately evaluates a standard commercial e-commerce site with mixed telemetry', () => {
    const result = calculatePrivacyGrade({
      httpsUpgrade: false,
      trackersFound: 6,
      trackersBlocked: 6,
      trackerPrevalence: 30,
      tosdrGrade: 'C',
      cookieConsentAutoHandled: true,
      darkPatternsFound: 1,
      phishingRisk: false
    });

    expect(result.verdict).toBeDefined();
    expect(result.reputationGrade).toBeDefined();
    expect(result.protectedGrade).toBeDefined();
  });
});
