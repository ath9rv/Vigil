import { describe, it, expect } from 'vitest';
import { DeterministicNLIAdapter } from '../deterministic-adapter';
import { mockEscalation } from './test-fixtures';

describe('V4 Step 5: Deterministic NLI Adapter (Step 5C/D)', () => {
  const adapter = new DeterministicNLIAdapter();

  it('classifies deceptive commercial semantics as SUPPORTS_DECEPTIVE', async () => {
    const input = {
      premise: 'Order summary: Subtotal $100, plus mandatory platform service fee $15 added.',
      hypothesis: 'Unannounced mandatory platform fee',
      escalationRequest: mockEscalation(),
    };

    const res = await adapter.evaluate(input);
    expect(res.ambiguitySignal).toBe('SUPPORTS_DECEPTIVE');
    expect(res.labelScores.ENTAILMENT).toBeGreaterThan(0.7);
    expect(res.latencyMs).toBeLessThan(10);
  });

  it('classifies innocuous selection semantics as SUPPORTS_INNOCUOUS', async () => {
    const input = {
      premise: 'User selected express shipping: optional upgrade of $20 applied.',
      hypothesis: 'Voluntary optional delivery upgrade',
      escalationRequest: mockEscalation(),
    };

    const res = await adapter.evaluate(input);
    expect(res.ambiguitySignal).toBe('SUPPORTS_INNOCUOUS');
    expect(res.labelScores.ENTAILMENT).toBeGreaterThan(0.7);
  });

  it('classifies neutral or conflicting text as EQUIVOCAL', async () => {
    const input = {
      premise: 'General terms and conditions apply to all purchases.',
      hypothesis: 'Hidden fee',
      escalationRequest: mockEscalation(),
    };

    const res = await adapter.evaluate(input);
    expect(res.ambiguitySignal).toBe('EQUIVOCAL');
    expect(res.labelScores.NEUTRAL).toBeGreaterThan(0.4);
  });
});
