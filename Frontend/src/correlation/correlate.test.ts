import { describe, it, expect } from 'vitest';
import { correlateFindings, normalizeFinding } from './correlate';

describe('Correlation Engine & Finding Normalization', () => {
  it('should normalize raw DOM scanner findings into canonical findings with categories', () => {
    const raw = {
      id: 'test-1',
      ruleId: 'M1-001',
      ruleName: 'hidden_costs',
      module: 'M1',
      severity: 'high',
      confidenceState: 'confirmed',
      explanation: 'Hidden delivery fee added at checkout.'
    };

    const normalized = normalizeFinding(raw);
    expect(normalized.category).toBe('DARK_PATTERN');
    expect(normalized.severity).toBe('HIGH');
    expect(normalized.confidence).toBe('HIGH');
    expect(normalized.interpretation).toBe('Hidden delivery fee added at checkout.');
    expect(normalized.evidence.sourceType).toBe('DOM');
  });

  it('should calculate dimension scores and penalize dark patterns', () => {
    const rawFindings = [
      {
        id: 'f1',
        module: 'M1',
        severity: 'severe',
        explanation: 'Forced subscription trap'
      },
      {
        id: 'f2',
        module: 'M1',
        severity: 'high',
        explanation: 'Hidden handling charge'
      }
    ];

    const assessment = correlateFindings(rawFindings, {
      pageBehavior: true,
      threatIntel: true,
      thirdPartyRequests: true,
      legalReviewed: false,
      strictPrivacyEnabled: false
    });

    // M1 mappings should reduce fairness (DARK_PATTERN) score
    expect(assessment.fairness.score).toBeLessThan(100);
    expect(assessment.fairness.evidenceCount).toBe(2);
    expect(assessment.findingCount).toBe(2);
  });
});
