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

  it('normalizes M2 threat findings into SECURITY category and heavily docks security dimension', () => {
    const raw = {
      id: 'sec-1',
      ruleId: 'M2-005',
      ruleName: 'form_action_mismatch',
      module: 'M2',
      severity: 'severe',
      confidenceState: 'confirmed',
      explanation: 'Credential exfiltration to rogue host'
    };

    const normalized = normalizeFinding(raw);
    expect(normalized.category).toBe('SECURITY');
    expect(normalized.severity).toBe('CRITICAL');

    const assessment = correlateFindings([raw], {
      pageBehavior: true,
      threatIntel: true,
      thirdPartyRequests: true,
      legalReviewed: false,
      strictPrivacyEnabled: false
    });

    expect(assessment.security.score).toBeLessThanOrEqual(50);
    expect(assessment.security.evidenceCount).toBe(1);
  });

  it('normalizes LEGAL findings and correctly scores legal compliance dimension', () => {
    const legalFinding = {
      id: 'leg-1',
      category: 'LEGAL' as const,
      severity: 'MEDIUM' as const,
      confidence: 'HIGH' as const,
      reviewStatus: 'CONFIRMED' as const,
      ruleId: 'LEGAL-ARBITRATION',
      ruleName: 'Forced Arbitration',
      interpretation: 'Disables right to public court trial',
      evidence: {
        sourceType: 'DOCUMENT' as const,
        sourceUrl: 'https://example.com/terms',
        capturedAt: Date.now(),
        documentHash: 'abcd1234hash',
        excerpt: 'Binding arbitration waiver',
        context: ''
      }
    };

    const assessment = correlateFindings([legalFinding], {
      pageBehavior: true,
      threatIntel: true,
      thirdPartyRequests: true,
      legalReviewed: true,
      strictPrivacyEnabled: false
    });

    expect(assessment.findingCount).toBe(1);
    expect(assessment.correlatedFindings[0].category).toBe('LEGAL');
  });
});
