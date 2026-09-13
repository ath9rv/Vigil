import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: Downloadable Investigation Report (12 Sections Export)', () => {
  const builder = new ForensicReportBuilder();

  it('generates a complete 12-section structured investigation markdown report', () => {
    const env = createMockForensicsEnvironment('nav-export-test');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://shop.example.com/checkout', domain: 'shop.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    const md = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);

    // Verify all 12 sections are present
    expect(md).toContain('VIGIL FORENSIC REPORT');
    expect(md).toContain('1. EXECUTIVE SUMMARY');
    expect(md).toContain('2. WHAT WAS OBSERVED');
    expect(md).toContain('3. EVENT TIMELINE');
    expect(md).toContain('4. SUPPORTING EVIDENCE');
    expect(md).toContain('5. CONTRADICTIONS');
    expect(md).toContain('6. ALTERNATIVE EXPLANATIONS');
    expect(md).toContain('7. COUNTERFACTUAL ANALYSIS');
    expect(md).toContain('8. PROBABILISTIC ASSISTANCE');
    expect(md).toContain('9. AUTHORITATIVE VERDICT');
    expect(md).toContain('10. UNCERTAINTY & LIMITATIONS');
    expect(md).toContain('11. EVIDENCE REFERENCES');
    expect(md).toContain('12. INTEGRITY / PROVENANCE');

    // Verify key contents
    expect(md).toContain('Case ID:     ' + report.reportId);
    expect(md).toContain('Domain:      shop.example.com');
    expect(md).toContain('Model Invoked:       xenova-nli-deberta-v3-xsmall@1.0.0');
    expect(md).toContain('Confidence Delta:   +0.030 (Bounded to ±0.15)');
    expect(md).toContain('does not establish corporate subjective intent');
  });
});
