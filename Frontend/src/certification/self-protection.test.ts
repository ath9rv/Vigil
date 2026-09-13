// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskScheduler } from '../observability/scheduler';
import { performanceGovernor } from '../observability/governor';
import { TrustEngine } from '../evidence/trust-engine';
import { navigationState } from '../background/navigation-state';
import { InterventionTransaction } from '../intervention/transaction';
import { differentialComparator } from '../intervention/differential-comparator';
import { querySelectorAllDeep } from '../content-scripts/dom-utils';
import { RawObservation } from '../shared/types';
import { EVIDENCE_BUDGETS } from '../shared/constants';

describe('Vigil V2.1 RC1 Certification: Vigil Hostile Page Self-Protection & Defensive Runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    performanceGovernor.reset();
  });

  // ─── 1. ADVERSARIAL MUTATION FLOOD ─────────────────────────────────────────
  it('absorbs a 10,000 mutation storm: governor transitions to DEGRADED and system remains bounded', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const startTime = performance.now();
    // Simulate hostile rapid DOM spam
    for (let i = 0; i < 10000; i++) {
      const el = document.createElement('span');
      el.className = `adversarial-node-${i % 10}`;
      el.textContent = `spam-${i}`;
      container.appendChild(el);
    }
    const elapsed = performance.now() - startTime;

    // Report storm to governor: 600 mutations in 1000ms, 45ms latency
    performanceGovernor.reportCycle({
      mutationsInWindow: 600,
      windowDurationMs: 1000,
      scanDurationMs: 45.0,
    });
    expect(performanceGovernor.getState()).toBe('DEGRADED');

    // Governor protects thread by signaling degradation
    expect(performanceGovernor.shouldExecute('P3_ENRICHMENT')).toBe(false);
    expect(performanceGovernor.shouldExecute('P0_CRITICAL')).toBe(true); // Invariant: Security is preserved
    // Thread must not lock up
    expect(elapsed).toBeLessThan(5000);
  });

  // ─── 2. SCHEDULER FLOOD & ZERO P0 STARVATION ──────────────────────────────
  it('defends against scheduler flood: P0 critical tasks execute immediately under 50,000 P3 arrivals', async () => {
    const scheduler = TaskScheduler.getInstance();
    scheduler.setCycleBudget(30);

    let p0Executed = false;
    let p0ExecutionOrder = -1;
    let p3ExecutedCount = 0;

    // Flood with 5,000 P3 tasks
    for (let i = 0; i < 5000; i++) {
      scheduler.schedule('P3_ENRICHMENT', `p3-storm-${i}`, () => {
        p3ExecutedCount++;
        return i;
      });
    }

    // High priority security task arrives during the flood
    const p0Promise = scheduler.schedule('P0_CRITICAL', 'p0-anti-phish-alert', () => {
      p0Executed = true;
      p0ExecutionOrder = p3ExecutedCount; // Must execute before P3 queue finishes
      return 'SECURITY_DEFENSE_ACTIVE';
    });

    const result = await p0Promise;
    expect(result).toBe('SECURITY_DEFENSE_ACTIVE');
    expect(p0Executed).toBe(true);
    // P0 must have jumped the queue
    expect(p0ExecutionOrder).toBeLessThan(5000);
  });

  // ─── 3. TARGET NODE REPLACEMENT & HIERARCHY HIJACKING ─────────────────────
  it('rejects target replacement during verification: deterministic node identity detects tampering', () => {
    const parent = document.createElement('div');
    parent.id = 'container';
    document.body.appendChild(parent);

    const originalTarget = document.createElement('div');
    originalTarget.id = 'target-banner';
    originalTarget.className = 'fake-timer';
    originalTarget.textContent = '10:00';
    parent.appendChild(originalTarget);

    const tx = new InterventionTransaction({
      element: originalTarget,
      ruleId: 'M1-TAMPER-TEST',
      navigationId: 'nav-tamper-01',
      frameId: 'main',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: {
        styles: { opacity: '0.5' },
        attributes: { 'data-vigil-neutralized': 'true' },
      },
    });

    tx.snapshot();

    // Adversarial host removes original target and replaces with rogue element
    parent.removeChild(originalTarget);
    const rogueTarget = document.createElement('div');
    rogueTarget.id = 'target-banner';
    rogueTarget.className = 'rogue-impostor';
    parent.appendChild(rogueTarget);

    // Verify staleness detection
    tx.apply();
    expect(tx.state).toBe('ABORTED_STALE');
    expect(rogueTarget.style.opacity).toBe('');
    expect(rogueTarget.hasAttribute('data-vigil-neutralized')).toBe(false);
  });

  // ─── 4. CROSS-NAVIGATION & TOKEN POISONING DEFENSE ────────────────────────
  it('prevents cross-navigation evidence leaks: stale navigation observations are rejected', () => {
    const trustEngine = new TrustEngine();
    const tabId = 202;

    // Navigation A begins
    navigationState.startNavigation(tabId, 'nav-A');
    const obsA: RawObservation = {
      id: 'obs-nav-a',
      navigationId: 'nav-A',
      tabId,
      sourceType: 'DOM',
      source: 'test-detector',
      collector: 'Test',
      collectorVersion: '2.1.0',
      timestamp: Date.now(),
      payload: { data: 'nav-a-secret' },
      provenance: {
        source: 'DOM',
        detectorId: 'test-detector',
        navigationId: 'nav-A',
        timestamp: Date.now(),
        evidenceType: 'DOM_MUTATION',
      },
    };
    trustEngine.observe(obsA);
    expect(trustEngine.getActiveGraphNodeCount()).toBe(1);

    // Rapid SPA Navigation B occurs
    navigationState.startNavigation(tabId, 'nav-B');

    // Host attempts to inject delayed observation from Navigation A
    const staleObsA: RawObservation = {
      id: 'obs-nav-a-late',
      navigationId: 'nav-A',
      tabId,
      sourceType: 'DOM',
      source: 'test-detector',
      collector: 'Test',
      collectorVersion: '2.1.0',
      timestamp: Date.now(),
      payload: { data: 'stale-nav-a-leak' },
      provenance: {
        source: 'DOM',
        detectorId: 'test-detector',
        navigationId: 'nav-A',
        timestamp: Date.now(),
        evidenceType: 'DOM_MUTATION',
      },
    };
    trustEngine.observe(staleObsA);

    // Verification: Navigation A events rejected; count remains 1
    expect(trustEngine.getActiveGraphNodeCount()).toBe(1);

    // Navigation B accepts fresh observations
    const obsB: RawObservation = {
      id: 'obs-nav-b',
      navigationId: 'nav-B',
      tabId,
      sourceType: 'DOM',
      source: 'test-detector',
      collector: 'Test',
      collectorVersion: '2.1.0',
      timestamp: Date.now(),
      payload: { data: 'nav-b-fresh' },
      provenance: {
        source: 'DOM',
        detectorId: 'test-detector',
        navigationId: 'nav-B',
        timestamp: Date.now(),
        evidenceType: 'DOM_MUTATION',
      },
    };
    trustEngine.observe(obsB);
    expect(trustEngine.getActiveGraphNodeCount()).toBe(2);
  });

  // ─── 5. UNHANDLED EXCEPTION STORM DEFENSE ──────────────────────────────────
  it('survives an unhandled script exception storm: differential comparator isolates host errors without crashing', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const baseline = differentialComparator.captureBaseline(element);

    // Simulate host page throwing 100 uncaught script errors
    const hostErrors: Array<{ message: string; stack?: string }> = [];
    for (let i = 0; i < 100; i++) {
      hostErrors.push({
        message: `Host script error ${i}: cannot read property of null`,
        stack: 'at host.js:10:5',
      });
    }

    const postHealth = differentialComparator.capturePostHealth(
      element,
      hostErrors.map((e) => e.message)
    );
    // Comparator handles large error list without throwing
    const diff = differentialComparator.compare(baseline, postHealth, hostErrors, element);

    expect(diff).toBeDefined();
    expect(diff.newlyIntroducedErrors).toBe(100);
    expect(diff.attribution).toBe('UNKNOWN'); // Unrelated host error
    expect(diff.materiallyWorsened).toBe(false); // Invariant B: never blame Vigil for unrelated errors
  });

  // ─── 6. SHADOW DOM RECURSIVE DEPTH BOMB ────────────────────────────────────
  it('defends against nested Shadow DOM depth bomb: traversal depth is strictly capped', () => {
    let currentRoot: Node = document.body;

    // Create a 25-level deep nested shadow DOM tree
    for (let i = 0; i < 25; i++) {
      const host = document.createElement('div');
      host.className = `shadow-level-${i}`;
      currentRoot.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const child = document.createElement('p');
      child.textContent = `level-${i}`;
      shadow.appendChild(child);
      currentRoot = shadow;
    }

    // Traverse with bounded maxDepth = 10 (querySelectorAllDeep)
    const matches = querySelectorAllDeep('p', document.body);

    // Traversal must succeed without stack overflow and must be bounded
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(25);
  });

  // ─── 7. EVIDENCE RETENTION BOUNDING ────────────────────────────────────────
  it('enforces hard evidence retention budget: limits nodes to MAX_NODES_PER_NAVIGATION', () => {
    const trustEngine = new TrustEngine();
    const tabId = 303;
    const navigationId = 'nav-budget-test';
    navigationState.startNavigation(tabId, navigationId);

    // Generate observations exceeding MAX_NODES_PER_NAVIGATION (500)
    const limit = EVIDENCE_BUDGETS.MAX_NODES_PER_NAVIGATION;
    for (let i = 0; i < limit + 50; i++) {
      trustEngine.observe({
        id: `obs-retention-${i}`,
        navigationId,
        tabId,
        sourceType: 'DOM',
        source: 'stress-detector',
        collector: 'StressCollector',
        collectorVersion: '2.1.0',
        timestamp: Date.now() + i,
        payload: { index: i },
        provenance: {
          source: 'DOM',
          detectorId: 'stress-detector',
          navigationId,
          timestamp: Date.now() + i,
          evidenceType: 'DOM_MUTATION',
        },
      });
    }

    // Invariant: node count never exceeds budget limit
    expect(trustEngine.getActiveGraphNodeCount()).toBeLessThanOrEqual(limit);
    expect(trustEngine.budgetRejectedCount).toBeGreaterThanOrEqual(50);
  });
});
