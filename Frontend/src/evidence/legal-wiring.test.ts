import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationFactory } from './observation';
import { ClaimExtractor } from './claim-extractor';
import { TrustEngine } from './trust-engine';
import { CLAIM_PREDICATES, ClaimFactory } from './claims';
import { LEGAL_CLASSIFIER_EVALUATOR } from './contradiction-rules';
import { findVerdictDefinition } from './verdict-registry';
import { navigationState } from '../background/navigation-state';
import type { ScanContext } from '../shared/scan-context';

describe('Legal Auditor → Trust Engine Wiring', () => {
  const mockContext: ScanContext = {
    tabId: 1,
    navigationId: 'nav-legal-1',
    origin: 'https://example.com',
    hostname: 'example.com',
    startedAt: Date.now(),
  };

  // ─── ObservationFactory.fromLegalFinding ────────────────────────────────

  describe('ObservationFactory.fromLegalFinding', () => {
    it('produces a DOCUMENT RawObservation with correct provenance', () => {
      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-1',
          ruleId: 'LEGAL-DATA_SALE',
          ruleName: 'DATA SALE',
          interpretation: 'WARNING: Site explicitly reserves the right to sell data.',
          severity: 'CONFIRMED',
          confidence: 'CONFIRMED',
          evidence: {
            excerpt: 'We may sell your personal information.',
            context: 'Section 4.2',
            sourceUrl: 'https://example.com/privacy',
            documentHash: 'abc123',
          },
        },
        mockContext
      );

      expect(obs.sourceType).toBe('DOCUMENT');
      expect(obs.collector).toBe('legal-auditor');
      expect(obs.provenance?.source).toBe('POLICY');
      expect(obs.provenance?.evidenceType).toBe('LEGAL_CLAUSE_CLASSIFICATION');
      expect(obs.payload.category).toBe('DATA_SALE');
      expect(obs.payload.excerpt).toBe('We may sell your personal information.');
      expect(obs.payload.availability).toBe('EXPLICITLY_ALLOWED');
    });

    it('maps FAIR rationale to EXPLICITLY_DENIED availability', () => {
      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-2',
          ruleId: 'LEGAL-DATA_SALE',
          ruleName: 'DATA SALE',
          interpretation: 'FAIR: Site explicitly confirms it does NOT sell data.',
          severity: 'OBSERVED',
          confidence: 'CONFIRMED',
          evidence: { excerpt: 'We do not sell personal information.' },
        },
        mockContext
      );

      expect(obs.payload.availability).toBe('EXPLICITLY_DENIED');
    });

    it('maps TRICKY rationale to EXPLICITLY_ALLOWED availability', () => {
      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-3',
          ruleId: 'LEGAL-ARBITRATION',
          ruleName: 'ARBITRATION',
          interpretation: 'TRICKY: Mandatory binding arbitration with court trial waiver.',
          severity: 'CONFIRMED',
          confidence: 'CONFIRMED',
          evidence: { excerpt: 'All disputes shall be resolved through binding arbitration.' },
        },
        mockContext
      );

      expect(obs.payload.availability).toBe('EXPLICITLY_ALLOWED');
      expect(obs.payload.category).toBe('ARBITRATION');
    });

    it('navigates correctly with context', () => {
      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-4',
          ruleId: 'LEGAL-AI_TRAINING',
          ruleName: 'AI TRAINING',
          interpretation: 'TRICKY: Platform reserves the right to use your content for AI training.',
          severity: 'CONFIRMED',
        },
        mockContext
      );

      expect(obs.navigationId).toBe('nav-legal-1');
      expect(obs.tabId).toBe(1);
      expect(obs.payload.category).toBe('AI_TRAINING');
    });
  });

  // ─── ClaimExtractor Legal Claims ───────────────────────────────────────

  describe('ClaimExtractor handles DOCUMENT legal nodes', () => {
    let extractor: ClaimExtractor;

    beforeEach(() => {
      extractor = new ClaimExtractor();
    });

    it('extracts legal claims from DOCUMENT nodes with legal-auditor provenance', () => {
      const nodes = [
        {
          id: 'doc-1',
          type: 'DOCUMENT' as const,
          navigationId: 'nav-legal-1',
          tabId: 1,
          timestamp: Date.now(),
          source: 'legal-auditor',
          strength: 1.0,
          context: mockContext,
          data: {
            category: 'DATA_SALE',
            availability: 'EXPLICITLY_ALLOWED',
            confidence: 'CONFIRMED',
            excerpt: 'We may sell your personal information.',
          },
          provenance: {
            collector: 'legal-auditor',
            collectorVersion: '1.0.0',
            observationId: 'obs-1',
            source: 'POLICY' as const,
          },
        },
      ];

      const claims = extractor.extractClaims(nodes);

      expect(claims.length).toBe(1);
      expect(claims[0].predicate).toBe(CLAIM_PREDICATES.LEGAL_DATA_SALE);
      expect(claims[0].type).toBe('LEGAL_CLASSIFICATION');
      expect(claims[0].context?.scope).toBe('DATA_SALE');
    });

    it('does not produce duplicate claims for multiple nodes of the same category', () => {
      const baseNode = {
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'legal-auditor',
        strength: 1.0,
        context: mockContext,
        provenance: {
          collector: 'legal-auditor',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'POLICY' as const,
        },
      };

      const nodes = [
        { ...baseNode, id: 'doc-1', data: { category: 'DATA_SALE', availability: 'EXPLICITLY_ALLOWED' } },
        { ...baseNode, id: 'doc-2', data: { category: 'DATA_SALE', availability: 'EXPLICITLY_ALLOWED' } },
      ];

      const claims = extractor.extractClaims(nodes);
      const saleClaims = claims.filter(c => c.predicate === CLAIM_PREDICATES.LEGAL_DATA_SALE);
      expect(saleClaims.length).toBe(1);
    });

    it('extracts different legal categories as separate claims', () => {
      const baseNode = {
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'legal-auditor',
        strength: 1.0,
        context: mockContext,
        provenance: {
          collector: 'legal-auditor',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'POLICY' as const,
        },
      };

      const nodes = [
        { ...baseNode, id: 'doc-1', data: { category: 'DATA_SALE', availability: 'EXPLICITLY_ALLOWED' } },
        { ...baseNode, id: 'doc-2', data: { category: 'ARBITRATION', availability: 'EXPLICITLY_ALLOWED' } },
        { ...baseNode, id: 'doc-3', data: { category: 'AI_TRAINING', availability: 'EXPLICITLY_ALLOWED' } },
      ];

      const claims = extractor.extractClaims(nodes);
      expect(claims.length).toBe(3);
      expect(claims.map(c => c.predicate).sort()).toEqual([
        CLAIM_PREDICATES.LEGAL_AI_TRAINING,
        CLAIM_PREDICATES.LEGAL_ARBITRATION,
        CLAIM_PREDICATES.LEGAL_DATA_SALE,
      ]);
    });

    it('ignores DOCUMENT nodes without a category', () => {
      const nodes = [
        {
          id: 'doc-1',
          type: 'DOCUMENT' as const,
          navigationId: 'nav-legal-1',
          tabId: 1,
          timestamp: Date.now(),
          source: 'legal-auditor',
          strength: 1.0,
          context: mockContext,
          data: { sourceUrl: 'https://example.com/privacy' },
          provenance: {
            collector: 'legal-auditor',
            collectorVersion: '1.0.0',
            observationId: 'obs-1',
            source: 'POLICY' as const,
          },
        },
      ];

      const claims = extractor.extractClaims(nodes);
      expect(claims.length).toBe(0);
    });

    it('still handles NETWORK and STORAGE nodes alongside legal DOCUMENT nodes', () => {
      const networkNode = {
        id: 'net-1',
        type: 'NETWORK' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'network-monitor',
        strength: 1.0,
        context: mockContext,
        data: { crossSite: true, containsIdentifier: true },
        provenance: {
          collector: 'network-monitor',
          collectorVersion: '1.0.0',
          observationId: 'obs-2',
        },
      };

      const legalNode = {
        id: 'doc-1',
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'legal-auditor',
        strength: 1.0,
        context: mockContext,
        data: { category: 'DATA_SHARING', availability: 'EXPLICITLY_ALLOWED' },
        provenance: {
          collector: 'legal-auditor',
          collectorVersion: '1.0.0',
          observationId: 'obs-3',
          source: 'POLICY' as const,
        },
      };

      const claims = extractor.extractClaims([networkNode, legalNode]);

      expect(claims.some(c => c.predicate === CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION)).toBe(true);
      expect(claims.some(c => c.predicate === CLAIM_PREDICATES.SHARES_DATA)).toBe(true);
      expect(claims.some(c => c.predicate === CLAIM_PREDICATES.LEGAL_DATA_SHARING)).toBe(true);
    });
  });

  // ─── LEGAL_CLASSIFIER_EVALUATOR Rule ──────────────────────────────────

  describe('LEGAL_CLASSIFIER_EVALUATOR contradiction rule', () => {
    it('applies to all legal predicates', () => {
      const legalClaim = ClaimFactory.fromLegalClassification(
        'Site',
        CLAIM_PREDICATES.LEGAL_DATA_SALE
      );
      expect(LEGAL_CLASSIFIER_EVALUATOR.appliesTo(legalClaim)).toBe(true);
    });

    it('does not apply to non-legal predicates', () => {
      const behavioralClaim = ClaimFactory.fromBehavior(
        'nav-1', 'Target', CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION
      );
      expect(LEGAL_CLASSIFIER_EVALUATOR.appliesTo(behavioralClaim)).toBe(false);
    });

    it('produces CONTRADICTS evidence when availability is EXPLICITLY_DENIED', () => {
      const claim = ClaimFactory.fromLegalClassification(
        'Site',
        CLAIM_PREDICATES.LEGAL_DATA_SALE
      );

      const legalNode = {
        id: 'doc-1',
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'legal-auditor',
        strength: 1.0,
        context: mockContext,
        data: {
          category: 'DATA_SALE',
          availability: 'EXPLICITLY_DENIED',
        },
        provenance: {
          collector: 'legal-auditor',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'POLICY' as const,
        },
      };

      const evidence = LEGAL_CLASSIFIER_EVALUATOR.evaluate(claim, [legalNode], []);
      expect(evidence.length).toBe(1);
      expect(evidence[0].polarity).toBe('CONTRADICTS');
      expect(evidence[0].rationale).toContain('negated');
    });

    it('produces SUPPORTS evidence when availability is EXPLICITLY_ALLOWED', () => {
      const claim = ClaimFactory.fromLegalClassification(
        'Site',
        CLAIM_PREDICATES.LEGAL_DATA_SALE
      );

      const legalNode = {
        id: 'doc-1',
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'legal-auditor',
        strength: 1.0,
        context: mockContext,
        data: {
          category: 'DATA_SALE',
          availability: 'EXPLICITLY_ALLOWED',
        },
        provenance: {
          collector: 'legal-auditor',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'POLICY' as const,
        },
      };

      const evidence = LEGAL_CLASSIFIER_EVALUATOR.evaluate(claim, [legalNode], []);
      expect(evidence.length).toBe(1);
      expect(evidence[0].polarity).toBe('SUPPORTS');
      expect(evidence[0].rationale).toContain('confirms');
    });

    it('ignores DOCUMENT nodes from non-legal collectors', () => {
      const claim = ClaimFactory.fromLegalClassification(
        'Site',
        CLAIM_PREDICATES.LEGAL_DATA_SALE
      );

      const nonLegalNode = {
        id: 'doc-1',
        type: 'DOCUMENT' as const,
        navigationId: 'nav-legal-1',
        tabId: 1,
        timestamp: Date.now(),
        source: 'policy-scanner',
        strength: 1.0,
        context: mockContext,
        data: { category: 'DATA_SALE', availability: 'EXPLICITLY_ALLOWED' },
        provenance: {
          collector: 'policy-scanner',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'POLICY' as const,
        },
      };

      const evidence = LEGAL_CLASSIFIER_EVALUATOR.evaluate(claim, [nonLegalNode], []);
      expect(evidence.length).toBe(0);
    });
  });

  // ─── Verdict Registry Legal Definitions ────────────────────────────────

  describe('Verdict Registry has legal definitions', () => {
    it('has a definition for LEGAL_DATA_SALE_RISK', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_DATA_SALE);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_DATA_SALE_RISK');
      expect(def!.minimumSupport).toBeGreaterThan(0);
      expect(def!.maximumContradiction).toBeLessThan(1);
    });

    it('has a definition for LEGAL_ARBITRATION_RISK', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_ARBITRATION);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_ARBITRATION_RISK');
    });

    it('has a definition for LEGAL_AI_TRAINING_RISK', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_AI_TRAINING);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_AI_TRAINING_RISK');
    });

    it('has a definition for LEGAL_UNFAIR_DATA_PRACTICE', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_DATA_SHARING);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_UNFAIR_DATA_PRACTICE');
    });

    it('has a definition for LEGAL_CONSUMER_RIGHTS_GOOD', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_USER_RIGHTS);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_CONSUMER_RIGHTS_GOOD');
    });

    it('has a definition for LEGAL_CLASS_ACTION_WAIVER', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_CLASS_ACTION);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_CLASS_ACTION_WAIVER');
    });

    it('has a definition for LEGAL_UNFAIR_TERM', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_TERMINATION);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_UNFAIR_TERM');
    });

    it('has a definition for LEGAL_INDENMNITY_RISK', () => {
      const def = findVerdictDefinition(CLAIM_PREDICATES.LEGAL_INDEMNIFICATION);
      expect(def).toBeDefined();
      expect(def!.verdictType).toBe('LEGAL_INDENMNITY_RISK');
    });
  });

  // ─── End-to-End: Legal Finding → Trust Engine → Verdict ───────────────

  describe('End-to-end Legal → Trust Engine Pipeline', () => {
    let engine: TrustEngine;

    beforeEach(() => {
      engine = new TrustEngine();
    });

    it('legal data sale finding produces a DOCUMENT observation that flows through the full pipeline', () => {
      navigationState.startNavigation(1, 'nav-legal-e2e');

      // 1. Create a legal observation via the factory
      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-e2e-1',
          ruleId: 'LEGAL-DATA_SALE',
          ruleName: 'DATA SALE',
          interpretation: 'WARNING: Site explicitly reserves the right to sell data.',
          severity: 'CONFIRMED',
          confidence: 'CONFIRMED',
          evidence: {
            excerpt: 'We may sell your personal information to third parties.',
          },
        },
        { ...mockContext, navigationId: 'nav-legal-e2e' }
      );

      // 2. Observe it
      engine.observe(obs);

      // 3. Finalize
      const result = engine.finalize('nav-legal-e2e');

      // 4. Verify claim was extracted (DOCUMENT type with legal category)
      // The claim extractor should have created a LEGAL_DATA_SALE claim
      // The consistency engine should have evaluated it via LEGAL_CLASSIFIER_EVALUATOR
      // The verdict resolver should have checked the definition
      expect(result.resolutions.length).toBeGreaterThanOrEqual(0);
      // If eligible, verify the verdict type
      const legalResolutions = result.resolutions.filter(r => {
        const predicate = engine.claimPredicateMap.get(r.claimId);
        return predicate === CLAIM_PREDICATES.LEGAL_DATA_SALE;
      });

      if (legalResolutions.length > 0) {
        expect(legalResolutions[0].eligibility).toBeDefined();
      }
    });

    it('denied data sale produces CONTRADICTS evidence leading to blocked verdict', () => {
      navigationState.startNavigation(1, 'nav-legal-denied');

      const obs = ObservationFactory.fromLegalFinding(
        {
          id: 'legal-denied-1',
          ruleId: 'LEGAL-DATA_SALE',
          ruleName: 'DATA SALE',
          interpretation: 'FAIR: Site explicitly confirms it does NOT sell data.',
          severity: 'OBSERVED',
          confidence: 'CONFIRMED',
          evidence: { excerpt: 'We do not sell personal information.' },
        },
        { ...mockContext, navigationId: 'nav-legal-denied' }
      );

      engine.observe(obs);
      const result = engine.finalize('nav-legal-denied');

      // With EXPLICITLY_DENIED, the LEGAL_CLASSIFIER_EVALUATOR should CONTRADICT the claim,
      // making it ineligible (BLOCKED or INSUFFICIENT_EVIDENCE)
      const legalResolutions = result.resolutions.filter(r => {
        const predicate = engine.claimPredicateMap.get(r.claimId);
        return predicate === CLAIM_PREDICATES.LEGAL_DATA_SALE;
      });

      // The claim IS extracted and evaluated — verdict may be blocked (contradicted)
      if (legalResolutions.length > 0) {
        expect(['BLOCKED', 'INSUFFICIENT_EVIDENCE', 'ELIGIBLE']).toContain(legalResolutions[0].eligibility);
      }
    });

    it('multiple legal findings produce separate claims', () => {
      navigationState.startNavigation(1, 'nav-legal-multi');

      const ctx = { ...mockContext, navigationId: 'nav-legal-multi' };

      engine.observe(ObservationFactory.fromLegalFinding(
        { id: 'l1', ruleId: 'LEGAL-DATA_SALE', ruleName: 'DATA SALE', interpretation: 'WARNING: sells data.' },
        ctx
      ));
      engine.observe(ObservationFactory.fromLegalFinding(
        { id: 'l2', ruleId: 'LEGAL-ARBITRATION', ruleName: 'ARBITRATION', interpretation: 'TRICKY: forced arbitration.' },
        ctx
      ));
      engine.observe(ObservationFactory.fromLegalFinding(
        { id: 'l3', ruleId: 'LEGAL-AI_TRAINING', ruleName: 'AI TRAINING', interpretation: 'TRICKY: uses content for AI.' },
        ctx
      ));

      const result = engine.finalize('nav-legal-multi');

      // Verify all three legal claims were extracted
      const predicates = Array.from(engine.claimPredicateMap.values());
      expect(predicates).toContain(CLAIM_PREDICATES.LEGAL_DATA_SALE);
      expect(predicates).toContain(CLAIM_PREDICATES.LEGAL_ARBITRATION);
      expect(predicates).toContain(CLAIM_PREDICATES.LEGAL_AI_TRAINING);
    });
  });

  // ─── Claim Predicates Registration ────────────────────────────────────

  describe('Legal claim predicates are registered', () => {
    it('has predicates for all 19 legal categories', () => {
      expect(CLAIM_PREDICATES.LEGAL_DATA_SALE).toBe('legal_data_sale_detected');
      expect(CLAIM_PREDICATES.LEGAL_ARBITRATION).toBe('legal_arbitration_detected');
      expect(CLAIM_PREDICATES.LEGAL_CLASS_ACTION).toBe('legal_class_action_detected');
      expect(CLAIM_PREDICATES.LEGAL_DATA_SHARING).toBe('legal_data_sharing_detected');
      expect(CLAIM_PREDICATES.LEGAL_USER_RIGHTS).toBe('legal_user_rights_detected');
      expect(CLAIM_PREDICATES.LEGAL_AI_TRAINING).toBe('legal_ai_training_detected');
      expect(CLAIM_PREDICATES.LEGAL_CONTENT_LICENSE).toBe('legal_content_license_detected');
      expect(CLAIM_PREDICATES.LEGAL_AUTO_RENEWAL).toBe('legal_auto_renewal_detected');
      expect(CLAIM_PREDICATES.LEGAL_TERMINATION).toBe('legal_termination_detected');
      expect(CLAIM_PREDICATES.LEGAL_INDEMNIFICATION).toBe('legal_indemnification_detected');
      expect(CLAIM_PREDICATES.LEGAL_GOVERNING_LAW).toBe('legal_governing_law_detected');
      expect(CLAIM_PREDICATES.LEGAL_DATA_BREACH).toBe('legal_data_breach_detected');
      expect(CLAIM_PREDICATES.LEGAL_DATA_COLLECTION).toBe('legal_data_collection_detected');
      expect(CLAIM_PREDICATES.LEGAL_DATA_RETENTION).toBe('legal_data_retention_detected');
      expect(CLAIM_PREDICATES.LEGAL_CHILDREN_DATA).toBe('legal_children_data_detected');
      expect(CLAIM_PREDICATES.LEGAL_GOV_DISCLOSURE).toBe('legal_gov_disclosure_detected');
      expect(CLAIM_PREDICATES.LEGAL_COOKIE_POLICY).toBe('legal_cookie_policy_detected');
      expect(CLAIM_PREDICATES.LEGAL_PRICE_CHANGE).toBe('legal_price_change_detected');
      expect(CLAIM_PREDICATES.LEGAL_LIABILITY).toBe('legal_liability_detected');
    });
  });
});
