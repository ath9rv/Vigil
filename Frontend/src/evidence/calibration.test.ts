import { describe, it, expect } from 'vitest';
import { CALIBRATION_BENCHMARKS } from './calibration';

describe('Vigil Phase 1: Calibration Benchmarks & Negative Controls', () => {
  it('defines structured negative controls for all four domains', () => {
    const urgencyCases = CALIBRATION_BENCHMARKS.filter(c => c.category === 'URGENCY');
    const consentCases = CALIBRATION_BENCHMARKS.filter(c => c.category === 'CONSENT');
    const trackingCases = CALIBRATION_BENCHMARKS.filter(c => c.category === 'TRACKING');
    const legalCases = CALIBRATION_BENCHMARKS.filter(c => c.category === 'LEGAL');

    expect(urgencyCases.length).toBeGreaterThanOrEqual(3);
    expect(consentCases.length).toBeGreaterThanOrEqual(1);
    expect(trackingCases.length).toBeGreaterThanOrEqual(1);
    expect(legalCases.length).toBeGreaterThanOrEqual(2);
  });

  it('negative controls mandate shouldIntervene === false', () => {
    const negativeControls = CALIBRATION_BENCHMARKS.filter(c => c.forbiddenVerdict && c.forbiddenVerdict.length > 0);
    for (const ctrl of negativeControls) {
      expect(ctrl.shouldIntervene).toBe(false);
      expect(ctrl.forbiddenVerdict).toBeDefined();
    }
  });

  it('positive interventions mandate expectedRollback === true', () => {
    const positiveInterventions = CALIBRATION_BENCHMARKS.filter(c => c.shouldIntervene === true);
    expect(positiveInterventions.length).toBeGreaterThanOrEqual(2);
    for (const pos of positiveInterventions) {
      expect(pos.expectedRollback).toBe(true);
      expect(pos.expectedConfidence).toMatch(/HIGH|CONFIRMED/);
    }
  });
});
