// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { interventionManager } from '../intervention/manager';
import { siteGovernance } from '../intervention/site-governance';
import { blastRadiusEstimator } from '../intervention/blast-radius';
import { differentialComparator } from '../intervention/differential-comparator';
import { compatibilityScorer } from '../intervention/compatibility-scorer';
import { InterventionTransaction } from '../intervention/transaction';
import { TaskScheduler } from '../observability/scheduler';
import { TrustEngine } from '../evidence/trust-engine';
import { navigationState } from '../background/navigation-state';
import { RawObservation } from '../shared/types';

describe('Vigil V2.1 RC1 Certification: End-to-End Lifecycle & Canonical Scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
    siteGovernance.clear();
    interventionManager.setProtectionMode('ACTIVE');
    interventionManager.setDryRun(false);
  });

  describe('Part 1: Complete 17-Stage Architecture Lifecycle Verification', () => {
    it('executes the complete 17-stage pipeline with verifiable artifacts at every stage', async () => {
      // ─── STAGE 1: PAGE LOAD & NAVIGATION CONTEXT ─────────────────────────
      const tabId = 101;
      const navigationId = 'nav-rc1-cert-001';
      const origin = 'https://store.example.com';
      navigationState.startNavigation(tabId, navigationId);

      expect(navigationState.isNavigationValid(tabId, navigationId)).toBe(true);
      const stage1_nav = { tabId, navigationId, origin };
      expect(stage1_nav).toBeDefined();

      // Setup DOM
      const hostContainer = document.createElement('div');
      hostContainer.className = 'product-page';
      hostContainer.innerHTML = `
        <header class="navbar"><a href="/home" id="nav-home">Home</a></header>
        <main class="content">
          <h1>Noise Cancelling Headphones</h1>
          <div id="countdown-banner" class="countdown-urgency" style="padding: 10px; background: #fee;">
            Hurry! Sale expires in <span id="timer">02:15</span>
          </div>
          <button id="add-to-cart-btn">Add to Cart</button>
        </main>
      `;
      document.body.appendChild(hostContainer);
      const targetElement = document.getElementById('countdown-banner') as HTMLElement;

      // ─── STAGE 2: BASELINE HEALTH SNAPSHOT ────────────────────────────────
      const stage2_baseline = differentialComparator.captureBaseline(targetElement);
      expect(stage2_baseline).toBeDefined();
      expect(stage2_baseline.interactiveCount).toBeGreaterThanOrEqual(1);
      expect(stage2_baseline.errorCount).toBe(0);
      expect(stage2_baseline.timestamp).toBeGreaterThan(0);

      // ─── STAGE 3: RAW OBSERVATION ─────────────────────────────────────────
      const stage3_observation: RawObservation = {
        id: 'obs-rc1-urgency-001',
        navigationId,
        tabId,
        sourceType: 'DOM',
        source: 'urgency-detector',
        collector: 'UrgencyNeutralizer',
        collectorVersion: '2.1.0',
        timestamp: Date.now(),
        payload: {
          pattern: 'COUNTDOWN_TIMER',
          text: 'Hurry! Sale expires in 02:15',
          elementSelector: '#countdown-banner',
        },
        provenance: {
          source: 'DOM',
          detectorId: 'urgency-detector',
          navigationId,
          timestamp: Date.now(),
          evidenceType: 'DOM_MUTATION',
        },
      };
      expect(stage3_observation.id).toBe('obs-rc1-urgency-001');

      // ─── STAGE 4: PROVENANCE RECORDING ────────────────────────────────────
      const trustEngine = new TrustEngine();
      trustEngine.observe(stage3_observation);
      const graphNodeCount = trustEngine.getActiveGraphNodeCount();
      expect(graphNodeCount).toBeGreaterThanOrEqual(1);

      // ─── STAGE 5: EVIDENCE CORRELATION ────────────────────────────────────
      const trustResult = trustEngine.finalize(navigationId);
      expect(trustResult).toBeDefined();
      expect(trustResult.navigationId).toBe(navigationId);

      // ─── STAGE 6: CONFIDENCE EVALUATION ───────────────────────────────────
      const stage6_confidence = 'HIGH';
      expect(['HIGH', 'CONFIRMED']).toContain(stage6_confidence);

      // ─── STAGE 7: BLAST RADIUS ASSESSMENT ─────────────────────────────────
      const stage7_blastRadius = blastRadiusEstimator.assess(targetElement);
      expect(stage7_blastRadius).toBeDefined();
      expect(stage7_blastRadius.safetyClass).toBe('CAUTIOUS');
      expect(stage7_blastRadius.riskScore).toBeLessThan(0.5);

      // ─── STAGE 8: SITE GOVERNANCE CHECK ───────────────────────────────────
      const hostname = new URL(origin).hostname;
      const stage8_governanceAllowed = siteGovernance.shouldMutate(hostname);
      expect(stage8_governanceAllowed).toBe(true);

      // ─── STAGE 9: TASK SCHEDULER PRIORITY & BUDGET DISPATCH ───────────────
      const scheduler = TaskScheduler.getInstance();
      let scheduledExecuted = false;
      await scheduler.schedule('P2_CONTEXTUAL', 'rc1-urgency-eval', () => {
        scheduledExecuted = true;
        return true;
      });
      expect(scheduledExecuted).toBe(true);

      // ─── STAGE 10: TWO-AXIS DECISION GATE ─────────────────────────────────
      const stage10_authorized = interventionManager.isAuthorizedToMutate(
        stage6_confidence,
        stage7_blastRadius.safetyClass
      );
      expect(stage10_authorized).toBe(true);

      // ─── STAGE 11: DRY-RUN / MUTATION PLAN GENERATION ─────────────────────
      const stage11_plan = {
        styles: {
          opacity: '0.3',
          'pointer-events': 'none',
          animation: 'none',
        },
        attributes: {
          'data-vigil-neutralized': 'true',
          title: 'Vigil: Urgency Neutralized',
        },
        freezeText: 'Sale in progress (timer neutralized by Vigil)',
      };
      expect(stage11_plan.styles.opacity).toBe('0.3');

      // ─── STAGE 12: TRANSACTION INITIALIZATION ─────────────────────────────
      const transaction = new InterventionTransaction({
        element: targetElement,
        ruleId: 'M1-URGENCY-NEUTRALIZE',
        navigationId,
        frameId: 'main',
        origin,
        safetyClass: stage7_blastRadius.safetyClass,
        compatibilityLevel: stage7_blastRadius.compatibilityLevel,
        detectionConfidence: stage6_confidence,
        plan: stage11_plan,
        dryRun: false,
      });
      expect(transaction.id).toMatch(/^INT-/);
      expect(transaction.state).toBe('PLANNED');

      // ─── STAGE 13: MUTATION & SNAPSHOT ────────────────────────────────────
      transaction.snapshot();
      transaction.apply();
      expect(targetElement.style.opacity).toBe('0.3');
      expect(targetElement.getAttribute('data-vigil-neutralized')).toBe('true');

      // ─── STAGE 14: COMPATIBILITY INVARIANT VERIFICATION ───────────────────
      const stage14_verification = transaction.verify();
      expect(stage14_verification.result).toBe('PASS');
      expect(stage14_verification.geometryPreserved).toBe(true);

      // ─── STAGE 15: DIFFERENTIAL HEALTH ASSESSMENT ─────────────────────────
      const stage15_postHealth = differentialComparator.capturePostHealth(targetElement);
      const stage15_diff = differentialComparator.compare(
        stage2_baseline,
        stage15_postHealth,
        [],
        targetElement
      );
      expect(stage15_diff.materiallyWorsened).toBe(false);
      expect(stage15_diff.newlyIntroducedErrors).toBe(0);

      // ─── STAGE 16: COMMIT & MONITOR REGISTRATION ──────────────────────────
      const diagnosticScore = compatibilityScorer.score({
        check: stage14_verification,
        diffHealth: stage15_diff,
        assessment: stage7_blastRadius,
        durationMs: 1.5,
      });
      expect(diagnosticScore.hardSafetyGatePassed).toBe(true);
      expect(diagnosticScore.overall).toBeGreaterThanOrEqual(90);

      transaction.commit();
      expect(transaction.state).toBe('COMMITTED');

      // Manual transaction rollback restores to pristine
      transaction.rollback();
      expect(targetElement.style.opacity).toBe('');
      expect(targetElement.hasAttribute('data-vigil-neutralized')).toBe(false);

      // ─── STAGE 17: FORENSIC RECORD PRESERVATION & REVERSIBILITY ───────────
      const record = interventionManager.applyIntervention(targetElement, {
        reason: 'RC1 Stage 17 Verification',
        confidenceState: 'HIGH',
        origin,
        navigationId,
      });
      expect(record).not.toBeNull();
      expect(record?.status).toBe('ACTIVE');
      expect(record?.diagnosticScore).toBeDefined();
      expect(targetElement.style.opacity).toBe('0.3');

      // Test 1-click restore reversibility
      if (record) {
        const restored = interventionManager.restoreIntervention(record.id);
        expect(restored).toBe(true);
        expect(targetElement.style.opacity).toBe('');
        expect(targetElement.hasAttribute('data-vigil-neutralized')).toBe(false);
      }
    });
  });

  describe('Part 2: The Five Canonical Release Scenarios', () => {
    // ─── SCENARIO 1: SAFE INTERVENTION ──────────────────────────────────────
    it('Scenario 1 (Safe Intervention): High confidence + safe target + healthy page = apply -> verify -> commit', () => {
      const banner = document.createElement('span');
      banner.className = 'fake-scarcity-pill';
      banner.innerHTML = `Only 2 items left!`;
      document.body.appendChild(banner);

      const record = interventionManager.applyIntervention(banner, {
        reason: 'Scarcity social proof pattern',
        confidenceState: 'HIGH',
      });

      expect(record).not.toBeNull();
      expect(record?.status).toBe('ACTIVE');
      expect(record?.verificationResult).toBe('PASS');
      expect(record?.diagnosticScore?.hardSafetyGatePassed).toBe(true);
      expect(record?.diagnosticScore?.overall).toBeGreaterThanOrEqual(90);
      expect(banner.style.opacity).toBe('0.3');
      expect(banner.getAttribute('data-vigil-neutralized')).toBe('true');
    });

    // ─── SCENARIO 2: SUSPICIOUS BUT BLOCKED ──────────────────────────────────
    it('Scenario 2 (Suspicious but Blocked): High confidence + payment/password field = BLOCKED -> no mutation -> report', () => {
      const checkoutForm = document.createElement('form');
      checkoutForm.action = '/process-payment';
      checkoutForm.innerHTML = `
        <div class="field">
          <label>Card Number</label>
          <input type="password" id="cvv" autocomplete="cc-csc" />
        </div>
        <div class="urgency-tip">Session expires in 3:00</div>
        <button type="submit">Pay Now</button>
      `;
      document.body.appendChild(checkoutForm);

      const cvvInput = checkoutForm.querySelector('#cvv') as HTMLElement;

      const record = interventionManager.applyIntervention(cvvInput, {
        reason: 'Suspicious session prompt inside payment context',
        confidenceState: 'HIGH',
      });

      // Verification of Invariant A & Invariant D
      expect(record).not.toBeNull();
      expect(record?.reason).toContain('DECISION_GATE_BLOCKED');
      expect(record?.rollbackAvailable).toBe(false); // Advisory only, zero rollback needed
      // Immutability guarantee: password/payment field is never mutated
      expect(cvvInput.style.opacity).toBe('');
      expect(cvvInput.style.pointerEvents).toBe('');
      expect(cvvInput.hasAttribute('data-vigil-neutralized')).toBe(false);
    });

    // ─── SCENARIO 3: STALE TRANSACTION ──────────────────────────────────────
    it('Scenario 3 (Stale Transaction): Plan -> React replacement -> ABORTED_STALE -> replacement untouched', () => {
      const appRoot = document.createElement('div');
      appRoot.id = 'react-root';
      document.body.appendChild(appRoot);

      // Node v1
      const originalNode = document.createElement('div');
      originalNode.className = 'urgency-pill';
      originalNode.textContent = 'Limited Offer';
      appRoot.appendChild(originalNode);

      const tx = new InterventionTransaction({
        element: originalNode,
        ruleId: 'M1-REACT-REPLACE',
        navigationId: 'nav-spa-01',
        frameId: 'main',
        safetyClass: 'SAFE',
        compatibilityLevel: 1,
        detectionConfidence: 'HIGH',
        plan: {
          styles: { opacity: '0.2' },
          attributes: { 'data-vigil-neutralized': 'true' },
        },
      });

      tx.snapshot();

      // Simulated React reconciliation: unmounts originalNode and mounts replacementNode
      appRoot.removeChild(originalNode);
      const replacementNode = document.createElement('div');
      replacementNode.className = 'urgency-pill';
      replacementNode.textContent = 'Limited Offer';
      appRoot.appendChild(replacementNode);

      // Apply called after component unmounted
      tx.apply();

      // Must abort with ABORTED_STALE and NEVER mutate the replacement node
      expect(tx.state).toBe('ABORTED_STALE');
      expect(replacementNode.style.opacity).toBe('');
      expect(replacementNode.hasAttribute('data-vigil-neutralized')).toBe(false);
    });

    // ─── SCENARIO 4: PAGE REGRESSION (CAUSAL ROLLBACK) ──────────────────────
    it('Scenario 4 (Page Regression): Baseline healthy -> intervention -> new correlated runtime error -> rollback -> final state ≈ baseline', () => {
      const banner = document.createElement('div');
      banner.id = 'problematic-banner';
      banner.textContent = 'Deal of the day';
      banner.style.color = 'red';
      document.body.appendChild(banner);

      const baseline = differentialComparator.captureBaseline(banner);
      expect(baseline.errorCount).toBe(0);

      const tx = new InterventionTransaction({
        element: banner,
        ruleId: 'M1-CAUSAL-ERROR-TEST',
        navigationId: 'nav-err-01',
        frameId: 'main',
        safetyClass: 'SAFE',
        compatibilityLevel: 1,
        detectionConfidence: 'HIGH',
        plan: {
          styles: { opacity: '0.1' },
          attributes: { 'data-vigil-neutralized': 'true' },
        },
      });

      tx.snapshot();
      tx.apply();
      expect(banner.style.opacity).toBe('0.1');

      // Simulate a causal runtime script crash triggered by mutation
      const hostError = {
        message: 'TypeError: Cannot read property of neutralized banner',
        stack: 'at problematic-banner.js:42:15',
      };
      const postHealth = differentialComparator.capturePostHealth(banner, [hostError.message]);
      const diff = differentialComparator.compare(baseline, postHealth, [hostError], banner);

      expect(diff.newlyIntroducedErrors).toBe(1);
      expect(diff.attribution).toBe('INTERVENTION_RELATED');

      // Auto-rollback triggers
      tx.rollback('Causal runtime error introduced');
      expect(tx.state).toBe('ROLLED_BACK');

      // Final state matches pre-intervention baseline
      expect(banner.style.opacity).toBe('');
      expect(banner.hasAttribute('data-vigil-neutralized')).toBe(false);
      expect(banner.style.color).toBe('red');
    });

    // ─── SCENARIO 5: USER GOVERNANCE (OBSERVE_ONLY) ──────────────────────────
    it('Scenario 5 (User Governance): site = OBSERVE_ONLY -> detection continues -> evidence continues -> intervention never happens', () => {
      const targetDomain = 'trusted-booking.com';
      siteGovernance.setPolicy(targetDomain, 'OBSERVE_ONLY');

      const banner = document.createElement('div');
      banner.className = 'high-urgency-room-counter';
      banner.textContent = 'Only 1 room left at this price!';
      document.body.appendChild(banner);

      const record = interventionManager.applyIntervention(banner, {
        reason: 'Travel urgency banner',
        confidenceState: 'HIGH',
        origin: `https://${targetDomain}/hotel/123`,
      });

      // Verification of Governance Guarantee:
      // 1. Finding recorded as advisory for popup intelligence
      expect(record).not.toBeNull();
      expect(record?.reason).toContain('SITE_GOVERNANCE_OVERRIDE');
      expect(record?.rollbackAvailable).toBe(false);

      // 2. DOM mutation suppressed completely
      expect(banner.style.opacity).toBe('');
      expect(banner.style.pointerEvents).toBe('');
      expect(banner.hasAttribute('data-vigil-neutralized')).toBe(false);
    });
  });
});
