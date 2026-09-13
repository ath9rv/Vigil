import { describe, it, expect } from 'vitest';
import { DeterministicNLIAdapter } from '../deterministic-adapter';
import { HypothesisReconciler } from '../hypothesis-reconciler';
import { EvidenceGraph } from '../../graph';
import { mockEscalation } from './test-fixtures';
import type { CompetingHypothesis } from '../../v4/types';

describe('V4 Step 5: Graceful Degradation & Model Non-Authority (INV-V4-020, INV-V4-021)', () => {
  const adapter = new DeterministicNLIAdapter();
  const reconciler = new HypothesisReconciler();

  it('INV-V4-020: degrades cleanly to DEGRADED_UNRESOLVED on timeout with zero budget', async () => {
    const input = {
      premise: 'Some valid text',
      hypothesis: 'Mandatory fee',
      escalationRequest: mockEscalation(),
    };

    const assessment = await adapter.evaluate(input, { maxBudgetMs: 0 });
    expect(assessment.ambiguitySignal).toBe('DEGRADED_UNRESOLVED');
    expect(assessment.modelAssessmentConfidence).toBe(0);
  });

  it('INV-V4-021: degraded assessment leaves hypothesis completely unchanged (delta = 0)', async () => {
    const navId = 'nav-degraded-unchanged';
    const graph = new EvidenceGraph().createReadOnlySnapshot(navId);

    const hyp: CompetingHypothesis = {
      id: 'hyp-stable',
      navigationId: navId,
      type: 'DECEPTIVE_DRIP_PRICING',
      category: 'DECEPTIVE',
      status: 'PLAUSIBLE',
      confidence: 0.55,
      supportingCandidateIds: [],
      contradictoryCandidateIds: [],
      rationale: 'Baseline',
    };

    const input = {
      premise: 'Sample text',
      hypothesis: 'Hypothesis text',
      escalationRequest: mockEscalation(navId),
    };

    const degradedAssessment = await adapter.evaluate(input, { maxBudgetMs: 0 });
    const res = reconciler.reconcile(hyp, degradedAssessment, graph);

    expect(res.confidenceDelta).toBe(0);
    expect(res.adjustedHypothesis.confidence).toBe(0.55);
    expect(res.statusTransition).toBe('EVALUATION_DEGRADED');
  });
});
