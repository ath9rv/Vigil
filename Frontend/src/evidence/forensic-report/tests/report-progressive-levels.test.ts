import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: Progressive Disclosure Views (Levels 1, 2, 3)', () => {
  const builder = new ForensicReportBuilder();

  it('renders Level 1 human-first narrative with non-intent disclaimer', () => {
    const env = createMockForensicsEnvironment('nav-prog-test');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
    });

    const level1 = ForensicReportFormatter.toLevel1UserExplanation(report);

    expect(level1.title).toBe('Possible Hidden Fee');
    expect(level1.headline).toContain('mandatory fee appeared after checkout');
    expect(level1.whyThisMatters).toContain('fee was not present in the earlier price representation');
    expect(level1.nonIntentDisclaimer).toContain('does not establish the company\'s intent');

    // Considered alternatives formatted for humans
    expect(level1.consideredAlternatives.length).toBeGreaterThanOrEqual(2);
    expect(level1.consideredAlternatives.some(a => a.name.toLowerCase().includes('regional tax'))).toBe(true);
    expect(level1.confidenceDisplay.label).toBe('STRONG EVIDENCE');
  });

  it('renders Level 2 Evidence View with chronological timeline & counterfactual summary', () => {
    const env = createMockForensicsEnvironment('nav-prog-2');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
    });

    const level2 = ForensicReportFormatter.toLevel2EvidenceView(report);

    expect(level2.timelineEntries.length).toBe(3);
    expect(level2.supportingEvidenceCount).toBe(2);
    expect(level2.evaluatedHypotheses.length).toBe(3);
    expect(level2.counterfactualSummary.length).toBe(1);
  });

  it('renders Level 3 Forensic View with technical trace and audit lineage', () => {
    const env = createMockForensicsEnvironment('nav-prog-3');
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

    const level3 = ForensicReportFormatter.toLevel3ForensicView(report);

    expect(level3.auditLineage.navigationId).toBe(env.navId);
    expect(level3.auditLineage.observationCount).toBe(2);
    expect(level3.auditLineage.reconciliationDelta).toBe(0.03);
    expect(level3.auditLineage.modelProvenance).toContain('xenova-nli-deberta-v3-xsmall@1.0.0');
  });
});
