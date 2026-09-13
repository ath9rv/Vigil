import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { createMockForensicsEnvironment } from './fixtures';

describe('Layer 3: Explanation Non-Interference (INV-V4-022, PERF-V4-009)', () => {
  const builder = new ForensicReportBuilder();

  it('INV-V4-022: operates strictly over frozen snapshots with zero mutation of reasoning inputs', () => {
    const env = createMockForensicsEnvironment('nav-interference-test');

    const initialEventsCount = env.timeline.getEvents(env.navId).length;
    const initialNodeCount = env.graph.getNodeCount();
    const initialVerdictConfidence = env.verdictResolution.confidence;

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

    // Verify inputs remain 100% unmutated
    expect(env.timeline.getEvents(env.navId).length).toBe(initialEventsCount);
    expect(env.graph.getNodeCount()).toBe(initialNodeCount);
    expect(env.verdictResolution.confidence).toBe(initialVerdictConfidence);

    // Verify output immutability (PERF-V4-009)
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.timeline)).toBe(true);
    expect(Object.isFrozen(report.observations)).toBe(true);
    expect(Object.isFrozen(report.supportingEvidence)).toBe(true);
    expect(Object.isFrozen(report.hypotheses)).toBe(true);
    expect(Object.isFrozen(report.counterfactuals)).toBe(true);
    expect(Object.isFrozen(report.uncertainty)).toBe(true);
    expect(Object.isFrozen(report.limitations)).toBe(true);

    // Attempted mutation throws in strict mode
    expect(() => {
      (report as any).summary = 'Tampered summary';
    }).toThrow();
  });
});
