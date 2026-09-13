import { describe, it, expect } from 'vitest';
import { ReportAdapter } from '../report-adapter';
import type { Finding } from '../../evidence';
import type { CanonicalForensicReport } from '../types';

describe('Layer 3 Product Surface: ReportAdapter (PERF-V4-013 & INV-V4-023)', () => {
  it('PERF-V4-013: returns pre-attached canonical report without any re-computation', () => {
    const mockReport = {
      reportId: 'VF-2026-PREEXISTING',
      navigationId: 'nav-test',
      subject: { domain: 'store.example.com', url: 'https://store.example.com' },
      verdict: { type: 'DARK_PATTERN', summary: 'Fee introduced', confidence: 0.88, eligibility: 'ELIGIBLE' },
      summary: 'Precomputed summary',
      timeline: [],
      observations: [],
      supportingEvidence: [],
      contradictions: [],
      hypotheses: [],
      counterfactuals: [],
      uncertainty: [{ level: 'STRONG_EVIDENCE' as const, statement: 'Strong', primaryFactor: 'Timeline' }],
      limitations: ['Non-intent disclaimer'],
      generatedAt: 1770000000000,
    } as unknown as CanonicalForensicReport;

    const finding: Finding = {
      id: 'find-1',
      category: 'DARK_PATTERN',
      severity: 'CONFIRMED',
      confidence: 'CONFIRMED',
      reviewStatus: 'CONFIRMED',
      interpretation: 'Drip pricing detected',
      evidence: {
        sourceType: 'DOM',
        sourceUrl: 'https://store.example.com',
        capturedAt: 1770000000000,
      },
      report: mockReport,
    };

    const result = ReportAdapter.ensureCanonicalReport(finding);
    expect(result).toBe(mockReport);
    expect(result.reportId).toBe('VF-2026-PREEXISTING');
  });

  it('INV-V4-023: faithfully adapts finding into a complete CanonicalForensicReport with non-intent disclaimer', () => {
    const finding: Finding = {
      id: 'find-drip-2',
      category: 'DARK_PATTERN',
      ruleId: 'M1-001',
      ruleName: 'Drip Pricing / Mandatory Hidden Fee',
      severity: 'SUGGESTIVE',
      confidence: 'SUGGESTIVE',
      reviewStatus: 'REVIEW_NEEDED',
      interpretation: 'Mandatory $25 service fee appeared after clicking checkout progression.',
      evidence: {
        sourceType: 'DOM',
        sourceUrl: 'https://shop.example.com/checkout',
        capturedAt: 1770000000000,
        forensics: {
          level: 'SUGGESTIVE',
          verdict: 'NEEDS_REVIEW',
          observed: [
            'Base price $100 displayed on item page',
            'User selected checkout progression',
            'Mandatory $25 service fee added to total',
          ],
          supportingEvidence: ['Fee absent prior to progression'],
          contradictingEvidence: ['Regional sales tax line item exists separately'],
          assumptions: [],
          temporal: { firstSeen: 1770000000000, lastSeen: 1770000001000, observationCount: 3 },
          coverage: { dom: true, network: false },
        },
      },
    };

    const report = ReportAdapter.ensureCanonicalReport(finding, 'shop.example.com');

    // 1. Report ID matches deterministic format
    expect(report.reportId).toMatch(/^VF-\d{4}-[A-Z0-9]+$/);
    expect(report.subject.domain).toBe('shop.example.com');
    expect(report.verdict.confidence).toBe(0.65); // SUGGESTIVE -> 0.65 (uninflated)

    // 2. Timeline synthesized correctly
    expect(report.timeline.length).toBe(3);
    expect(report.timeline[0].summary).toContain('Base price $100');
    expect(report.timeline[2].summary).toContain('Mandatory $25 service fee');

    // 3. Counterfactual & Alternatives present
    expect(report.counterfactuals.length).toBeGreaterThanOrEqual(1);
    expect(report.hypotheses.some(h => h.type === 'INNOCUOUS_EXPLANATION')).toBe(true);

    // 4. Uncertainty & Limitations
    expect(report.uncertainty[0].level).toBe('MODERATE_EVIDENCE');
    expect(report.limitations.some(lim => lim.includes('corporate subjective intent'))).toBe(true);
  });
});
