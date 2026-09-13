import { describe, it, expect } from 'vitest';
import { DeterministicNLIAdapter } from '../deterministic-adapter';
import { mockEscalation } from './test-fixtures';

describe('V4 Step 5: NLI Contract Authority & Output Boundary (INV-V4-017, INV-V4-021)', () => {
  const adapter = new DeterministicNLIAdapter();

  it('INV-V4-017: NLI evaluator produces advisory assessment without Verdict or Finding properties', async () => {
    const input = {
      premise: 'Plus mandatory cleaning fee of $15 added at checkout',
      hypothesis: 'This text describes a mandatory undisclosed fee',
      escalationRequest: mockEscalation(),
    };

    const assessment = await adapter.evaluate(input);

    expect(assessment.modelId).toBe('xenova-nli-deberta-v3-xsmall');
    expect(assessment.ambiguitySignal).toBe('SUPPORTS_DECEPTIVE');

    // Strict contract boundary
    expect((assessment as any).verdict).toBeUndefined();
    expect((assessment as any).finding).toBeUndefined();
    expect(assessment.limitations.some(l => l.includes('INV-V4-017'))).toBe(true);
  });

  it('Distinguishes model assessment confidence from Vigil final epistemic confidence', async () => {
    const input = {
      premise: 'Mandatory resort fee $25 per night',
      hypothesis: 'Mandatory fee',
      escalationRequest: mockEscalation(),
    };

    const assessment = await adapter.evaluate(input);

    // Named modelAssessmentConfidence, NOT final confidence
    expect(assessment.modelAssessmentConfidence).toBeGreaterThan(0.7);
    expect((assessment as any).confidence).toBeUndefined();
    expect(assessment.limitations.some(l => l.includes('Model assessment confidence reflects linguistic alignment only'))).toBe(true);
  });

  it('INV-V4-021: model assessment carries non-authority disclaimer', async () => {
    const input = {
      premise: 'Optional express delivery',
      hypothesis: 'Optional selection',
      escalationRequest: mockEscalation(),
    };

    const assessment = await adapter.evaluate(input);
    expect(assessment.limitations.some(l => l.includes('INV-V4-016'))).toBe(true);
  });
});
