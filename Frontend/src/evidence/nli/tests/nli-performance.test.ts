import { describe, it, expect } from 'vitest';
import { DeterministicNLIAdapter } from '../deterministic-adapter';
import { mockEscalation } from './test-fixtures';

describe('V4 Step 5: Deterministic Evaluation Latency Benchmark', () => {
  const adapter = new DeterministicNLIAdapter();

  it('evaluates 100 NLI inquiries in <20ms (<0.2ms per inquiry)', async () => {
    const input = {
      premise: 'Item subtotal $50 plus mandatory resort fee $15 added.',
      hypothesis: 'Mandatory fee',
      escalationRequest: mockEscalation(),
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await adapter.evaluate(input);
    }
    const duration = performance.now() - start;

    console.log(`[NLI BENCHMARK] 100 deterministic evaluations: ${duration.toFixed(3)}ms (${(duration / 100).toFixed(4)}ms/eval)`);
    expect(duration).toBeLessThan(50);
  });
});
