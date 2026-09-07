import { describe, it, expect, beforeEach } from 'vitest';
import { VerdictResolver } from './verdict-resolver';
import { ConsistencyEngine } from './contradiction';
import { ClaimFactory, CLAIM_PREDICATES } from './claims';
import type { ConsistencyScore, EvidenceClaim } from '../shared/types';
import type { EvidenceNode } from './graph';

const MOCK_CONTEXT = {
  hostname: 'example.com',
  url: 'https://example.com',
  tabId: 1,
  navigationId: 'nav-1',
  startedAt: Date.now(),
} as any;

describe('Phase 3: Verdict Resolver', () => {
  let resolver: VerdictResolver;

  beforeEach(() => {
    resolver = new VerdictResolver();
  });

  function makeNode(type: string, navigationId: string, data: any): EvidenceNode<any> {
    return {
      id: crypto.randomUUID(),
      type: type as any,
      navigationId,
      tabId: 1,
      timestamp: Date.now(),
      source: 'test',
      strength: 1.0,
      context: MOCK_CONTEXT,
      provenance: { observationId: 'obs-1', collector: 'test', collectorVersion: '1' },
      data,
    };
  }

  function supportedScore(nodeIds: string[]): ConsistencyScore {
    return {
      supportScore: 0.85,
      contradictionScore: 0.0,
      state: 'SUPPORTED',
      confidence: 0.85,
      supportingEvidenceIds: nodeIds,
      contradictingEvidenceIds: [],
    };
  }

  // ─── 1. ELIGIBLE verdict with full evidence chain ─────────────────────

  it('emits an ELIGIBLE verdict when support is strong', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const node = makeNode('NETWORK', 'nav-1', { crossSite: true });
    const score = supportedScore([node.id]);

    const result = resolver.resolve(claim, score, [node], []);

    expect(result.eligibility).toBe('ELIGIBLE');
    expect(result.verdict).toBeDefined();
    expect(result.verdict!.type).toBe('THIRD_PARTY_DATA_SHARING');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.supportingEvidenceIds).toContain(node.id);
    expect(result.explanation).toContain('Conclusion');
  });

  // ─── 2. BLOCKED from UNKNOWN ──────────────────────────────────────────

  it('blocks verdict when consistency state is UNKNOWN', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const score: ConsistencyScore = {
      supportScore: 0, contradictionScore: 0,
      state: 'UNKNOWN', confidence: 0,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
    };

    const result = resolver.resolve(claim, score, [], []);

    expect(result.eligibility).toBe('BLOCKED');
    expect(result.verdict).toBeUndefined();
    expect(result.confidence).toBe(0);
  });

  // ─── 3. BLOCKED from CONTESTED ────────────────────────────────────────

  it('blocks verdict when consistency state is CONTESTED', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const score: ConsistencyScore = {
      supportScore: 0.8, contradictionScore: 0.7,
      state: 'CONTESTED', confidence: 0.8,
      supportingEvidenceIds: ['n1'], contradictingEvidenceIds: ['n2'],
    };

    const result = resolver.resolve(claim, score, [], []);

    expect(result.eligibility).toBe('CONTESTED');
    expect(result.verdict).toBeUndefined();
  });

  // ─── 4. INSUFFICIENT_EVIDENCE ─────────────────────────────────────────

  it('returns INSUFFICIENT_EVIDENCE when support is below threshold', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    // Support is 0.50 which is below THIRD_PARTY_DATA_SHARING minimum of 0.70
    const score: ConsistencyScore = {
      supportScore: 0.50, contradictionScore: 0.0,
      state: 'SUPPORTED', confidence: 0.50,
      supportingEvidenceIds: ['n1'], contradictingEvidenceIds: [],
    };
    const node = makeNode('NETWORK', 'nav-1', {});

    const result = resolver.resolve(claim, score, [node], []);

    expect(result.eligibility).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.verdict).toBeUndefined();
  });

  // ─── 5. Rejected inferences recorded ──────────────────────────────────

  it('records rejected inferences when issuing a data sharing verdict', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const node = makeNode('NETWORK', 'nav-1', { crossSite: true });
    const score = supportedScore([node.id]);

    const result = resolver.resolve(claim, score, [node], []);

    expect(result.rejectedInferences.length).toBeGreaterThan(0);
    const saleRejection = result.rejectedInferences.find(
      r => r.claimPredicate === 'sells_personal_information'
    );
    expect(saleRejection).toBeDefined();
    expect(saleRejection!.reason).toContain('does not establish data sale');
  });

  // ─── 6. Evidence chain completeness ───────────────────────────────────

  it('includes all supporting and contradicting evidence IDs', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const node = makeNode('NETWORK', 'nav-1', { crossSite: true });
    const score: ConsistencyScore = {
      supportScore: 0.85, contradictionScore: 0.1,
      state: 'SUPPORTED', confidence: 0.85,
      supportingEvidenceIds: [node.id], contradictingEvidenceIds: ['contra-1'],
    };

    const result = resolver.resolve(claim, score, [node], []);

    expect(result.supportingEvidenceIds).toContain(node.id);
    expect(result.contradictingEvidenceIds).toContain('contra-1');
  });

  // ─── 7. Explanation output ────────────────────────────────────────────

  it('produces structured explanation text', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const node = makeNode('NETWORK', 'nav-1', { crossSite: true });
    const score = supportedScore([node.id]);

    const result = resolver.resolve(claim, score, [node], []);

    expect(result.explanation).toContain('Observed');
    expect(result.explanation).toContain('Consistency');
    expect(result.explanation).toContain('Conclusion');
    expect(result.explanation).toContain('Boundary');
  });

  // ─── 8. Navigation isolation ──────────────────────────────────────────

  it('respects navigation scoping for evidence node count', () => {
    const claim = ClaimFactory.fromBehavior('nav-A', 'Company', CLAIM_PREDICATES.COLLECTS_IDENTIFIER);
    // Nodes are from nav-B, not nav-A
    const node1 = makeNode('NETWORK', 'nav-B', {});
    const node2 = makeNode('STORAGE', 'nav-B', {});
    const score: ConsistencyScore = {
      supportScore: 0.90, contradictionScore: 0.0,
      state: 'SUPPORTED', confidence: 0.90,
      supportingEvidenceIds: [node1.id, node2.id], contradictingEvidenceIds: [],
    };

    const result = resolver.resolve(claim, score, [node1, node2], []);

    // Should fail the minimumEvidenceNodes check because nodes are from wrong nav
    expect(result.eligibility).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.verdict).toBeUndefined();
  });

  // ─── 9. CONTRADICTED claim does NOT automatically become ELIGIBLE ─────

  it('blocks a contradicted claim rather than generating a verdict', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const score: ConsistencyScore = {
      supportScore: 0.1, contradictionScore: 0.9,
      state: 'CONTRADICTED', confidence: 0.9,
      supportingEvidenceIds: [], contradictingEvidenceIds: ['policy-1'],
    };

    const result = resolver.resolve(claim, score, [], []);

    expect(result.eligibility).toBe('BLOCKED');
    expect(result.verdict).toBeUndefined();
  });

  // ─── 10. High confidence + UNKNOWN → still BLOCKED ───────────────────

  it('never lets high confidence override UNKNOWN state', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const score: ConsistencyScore = {
      supportScore: 0.95, contradictionScore: 0.0,
      state: 'UNKNOWN', confidence: 0.95,
      supportingEvidenceIds: ['n1'], contradictingEvidenceIds: [],
    };

    const result = resolver.resolve(claim, score, [], []);

    expect(result.eligibility).toBe('BLOCKED');
    expect(result.verdict).toBeUndefined();
    expect(result.confidence).toBe(0);
  });

  // ─── 11. Resolver performs zero state mutations ───────────────────────

  it('does not mutate its inputs', () => {
    const claim = ClaimFactory.fromBehavior('nav-1', 'Company', CLAIM_PREDICATES.SHARES_DATA);
    const node = makeNode('NETWORK', 'nav-1', { crossSite: true });
    const score = supportedScore([node.id]);

    const claimCopy = JSON.stringify(claim);
    const scoreCopy = JSON.stringify(score);
    const nodeCopy = JSON.stringify(node);

    resolver.resolve(claim, score, [node], []);

    expect(JSON.stringify(claim)).toBe(claimCopy);
    expect(JSON.stringify(score)).toBe(scoreCopy);
    expect(JSON.stringify(node)).toBe(nodeCopy);
  });

  // ─── 12. PERMANENT REGRESSION: sharing ≠ sale ────────────────────────

  describe('PERMANENT REGRESSION: Third-party sharing ≠ data sale', () => {
    it('sharing claim is ELIGIBLE but sale claim is BLOCKED', () => {
      const sharingClaim = ClaimFactory.fromBehavior('nav-1', 'Amazon', CLAIM_PREDICATES.SHARES_DATA);
      const saleClaim = ClaimFactory.fromBehavior('nav-1', 'Amazon', CLAIM_PREDICATES.SELLS_DATA);
      const node = makeNode('NETWORK', 'nav-1', { crossSite: true, domain: 'analytics.example' });

      // Sharing: strong support
      const sharingScore: ConsistencyScore = {
        supportScore: 0.85, contradictionScore: 0.0,
        state: 'SUPPORTED', confidence: 0.85,
        supportingEvidenceIds: [node.id], contradictingEvidenceIds: [],
      };

      // Sale: no support (standard network request does not support "sells data")
      const saleScore: ConsistencyScore = {
        supportScore: 0.03, contradictionScore: 0.0,
        state: 'UNSUPPORTED', confidence: 0.03,
        supportingEvidenceIds: [], contradictingEvidenceIds: [],
      };

      const sharingResult = resolver.resolve(sharingClaim, sharingScore, [node], []);
      const saleResult = resolver.resolve(saleClaim, saleScore, [node], []);

      // Sharing: ELIGIBLE
      expect(sharingResult.eligibility).toBe('ELIGIBLE');
      expect(sharingResult.verdict).toBeDefined();
      expect(sharingResult.verdict!.type).toBe('THIRD_PARTY_DATA_SHARING');

      // Sale: INSUFFICIENT_EVIDENCE (not ELIGIBLE)
      expect(saleResult.eligibility).toBe('INSUFFICIENT_EVIDENCE');
      expect(saleResult.verdict).toBeUndefined();
    });
  });
});
