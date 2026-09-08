// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldValidationHarness } from './field-validation';
import { interventionManager } from '../intervention/manager';
import { siteGovernance } from '../intervention/site-governance';

describe('Vigil V2.1 RC1 Certification: Field Validation Harness & Explain Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
    siteGovernance.clear();
    interventionManager.setProtectionMode('ACTIVE');
    interventionManager.setDryRun(false);
  });

  it('runs a 4-phase simulated field validation session on arbitrary DOM targets', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="target-banner" class="promo-urgency">Hurry! Only 2 items left!</div>
      <form id="payment-form">
        <input type="password" id="pass-field" />
      </form>
    `;
    document.body.appendChild(container);

    const banner = container.querySelector('#target-banner') as HTMLElement;
    const passInput = container.querySelector('#pass-field') as HTMLElement;

    const session = FieldValidationHarness.runSimulatedFieldSession(
      'https://testshop.com/product/123',
      [banner, passInput]
    );

    expect(session).toBeDefined();
    expect(session.domain).toBe('testshop.com');
    expect(session.vigilVersion).toBe('2.1.0-rc.1');
    expect(session.stages.off.loadTimeMs).toBeGreaterThan(0);
    expect(session.stages.observeOnly.domMutationsSuppressed).toBe(2);
    expect(session.stages.dryRun.plannedInterventionsCount).toBeGreaterThan(0);
    expect(session.verdict).toBe('REQUIRES_CALIBRATION'); // Because password field was blocked
  });

  it('generates an Explain Mode breakdown for an active intervention', () => {
    const target = document.createElement('div');
    target.className = 'timer-box';
    target.textContent = 'Sale ends in 05:00';
    document.body.appendChild(target);

    const record = interventionManager.applyIntervention(target, {
      reason: 'Manufactured countdown pattern',
      confidenceState: 'HIGH',
      triggeringEvidenceIds: ['EVID-001', 'EVID-002'],
    });

    expect(record).not.toBeNull();
    const explanation = FieldValidationHarness.explainIntervention(record!);

    expect(explanation.acted).toBe(true);
    expect(explanation.ruleName).toContain('Manufactured countdown pattern');
    expect(explanation.detectionConfidence).toBe('HIGH');
    expect(explanation.canRestore).toBe(true);
    expect(explanation.evidenceBulletPoints.length).toBeGreaterThanOrEqual(3);
    expect(explanation.evidenceBulletPoints.some((b) => b.includes('Diagnostic Compatibility'))).toBe(true);
  });

  it('generates an Explain Mode breakdown for a blocked payment control', () => {
    const input = document.createElement('input');
    input.type = 'password';
    document.body.appendChild(input);

    const record = interventionManager.applyIntervention(input, {
      reason: 'Deceptive timeout inside auth input',
      confidenceState: 'HIGH',
    });

    expect(record).not.toBeNull();
    const explanation = FieldValidationHarness.explainIntervention(record!);

    expect(explanation.acted).toBe(false);
    expect(explanation.canRestore).toBe(false);
    expect(explanation.evidenceBulletPoints.some((b) => b.includes('Safety Gate'))).toBe(true);
  });
});
