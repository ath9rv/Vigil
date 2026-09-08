// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { interventionManager } from './manager';
import { blastRadiusEstimator } from './blast-radius';
import { compatibilityVerifier } from './compatibility-verifier';
import { InterventionTransaction } from './transaction';
import { causalRollbackMonitor } from './auto-rollback';

describe('Vigil Phase 3: Transactional Intervention Safety & Verification Framework', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
    interventionManager.setProtectionMode('ACTIVE');
    interventionManager.setDryRun(false);
  });

  describe('1. Blast Radius Estimator & Two-Axis Decision Gate', () => {
    it('classifies payment and auth controls as strictly BLOCKED', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="password" id="user-password" value="secret" />
        <button type="submit">Log In</button>
      `;
      document.body.appendChild(form);

      const pwdInput = document.getElementById('user-password')!;
      const assessment = blastRadiusEstimator.assess(pwdInput);

      expect(assessment.safetyClass).toBe('BLOCKED');
      expect(assessment.compatibilityLevel).toBe(4);
      expect(assessment.riskScore).toBe(1.0);
      expect(assessment.hasPaymentOrAuth).toBe(true);

      // Decision gate check: even at CONFIRMED confidence, BLOCKED elements cannot be mutated
      const authorized = interventionManager.isAuthorizedToMutate('CONFIRMED', assessment.safetyClass);
      expect(authorized).toBe(false);
    });

    it('classifies subtrees with embedded iframes as RESTRICTED', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h3>Secure Checkout</h3>
        <iframe src="https://payment-gateway.test/frame"></iframe>
      `;
      document.body.appendChild(container);

      const assessment = blastRadiusEstimator.assess(container);
      expect(assessment.safetyClass).toBe('RESTRICTED');
      expect(assessment.hasCrossIframe).toBe(true);

      const authorized = interventionManager.isAuthorizedToMutate('HIGH', assessment.safetyClass);
      expect(authorized).toBe(false); // Requires user approval
    });

    it('classifies animated urgency countdowns as CAUTIOUS and permits mutation at HIGH confidence', () => {
      const timerBox = document.createElement('div');
      timerBox.className = 'timer-container';
      timerBox.innerHTML = `
        <span>Offer ends in: </span>
        <span class="countdown">04:59</span>
      `;
      document.body.appendChild(timerBox);

      const assessment = blastRadiusEstimator.assess(timerBox);
      expect(assessment.safetyClass).toBe('CAUTIOUS');
      expect(assessment.compatibilityLevel).toBe(2);

      const authorized = interventionManager.isAuthorizedToMutate('HIGH', assessment.safetyClass);
      expect(authorized).toBe(true);
    });

    it('blocks mutation when detection confidence is LOW or MODERATE regardless of safety class', () => {
      expect(interventionManager.isAuthorizedToMutate('LOW', 'SAFE')).toBe(false);
      expect(interventionManager.isAuthorizedToMutate('MODERATE', 'SAFE')).toBe(false);
      expect(interventionManager.isAuthorizedToMutate('CONTESTED', 'SAFE')).toBe(false);
    });
  });

  describe('2. Atomic Transactions, Mutation-Scoped Snapshots & Rollback', () => {
    it('executes mutation-scoped snapshot, apply, and perfect rollback', () => {
      const el = document.createElement('div');
      el.id = 'banner';
      el.style.opacity = '1';
      el.style.color = 'red'; // Property NOT scheduled for mutation
      document.body.appendChild(el);

      const transaction = new InterventionTransaction({
        element: el,
        ruleId: 'M1-TEST',
        navigationId: 'nav-test-1',
        safetyClass: 'SAFE',
        compatibilityLevel: 1,
        detectionConfidence: 'HIGH',
        plan: {
          styles: { opacity: '0.3', 'pointer-events': 'none' },
          attributes: { 'data-test-flag': 'active' },
        },
      });

      // 1. Snapshot
      transaction.snapshot();
      expect(transaction.record.state).toBe('SNAPSHOTTED');
      expect(transaction.record.preSnapshot?.inlineStyles.opacity).toBe('1');
      // color was not in plan, so it is not in the mutation-scoped snapshot
      expect(transaction.record.preSnapshot?.inlineStyles.color).toBeUndefined();

      // 2. Apply
      transaction.apply();
      expect(transaction.record.state).toBe('APPLIED');
      expect(el.style.opacity).toBe('0.3');
      expect(el.style.pointerEvents).toBe('none');
      expect(el.getAttribute('data-test-flag')).toBe('active');
      expect(el.style.color).toBe('red'); // Preserved untouched

      // 3. Rollback
      transaction.rollback('Test rollback');
      expect(transaction.record.state).toBe('ROLLED_BACK');
      expect(el.style.opacity).toBe('1');
      expect(el.style.pointerEvents).toBe('');
      expect(el.hasAttribute('data-test-flag')).toBe(false);
      expect(el.style.color).toBe('red');
    });
  });

  describe('3. Comparative Compatibility Verifier', () => {
    it('passes when geometry is preserved post-mutation', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const preGeo = compatibilityVerifier.captureGeometry(el);
      const check = compatibilityVerifier.verify(el, preGeo);

      expect(check.result).toBe('PASS');
      expect(check.geometryPreserved).toBe(true);
      expect(check.shiftClass).toBe('NO_SHIFT');
    });

    it('fails when target element is detached during mutation', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const preGeo = compatibilityVerifier.captureGeometry(el);

      // Simulate malicious or broken detachment
      el.remove();

      const check = compatibilityVerifier.verify(el, preGeo);
      expect(check.result).toBe('FAIL');
      expect(check.isAttached).toBe(false);
    });
  });

  describe('4. Dry-Run & Global Protection Modes', () => {
    it('simulates verification without altering the DOM in dry-run mode', () => {
      const timer = document.createElement('div');
      timer.id = 'dry-timer';
      timer.style.opacity = '1';
      document.body.appendChild(timer);

      interventionManager.setDryRun(true);

      const record = interventionManager.applyIntervention(timer, {
        reason: 'Simulated urgency neutralization',
        confidenceState: 'HIGH',
      });

      expect(record).not.toBeNull();
      expect(record?.verificationResult).toBe('PASS');
      // Crucial dry-run invariant: element styles in DOM were NOT modified
      expect(timer.style.opacity).toBe('1');
      expect(timer.style.pointerEvents).toBe('');
    });

    it('strictly degrades to advisory reports in OBSERVE_ONLY mode', () => {
      const timer = document.createElement('div');
      timer.style.opacity = '1';
      document.body.appendChild(timer);

      interventionManager.setProtectionMode('OBSERVE_ONLY');

      const record = interventionManager.applyIntervention(timer, {
        reason: 'Observe only test',
        confidenceState: 'HIGH',
      });

      expect(record?.mutationType).toBe('ATTRIBUTE_FLAG');
      expect(record?.reason).toContain('OBSERVE_ONLY_MODE');
      expect(timer.style.opacity).toBe('1'); // Unchanged
    });
  });

  describe('5. Causal Auto-Rollback Monitor', () => {
    it('ignores pre-existing page errors and links causal errors', () => {
      const monitor = causalRollbackMonitor;
      monitor.recordPreExistingError('TypeError: Cannot read properties of undefined at vendor.js:1');

      const target = document.createElement('div');
      target.id = 'target-widget';
      document.body.appendChild(target);

      // Unrelated error
      const unrelatedEvent = {
        message: 'NetworkError: Failed to fetch analytics',
        filename: 'analytics.js',
        lineno: 42,
        error: { stack: 'Error at analytics.js:42:10' },
      } as any;
      expect(monitor.isErrorCausallyLinked(unrelatedEvent, target)).toBe(false);

      // Causally linked error referencing the target element ID in its stack
      const causalEvent = {
        message: 'Uncaught Error in countdown runner',
        filename: 'app.js',
        lineno: 100,
        error: { stack: 'Error at updateTimer (app.js:100:15) targeting #target-widget' },
      } as any;
      expect(monitor.isErrorCausallyLinked(causalEvent, target)).toBe(true);
    });
  });
});
