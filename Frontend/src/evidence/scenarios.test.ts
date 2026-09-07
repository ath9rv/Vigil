import { describe, it, expect, beforeEach } from 'vitest';
import { TrustEngine } from './trust-engine';
import { ObservationFactory } from './observation';
import { navigationState } from '../background/navigation-state';
import { CLAIM_PREDICATES } from './claims';
import type { ScanContext } from '../shared/scan-context';

import cleanScenario from '../../test-sites/scenarios/clean-negative-control.json';
import trackerScenario from '../../test-sites/scenarios/tracker-transmission.json';
import identifierScenario from '../../test-sites/scenarios/identifier-propagation.json';
import policyScenario from '../../test-sites/scenarios/policy-conflict.json';

describe('Vigil Test Laboratory: Executable Behavioral Scenarios', () => {
  let engine: TrustEngine;

  beforeEach(() => {
    engine = new TrustEngine();
  });

  function makeContext(navId: string, origin: string, hostname: string): ScanContext {
    return {
      tabId: 1,
      navigationId: navId,
      origin,
      hostname,
      startedAt: Date.now(),
    };
  }

  // ─── Scenario 1: Clean Baseline Negative Control ─────────────────────────
  it('executes Scenario: clean-negative-control (zero false positives)', () => {
    const navId = 'nav-clean';
    navigationState.startNavigation(1, navId);
    const ctx = makeContext(navId, cleanScenario.startOrigin, 'clean.test');

    // Feed clean page DOM observation
    engine.observe(ObservationFactory.fromDOMMutation(ctx, {
      type: 'CLEAN_PAGE',
      elementCount: 20,
    }));

    const result = engine.finalize(navId);

    // Negative control assertions
    expect(result.resolutions.length).toBe(0);
    expect(result.reports.length).toBe(0);

    // Assert that NONE of the forbidden claims were derived
    const registeredPredicates = Array.from(engine.claimPredicateMap.values());
    for (const forbidden of cleanScenario.forbidden) {
      expect(registeredPredicates).not.toContain(forbidden);
    }
  });

  // ─── Scenario 2: Tracker Transmission ───────────────────────────────────
  it('executes Scenario: tracker-transmission (cross-site beacon exfiltration)', () => {
    const navId = 'nav-tracker';
    navigationState.startNavigation(1, navId);
    const ctx = makeContext(navId, trackerScenario.startOrigin, 'tracker.test');

    // 1. Cross-site tracker request
    engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
      url: 'http://127.0.0.1:4174/collect',
      domain: 'analytics.test',
      crossSite: true,
      trackerCount: 1,
    }));

    // 2. Another cross-site telemetry ping
    engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
      url: 'http://127.0.0.1:4175/analytics',
      domain: 'metrics.test',
      crossSite: true,
    }));

    const result = engine.finalize(navId);

    // Verify expected claim was derived
    const activePredicates = result.resolutions.map(r => engine.claimPredicateMap.get(r.claimId));
    expect(activePredicates).toContain(CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION);

    // Verify forbidden claims were NOT emitted
    for (const forbidden of trackerScenario.forbidden) {
      expect(activePredicates).not.toContain(forbidden);
    }
  });

  // ─── Scenario 3: Identifier Propagation ──────────────────────────────────
  it('executes Scenario: identifier-propagation (persistent ID sent to 3rd party)', () => {
    const navId = 'nav-identifier';
    navigationState.startNavigation(1, navId);
    const ctx = makeContext(navId, identifierScenario.startOrigin, 'identifier.test');

    // 1. Storage of user ID
    engine.observe(ObservationFactory.fromCookieAction(ctx, {
      action: 'SET_COOKIE',
      cookieName: '_vigil_test_id',
      key: '_vigil_test_id',
      value: 'uid-987654321',
    }));

    // 2. Network exfiltration of that identifier
    engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
      url: 'http://127.0.0.1:4174/collect?id=uid-987654321',
      domain: 'data-broker.test',
      crossSite: true,
      containsIdentifier: true,
    }));

    const result = engine.finalize(navId);

    // Assert collects_identifier was derived
    const activePredicates = result.resolutions.map(r => engine.claimPredicateMap.get(r.claimId));
    expect(activePredicates).toContain(CLAIM_PREDICATES.COLLECTS_IDENTIFIER);
    expect(activePredicates).toContain(CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION);

    // Verify forbidden claims were NOT emitted
    expect(activePredicates).not.toContain(CLAIM_PREDICATES.SELLS_DATA);
  });

  // ─── Scenario 4: Policy Contradiction ───────────────────────────────────
  it('executes Scenario: policy-conflict (policy statement vs observed behavior)', () => {
    const navId = 'nav-policy';
    navigationState.startNavigation(1, navId);
    const ctx = makeContext(navId, policyScenario.startOrigin, 'privacy-policy.test');

    // 1. Policy statement explicitly denying third-party sharing
    engine.observe(ObservationFactory.fromPolicyObservation(ctx, {
      predicate: CLAIM_PREDICATES.SHARES_DATA,
      availability: 'EXPLICITLY_DENIED',
      statement: 'We do not share your personal information with third parties.',
    }));

    // 2. Behavioral observation of third-party sharing
    engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
      url: 'http://127.0.0.1:4174/track',
      domain: 'track.test',
      crossSite: true,
      containsPII: true,
    }));

    const result = engine.finalize(navId);

    // Find resolution for shares_personal_information
    const sharingResolution = result.resolutions.find(r => 
      engine.claimPredicateMap.get(r.claimId) === CLAIM_PREDICATES.SHARES_DATA
    );

    expect(sharingResolution).toBeDefined();
    // Due to the explicit contradiction between policy and network observation,
    // the claim state MUST be CONTESTED and NOT emit an unverified one-sided verdict
    expect(['CONTESTED', 'BLOCKED']).toContain(sharingResolution!.eligibility);

    // Forbidden check
    for (const forbidden of policyScenario.forbidden) {
      const activePredicates = result.resolutions.map(r => engine.claimPredicateMap.get(r.claimId));
      expect(activePredicates).not.toContain(forbidden);
    }
  });
});
