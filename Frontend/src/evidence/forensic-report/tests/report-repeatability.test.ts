import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: Deterministic Repeatability (PERF-V4-013 & Audit Integrity)', () => {
  const builder = new ForensicReportBuilder();

  it('PERF-V4-013: produces bit-for-bit identical reports across repeated runs on identical snapshot', () => {
    const env = createMockForensicsEnvironment('nav-repeatable-test');

    const params = {
      navigationId: env.navId,
      subject: { url: 'https://store.example.com', domain: 'store.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
      generatedAt: 1773340000000, // Fixed snapshot timestamp
    };

    const report1 = builder.buildReport(params);
    const report2 = builder.buildReport(params);

    // 1. Report IDs match deterministically
    expect(report1.reportId).toBe(report2.reportId);
    expect(report1.generatedAt).toBe(report2.generatedAt);

    // 2. Objects are deeply equal
    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));

    // 3. Serialized investigation markdown is bit-for-bit identical
    const md1 = ForensicReportFormatter.toStructuredInvestigationMarkdown(report1);
    const md2 = ForensicReportFormatter.toStructuredInvestigationMarkdown(report2);

    expect(md1).toBe(md2);
    expect(md1.length).toBe(md2.length);
  });

  it('PERF-V4-013: zero duplicate reasoning: pure projection from already-frozen artifacts', () => {
    const env = createMockForensicsEnvironment('nav-no-dup');

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

    // Calling multiple views executes zero reasoning or graph mutations
    const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);
    const l2 = ForensicReportFormatter.toLevel2EvidenceView(report);
    const l3 = ForensicReportFormatter.toLevel3ForensicView(report);
    const md = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);

    expect(l1).toBeDefined();
    expect(l2).toBeDefined();
    expect(l3).toBeDefined();
    expect(md).toBeDefined();

    // Verify underlying snapshot nodes were not touched
    expect(env.graph.getNodeCount()).toBe(2);
  });
});
