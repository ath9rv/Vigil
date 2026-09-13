import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: ForensicReportBuilder (Canonical Assembly)', () => {
  const builder = new ForensicReportBuilder();

  it('assembles a complete canonical forensic report with all 12 structural areas', () => {
    const env = createMockForensicsEnvironment('nav-builder-test');

    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com/checkout', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    expect(report.reportId).toMatch(/^VF-\d{4}-[A-Z0-9]+$/);
    expect(report.navigationId).toBe(env.navId);
    expect(report.subject.domain).toBe('store.example.com');

    // Verdict
    expect(report.verdict.type).toBe('DECEPTIVE_UI_PATTERN');
    expect(report.verdict.confidence).toBe(0.88);

    // Timeline entries
    expect(report.timeline.length).toBe(3);
    expect(report.timeline[0].relativeTimeMs).toBe(0);
    expect(report.timeline[1].relativeTimeMs).toBe(500);

    // Supporting evidence & contradictions
    expect(report.supportingEvidence.length).toBeGreaterThanOrEqual(2);
    expect(report.contradictions.length).toBe(0);

    // Hypotheses
    expect(report.hypotheses.length).toBe(3);
    const taxHyp = report.hypotheses.find(h => h.type === 'INNOCUOUS_REGIONAL_TAX');
    expect(taxHyp?.rejectedReason).toContain('separate independent tax line item');

    // Counterfactuals
    expect(report.counterfactuals.length).toBe(1);
    expect(report.counterfactuals[0].result).toBe('SUPPORTED');

    // Model contribution
    expect(report.modelAssessment).toBeDefined();
    expect(report.modelAssessment?.modelId).toBe('xenova-nli-deberta-v3-xsmall');
    expect(report.modelAssessment?.confidenceDelta).toBe(0.03);

    // Uncertainty & limitations
    expect(report.uncertainty.length).toBeGreaterThan(0);
    expect(report.uncertainty[0].level).toBe('STRONG_EVIDENCE');
    expect(report.limitations.length).toBeGreaterThanOrEqual(2);
    expect(report.limitations.some(l => l.includes('does not establish corporate subjective intent'))).toBe(true);
  });
});
