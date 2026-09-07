import { describe, it, expect, beforeEach } from 'vitest';
import { ConsistencyEngine } from './contradiction';
import { ClaimFactory, CLAIM_PREDICATES } from './claims';
import { EvidenceNode } from './graph';

const MOCK_CONTEXT = {
  hostname: 'example.com',
  url: 'https://example.com',
  tabId: 1,
  navigationId: 'nav-1',
  startedAt: Date.now(),
} as any;

describe('Phase 2C: Contradiction & Consistency Engine', () => {
  let engine: ConsistencyEngine;

  beforeEach(() => {
    engine = new ConsistencyEngine();
  });

  function makeBehaviorNode(overrides: any): EvidenceNode<any> {
    return {
      id: crypto.randomUUID(),
      type: 'NETWORK',
      navigationId: 'nav-1',
      tabId: 1,
      timestamp: Date.now(),
      source: 'test',
      strength: 1.0,
      context: MOCK_CONTEXT,
      provenance: { observationId: 'obs-1', collector: 'test', collectorVersion: '1' },
      data: overrides,
    };
  }

  function makePolicyNode(predicate: string, availability: string): EvidenceNode<any> {
    return {
      id: crypto.randomUUID(),
      type: 'DOCUMENT',
      navigationId: 'nav-1',
      tabId: 1,
      timestamp: Date.now(),
      source: 'test',
      strength: 1.0,
      context: MOCK_CONTEXT,
      provenance: { observationId: 'obs-1', collector: 'test', collectorVersion: '1' },
      data: {
        predicate,
        availability,
      },
    };
  }

  // ─── 1. Direct Contradiction (CONTESTED) ─────────────────────────────────

  it('evaluates conflicting evidence as CONTESTED', () => {
    // Claim: The company shares data
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);

    // Evidence A: Policy explicitly denies sharing
    const policyEvidence = makePolicyNode(CLAIM_PREDICATES.SHARES_DATA, 'EXPLICITLY_DENIED');
    
    // Evidence B: Behavioral network request shows cross-site data sharing
    const behaviorEvidence = makeBehaviorNode({ crossSite: true, domain: 'tracker.com' });

    const result = engine.evaluateClaim(claim, [policyEvidence, behaviorEvidence], []);

    // Both sides have evidence → CONTESTED
    expect(result.state).toBe('CONTESTED');
    expect(result.supportScore).toBeGreaterThan(0.5);
    expect(result.contradictionScore).toBeGreaterThan(0.5);
    expect(result.contradictingEvidenceIds).toContain(policyEvidence.id);
  });

  // ─── 2. No Contradiction (different claims) ──────────────────────────────

  it('does not conflate "sells data" with "uses analytics"', () => {
    // Claim: Company sells data
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SELLS_DATA);

    // Policy: "We don't sell data"
    const policyEvidence = makePolicyNode(CLAIM_PREDICATES.SELLS_DATA, 'EXPLICITLY_DENIED');

    // Behavior: Cross-site network request to analytics provider
    // This does NOT support "sells data" under SELLS_DATA_CONSTRAINT
    const behaviorEvidence = makeBehaviorNode({ crossSite: true, domain: 'analytics.com' });

    const result = engine.evaluateClaim(claim, [policyEvidence, behaviorEvidence], []);

    // Policy contradicts, behavior is irrelevant to "sells" → CONTRADICTED
    expect(result.state).toBe('CONTRADICTED');
    expect(result.supportScore).toBe(0);
    expect(result.contradictionScore).toBeGreaterThan(0.5);
  });

  // ─── 3. Unknown / Unsupported ────────────────────────────────────────────

  it('evaluates claim with zero evidence as UNKNOWN', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SELLS_DATA);

    const result = engine.evaluateClaim(claim, [], []);

    expect(result.state).toBe('UNKNOWN');
    expect(result.supportScore).toBe(0);
    expect(result.contradictionScore).toBe(0);
  });

  // ─── 4. Evidence Absence ≠ Contradiction ─────────────────────────────────

  it('does NOT manufacture contradiction from evidence absence', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);

    // Policy doesn't mention data sharing at all (availability: UNKNOWN)
    const policyEvidence = makePolicyNode(CLAIM_PREDICATES.SHARES_DATA, 'UNKNOWN');

    const result = engine.evaluateClaim(claim, [policyEvidence], []);

    // UNKNOWN availability → no polarity emitted → no evaluations → UNKNOWN state
    expect(result.state).toBe('UNKNOWN');
    expect(result.contradictionScore).toBe(0);
    expect(result.supportScore).toBe(0);
  });

  // ─── 5. Navigation Isolation ─────────────────────────────────────────────

  it('maintains navigation isolation', () => {
    const claim = ClaimFactory.fromBehavior('nav-A', 'Company', CLAIM_PREDICATES.SHARES_DATA);

    // Evidence from nav-B
    const behaviorEvidence = makeBehaviorNode({ crossSite: true, domain: 'tracker.com' });
    behaviorEvidence.navigationId = 'nav-B';

    const result = engine.evaluateClaim(claim, [behaviorEvidence], []);

    // Claim is navigation-scoped to nav-A → evidence from nav-B is invisible
    expect(result.state).toBe('UNKNOWN');
    expect(result.supportScore).toBe(0);
  });

  // ─── 6. Temporal Preservation ────────────────────────────────────────────

  it('preserves temporal correlations in consistency evaluation', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.USES_TRACKERS);
    
    const corr = {
      id: 'tc-1',
      navigationId: 'nav-1',
      eventIds: [],
      startTime: 0,
      endTime: 0,
      durationMs: 0,
      pattern: 'TRACKING_INITIALIZATION',
      score: { temporal: 1, entityMatch: 1, payloadSubstring: 1, repetition: 0, total: 1 },
      payloadMatch: 'EXACT' as const,
      supportingNodeIds: ['node-1'],
    };

    const result = engine.evaluateClaim(claim, [], [corr]);

    expect(result.state).toBe('SUPPORTED');
    expect(result.supportScore).toBeGreaterThan(0.9);
  });
});
