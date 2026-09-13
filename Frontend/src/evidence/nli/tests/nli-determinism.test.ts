import { describe, it, expect } from 'vitest';
import { DeterministicNLIAdapter } from '../deterministic-adapter';
import { mockEscalation } from './test-fixtures';

describe('V4 Step 5: Evaluation Determinism & Output Stability', () => {
  const adapter = new DeterministicNLIAdapter();

  it('produces 100% byte-for-byte identical classifications across 50 repeated runs', async () => {
    const input = {
      premise: 'Mandatory service fee of $12.50 added at payment step',
      hypothesis: 'Mandatory hidden fee',
      escalationRequest: mockEscalation(),
    };

    const first = await adapter.evaluate(input);
    for (let i = 0; i < 50; i++) {
      const repeated = await adapter.evaluate(input);
      expect(repeated.ambiguitySignal).toBe(first.ambiguitySignal);
      expect(repeated.labelScores.ENTAILMENT).toBe(first.labelScores.ENTAILMENT);
      expect(repeated.labelScores.NEUTRAL).toBe(first.labelScores.NEUTRAL);
      expect(repeated.labelScores.CONTRADICTION).toBe(first.labelScores.CONTRADICTION);
    }
  });
});
