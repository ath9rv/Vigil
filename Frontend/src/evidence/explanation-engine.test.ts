import { describe, it, expect, beforeEach } from 'vitest';
import { ExplanationEngine } from './explanation-engine';
import type { VerdictResolution } from '../shared/types';
import type { EvidenceNode } from './graph';

describe('Phase 4: Explanation Engine', () => {
  let engine: ExplanationEngine;

  beforeEach(() => {
    engine = new ExplanationEngine();
  });

  const MOCK_NODE: EvidenceNode<any> = {
    id: 'node-1',
    type: 'NETWORK',
    navigationId: 'nav-1',
    tabId: 1,
    timestamp: Date.now(),
    source: 'test',
    strength: 1.0,
    context: {} as any,
    provenance: { observationId: 'obs-1', collector: 'test', collectorVersion: '1' },
    data: { crossSite: true },
  };

  const MOCK_RESOLUTION: VerdictResolution = {
    eligibility: 'ELIGIBLE',
    verdict: { type: 'THIRD_PARTY_DATA_SHARING', summary: 'Summary' },
    claimId: 'claim-1',
    confidence: 0.85,
    supportingEvidenceIds: ['node-1'],
    contradictingEvidenceIds: [],
    rejectedInferences: [
      { claimPredicate: 'sells_personal_information', reason: 'Does not establish data sale.', evidenceConsidered: [] }
    ],
    explanation: 'Old explanation',
  };

  it('maps confidence correctly', () => {
    const report = engine.generateReport(MOCK_RESOLUTION, [MOCK_NODE], []);
    expect(report.confidenceLabel).toBe('HIGH');
  });

  it('synthesizes observations', () => {
    const report = engine.generateReport(MOCK_RESOLUTION, [MOCK_NODE], []);
    expect(report.observations.length).toBeGreaterThan(0);
    expect(report.observations[0]).toContain('third-party endpoint');
  });

  it('synthesizes rejected inferences', () => {
    const report = engine.generateReport(MOCK_RESOLUTION, [MOCK_NODE], []);
    expect(report.rejectedInferences.length).toBe(1);
    expect(report.rejectedInferences[0]).toBe('Does not establish data sale.');
  });

  it('preserves forensic provenance', () => {
    const report = engine.generateReport(MOCK_RESOLUTION, [MOCK_NODE], []);
    expect(report.claimId).toBe(MOCK_RESOLUTION.claimId);
    expect(report.evidenceNodeIds).toEqual(MOCK_RESOLUTION.supportingEvidenceIds);
    expect(report.eligibility).toBe(MOCK_RESOLUTION.eligibility);
  });

  it('presentation invariant: rejected inferences never leak into observations', () => {
    const report = engine.generateReport(MOCK_RESOLUTION, [MOCK_NODE], []);
    // Ensure the rejected string doesn't appear in the observations list
    for (const obs of report.observations) {
      expect(obs).not.toContain('sells_personal_information');
      expect(obs).not.toContain('sale');
    }
  });

  it('throws on non-eligible resolutions', () => {
    const badResolution = { ...MOCK_RESOLUTION, eligibility: 'INSUFFICIENT_EVIDENCE' as const };
    expect(() => engine.generateReport(badResolution, [MOCK_NODE], [])).toThrow(/non-eligible/);
  });
});
