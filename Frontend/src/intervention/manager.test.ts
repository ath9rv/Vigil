// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { InterventionManager } from './manager';

describe('Vigil Phase 1: InterventionManager & Reversibility', () => {
  let manager: InterventionManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InterventionManager.getInstance();
    manager.clear();
  });

  it('applies non-destructive mutation and records full provenance', () => {
    const el = document.createElement('div');
    el.id = 'test-countdown';
    el.textContent = '02:00';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    document.body.appendChild(el);

    const record = manager.applyIntervention(el, {
      reason: 'Manufactured countdown urgency',
      triggeringEvidenceIds: ['ev-1', 'ev-2'],
      confidenceState: 'HIGH',
      mutationType: 'VISUAL_FREEZE',
      freezeText: '02:00',
    });

    expect(record).toBeDefined();
    expect(record?.status).toBe('ACTIVE');
    expect(record?.reason).toBe('Manufactured countdown urgency');
    expect(record?.confidenceState).toBe('HIGH');
    expect(record?.rollbackAvailable).toBe(true);
    expect(record?.verificationResult).toBe('PASS');

    // Element attributes & non-destructive style overrides applied
    expect(el.getAttribute('data-vigil-neutralized')).toBe('true');
    expect(el.getAttribute('data-vigil-intervention-id')).toBe(record?.id);
    expect(el.style.opacity).toBe('0.3');
    expect(el.style.pointerEvents).toBe('none');
  });

  it('100% restores element to its pre-intervention state on rollback', () => {
    const el = document.createElement('div');
    el.id = 'urgent-banner';
    el.textContent = 'Hurry! 5 left';
    el.style.opacity = '0.9';
    el.style.pointerEvents = 'visible';
    el.setAttribute('title', 'Original Title');
    document.body.appendChild(el);

    const record = manager.applyIntervention(el, {
      reason: 'Artificial scarcity banner',
      confidenceState: 'HIGH',
      mutationType: 'SOFT_FADE',
    });

    expect(record).toBeDefined();
    expect(el.style.opacity).toBe('0.3');

    // Perform rollback
    const restored = manager.restoreIntervention(record!.id);
    expect(restored).toBe(true);

    // Verify original styles and attributes are restored
    expect(el.style.opacity).toBe('0.9');
    expect(el.style.pointerEvents).toBe('visible');
    expect(el.getAttribute('title')).toBe('Original Title');
    expect(el.hasAttribute('data-vigil-neutralized')).toBe(false);
    expect(el.hasAttribute('data-vigil-intervention-id')).toBe(false);

    // Record status updated
    const updatedRecord = manager.getIntervention(record!.id);
    expect(updatedRecord?.status).toBe('RESTORED');
  });

  it('restoreAll restores all active interventions', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    manager.applyIntervention(el1, { reason: 'R1' });
    manager.applyIntervention(el2, { reason: 'R2' });

    expect(manager.getActiveCount()).toBe(2);

    const restoredCount = manager.restoreAll();
    expect(restoredCount).toBe(2);
    expect(manager.getActiveCount()).toBe(0);
  });
});
