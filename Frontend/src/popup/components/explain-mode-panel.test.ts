import { describe, it, expect } from 'vitest';
import { ForensicReportFormatter } from '../../evidence/forensic-report/report-formatter';
import { createMockForensicsEnvironment } from '../../evidence/forensic-report/tests/fixtures';
import { ForensicReportBuilder } from '../../evidence/forensic-report/report-builder';

describe('Layer 3 Product Surface: ExplainModePanel Data Contract', () => {
  const builder = new ForensicReportBuilder();

  it('renders Level 1 human-first narrative without technical jargon', () => {
    const env = createMockForensicsEnvironment('nav-ui-1');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);

    // Non-technical translation assertions
    expect(l1.headline).toBeDefined();
    expect(l1.whyThisMatters).toBeDefined();
    expect(l1.nonIntentDisclaimer).toContain("does not establish the company's intent");

    // Must NOT contain internal architectural jargon in Level 1
    expect(l1.headline).not.toContain('RawObservation');
    expect(l1.headline).not.toContain('CausalCandidate');
    expect(l1.headline).not.toContain('HypothesisGraph');
    expect(l1.whyThisMatters).not.toContain('navigationId');

    // Alternatives displayed for humans
    expect(l1.consideredAlternatives.length).toBeGreaterThanOrEqual(2);
    expect(l1.consideredAlternatives.some(a => a.verdict === 'Unsupported')).toBe(true);
  });

  it('renders Level 2 Evidence View with chronological receipts, supports, and rejected alternatives', () => {
    const env = createMockForensicsEnvironment('nav-ui-2');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
    });

    const l2 = ForensicReportFormatter.toLevel2EvidenceView(report);

    expect(l2.timelineEntries.length).toBe(3);
    expect(l2.supports?.length).toBeGreaterThanOrEqual(1);
    expect(l2.rejectedAlternatives?.length).toBeGreaterThanOrEqual(1);
    expect(l2.remainingUncertainty).toBeDefined();

    // Supports has checkmark prefix, rejected has cross prefix
    expect(l2.supports?.[0]).toMatch(/^✓/);
    expect(l2.rejectedAlternatives?.[0]).toMatch(/^✗/);
  });

  it('renders Level 3 Forensic Trace with audit lineage and observation provenance', () => {
    const env = createMockForensicsEnvironment('nav-ui-3');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    const l3 = ForensicReportFormatter.toLevel3ForensicView(report);

    expect(l3.auditLineage.navigationId).toBe(env.navId);
    expect(l3.auditLineage.reportId).toBe(report.reportId);
    expect(l3.auditLineage.observationCount).toBe(2);
    expect(l3.auditLineage.contradictionCount).toBe(0);
    expect(l3.auditLineage.reconciliationDelta).toBe(0.03);
    expect(l3.auditLineage.modelProvenance).toContain('xenova-nli-deberta-v3-xsmall');
  });

  it('formats 12-section structured investigation markdown for download receipt', () => {
    const env = createMockForensicsEnvironment('nav-ui-4');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    const markdown = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);

    // Header matches audit standard
    expect(markdown).toContain('STRUCTURED FOR INDEPENDENT REVIEW AND AUDITABILITY');
    expect(markdown).toContain(`Case ID:     ${report.reportId}`);

    // Contains all 12 key sections
    expect(markdown).toContain('1. EXECUTIVE SUMMARY');
    expect(markdown).toContain('2. WHAT WAS OBSERVED');
    expect(markdown).toContain('3. EVENT TIMELINE');
    expect(markdown).toContain('4. SUPPORTING EVIDENCE');
    expect(markdown).toContain('5. CONTRADICTIONS');
    expect(markdown).toContain('6. ALTERNATIVE EXPLANATIONS');
    expect(markdown).toContain('7. COUNTERFACTUAL ANALYSIS');
    expect(markdown).toContain('8. PROBABILISTIC ASSISTANCE');
    expect(markdown).toContain('9. AUTHORITATIVE VERDICT');
    expect(markdown).toContain('10. UNCERTAINTY & LIMITATIONS');
    expect(markdown).toContain('11. EVIDENCE REFERENCES');
    expect(markdown).toContain('12. INTEGRITY / PROVENANCE');
  });
});
