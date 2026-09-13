
import type { EscalationRequest } from '../../v4/types';

export const mockEscalation = (navId: string = 'nav-test'): EscalationRequest => Object.freeze({
  requestId: `esc-${navId}-1`,
  navigationId: navId,
  leadingHypothesisId: 'hyp-drip-1',
  candidateId: 'cand-1',
  boundedInputText: 'Plus mandatory cleaning fee of $15 added at checkout',
  sourceObservationIds: Object.freeze(['obs-1', 'obs-2']),
  competingHypothesisIds: Object.freeze(['hyp-tax-1']),
  deterministicContext: Object.freeze({ initialPrice: 100, finalPrice: 115 }),
  reason: 'Testing NLI contract boundary',
  timestamp: 1000,
});
