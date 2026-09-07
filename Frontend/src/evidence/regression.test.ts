import { describe, it, expect, beforeEach } from 'vitest';
import { ConsistencyEngine } from './contradiction';
import { VerdictResolver } from './verdict-resolver';
import { ClaimFactory, CLAIM_PREDICATES } from './claims';
import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';

const MOCK_CONTEXT = {
  hostname: 'example.com',
  url: 'https://example.com',
  tabId: 1,
  navigationId: 'nav-1',
  startedAt: Date.now(),
} as any;

/**
 * THE VIGIL REASONING REGRESSION SUITE
 * 
 * This suite explicitly codifies the hard negative boundaries of the reasoning engine.
 * It ensures that Vigil never escalates ambiguous evidence into authoritative claims.
 * These tests must NEVER be disabled or weakened.
 */
describe('Permanent Reasoning Regression Suite', () => {
  let consistencyEngine: ConsistencyEngine;
  let verdictResolver: VerdictResolver;

  beforeEach(() => {
    consistencyEngine = new ConsistencyEngine();
    verdictResolver = new VerdictResolver();
  });

  function makeNode(type: string, data: any): EvidenceNode<any> {
    return {
      id: crypto.randomUUID(),
      type: type as any,
      navigationId: 'nav-1',
      tabId: 1,
      timestamp: Date.now(),
      source: 'test',
      strength: 1.0,
      context: MOCK_CONTEXT,
      provenance: { observationId: 'obs-1', collector: 'test', collectorVersion: '1' },
      data,
    };
  }

  function resolveFullStack(claimPredicate: string, nodes: EvidenceNode<any>[], correlations: TemporalCorrelation[] = []) {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Target', claimPredicate);
    const score = consistencyEngine.evaluateClaim(claim, nodes, correlations);
    return verdictResolver.resolve(claim, score, nodes, correlations);
  }

  it('1. Amazon-style third-party sharing ≠ data sale', () => {
    const node = makeNode('NETWORK', { crossSite: true, domain: 'analytics.example' });
    
    // Sharing claim is eligible
    const sharingRes = resolveFullStack(CLAIM_PREDICATES.SHARES_DATA, [node]);
    expect(sharingRes.eligibility).toBe('ELIGIBLE');
    
    // Selling claim is blocked/insufficient
    const saleRes = resolveFullStack(CLAIM_PREDICATES.SELLS_DATA, [node]);
    expect(saleRes.eligibility).toBe('BLOCKED');
    expect(saleRes.verdict).toBeUndefined();
  });

  it('2. Cookie creation ≠ exfiltration', () => {
    const node = makeNode('STORAGE', { cookieName: '_tracker' });
    
    const exfilRes = resolveFullStack(CLAIM_PREDICATES.COLLECTS_IDENTIFIER, [node]);
    
    // Exfiltration requires NETWORK + STORAGE and temporal correlation
    expect(exfilRes.eligibility).toBe('BLOCKED');
    expect(exfilRes.verdict).toBeUndefined();
  });

  it('3. Third-party request ≠ malicious tracking', () => {
    const node = makeNode('NETWORK', { crossSite: true, domain: 'cdn.example' });
    
    // Standard cross-site request does not automatically prove TRACKER_USAGE
    // (Our engine currently requires known trackers or temporal correlation)
    const trackerRes = resolveFullStack(CLAIM_PREDICATES.USES_TRACKERS, [node]);
    
    expect(trackerRes.eligibility).toBe('BLOCKED');
  });

  it('4. Tracker presence ≠ privacy violation (Requires Context)', () => {
    const node = makeNode('STORAGE', { isTracker: true, cookieName: '_ga' });
    
    // Tracker usage is supported...
    const trackerRes = resolveFullStack(CLAIM_PREDICATES.USES_TRACKERS, [node]);
    expect(trackerRes.eligibility).toBe('ELIGIBLE');
    
    // But consent violation requires more than just presence (e.g. before consent given)
    // We haven't implemented CONSENT_VIOLATION yet, but it should fail
    const consentRes = resolveFullStack('violates_consent', [node]);
    expect(consentRes.eligibility).toBe('BLOCKED'); 
  });

  it('5. Policy absence ≠ contradiction', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Target', CLAIM_PREDICATES.SHARES_DATA);
    
    // Policy explicitly UNKNOWN on the topic
    const policyNode = makeNode('DOCUMENT', { predicate: CLAIM_PREDICATES.SHARES_DATA, availability: 'UNKNOWN' });
    
    const score = consistencyEngine.evaluateClaim(claim, [policyNode], []);
    expect(score.state).toBe('UNKNOWN'); // Not CONTRADICTED
    expect(score.contradictionScore).toBe(0);
  });

  it('6. Temporal proximity ≠ causality', () => {
    // If two events are temporally close but the pattern does not match our specific 
    // causal heuristics (like TRACKING_INITIALIZATION), they do not magically support a claim.
    const claim = ClaimFactory.fromBehavior('nav-1', 'Target', CLAIM_PREDICATES.USES_TRACKERS);
    
    const corr: TemporalCorrelation = {
      id: 'tc-1',
      navigationId: 'nav-1',
      eventIds: [],
      startTime: 0,
      endTime: 0,
      durationMs: 0,
      pattern: 'UNRELATED_CLICKS', // Not a tracking pattern
      score: { temporal: 1, entityMatch: 0, payloadSubstring: 0, repetition: 0, total: 1 },
      payloadMatch: 'NONE',
      supportingNodeIds: ['node-1'],
    };

    // The tracker rule only looks for TRACKING_INITIALIZATION
    const score = consistencyEngine.evaluateClaim(claim, [], [corr]);
    expect(score.state).toBe('UNKNOWN');
  });

  it('7. Contradicted claim ≠ replacement verdict', () => {
    // Policy denies sharing
    const policyNode = makeNode('DOCUMENT', { predicate: CLAIM_PREDICATES.SHARES_DATA, availability: 'EXPLICITLY_DENIED' });
    
    const res = resolveFullStack(CLAIM_PREDICATES.SHARES_DATA, [policyNode]);
    
    // It's CONTRADICTED in the engine, but the resolver BLOCKS it from becoming a verdict
    expect(res.eligibility).toBe('BLOCKED');
    expect(res.verdict).toBeUndefined();
  });

  it('8. Stale navigation ≠ current evidence', () => {
    const claim = ClaimFactory.fromBehavior('nav-NEW', 'Target', CLAIM_PREDICATES.SHARES_DATA);
    
    // Evidence from an old navigation
    const node = makeNode('NETWORK', { crossSite: true });
    node.navigationId = 'nav-OLD';

    const score = consistencyEngine.evaluateClaim(claim, [node], []);
    
    // Claim should not see the old evidence
    expect(score.state).toBe('UNKNOWN');
    expect(score.supportScore).toBe(0);
  });
});
