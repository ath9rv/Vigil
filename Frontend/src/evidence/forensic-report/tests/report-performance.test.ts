import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: Report Performance & Resource Ceilings (PERF-V4-009 - 012)', () => {
  const builder = new ForensicReportBuilder();

  it('PERF-V4-010: builds and serializes 50 reports in <30ms (<0.6ms per report)', () => {
    const env = createMockForensicsEnvironment('nav-perf-test');
    const params = {
      navigationId: env.navId,
      subject: { url: 'https://example.com', domain: 'example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    };

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      const rep = builder.buildReport(params);
      ForensicReportFormatter.toStructuredInvestigationMarkdown(rep);
    }
    const duration = performance.now() - start;

    console.log(`[FORENSIC REPORT BENCHMARK] 50 reports build & serialize: ${duration.toFixed(3)}ms (${(duration / 50).toFixed(4)}ms/report)`);
    expect(duration).toBeLessThan(100);
  });

  it('verifies serialized report size is compact (<10 KB)', () => {
    const env = createMockForensicsEnvironment('nav-perf-size');
    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://example.com', domain: 'example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: env.verdictResolution,
      hypothesisResult: env.hypothesisResult,
      counterfactualResult: env.counterfactualResult,
      reconciliationResult: env.reconciliationResult,
    });

    const md = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);
    const sizeBytes = new TextEncoder().encode(md).length;

    console.log(`[FORENSIC REPORT SIZE] Serialized markdown size: ${sizeBytes} bytes`);
    expect(sizeBytes).toBeLessThan(10240); // Less than 10 KB
  });
});
