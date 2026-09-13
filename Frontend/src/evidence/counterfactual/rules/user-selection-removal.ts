import type { CounterfactualRule, CounterfactualEvaluation, CounterfactualResult } from '../types';
import type { TemporalEvent, CompetingHypothesis } from '../../v4/types';
import { StateSnapshotExtractor } from '../state-snapshot';
import { StateDiffComputer } from '../state-diff';

/**
 * UserSelectionRemovalRule (CF-RULE-002)
 *
 * Evaluates: "If voluntary user selections (shipping tier, addon, upgrade) are removed,
 * does the price delta persist?"
 * Distinguishes voluntary add-ons from involuntary / mandatory drip fees.
 */
export class UserSelectionRemovalRule implements CounterfactualRule {
  public readonly ruleId = 'CF-RULE-002';
  public readonly description = 'Evaluates price delta invariance when user voluntary selections are removed.';

  public evaluate(
    hypothesis: CompetingHypothesis,
    navigationId: string,
    observedEvents: readonly TemporalEvent[],
    observedState: Readonly<Record<string, unknown>>
  ): CounterfactualEvaluation {
    const userSelectionEvents = observedEvents.filter(
      e => e.payload?.userSelectedShippingTier || e.payload?.userSelectedAddon || e.type === 'USER_EVENT'
    );
    const removedEventIds = userSelectionEvents.map(e => e.eventId);
    const removedSet = new Set(removedEventIds);

    const cfSnapshot = StateSnapshotExtractor.extractWithoutEvents(observedEvents, removedSet);
    const cfState = StateSnapshotExtractor.toRecord(cfSnapshot);
    const deltas = StateDiffComputer.diff(observedState, cfState);

    const hasUserShipping = Boolean(observedState.userSelectedShipping);
    const hasUserAddon = Boolean(observedState.userSelectedAddon);
    const obsFeesCount = Number(observedState.feesCount ?? 0);

    let result: CounterfactualResult = 'UNRESOLVED';
    const limitations: string[] = [
      'Assumes user interaction event stream is complete within the observed navigation scope.',
      'Cannot evaluate subjective user intent behind interaction.',
    ];

    if (hypothesis.type === 'INNOCUOUS_SHIPPING_SELECTION') {
      if (hasUserShipping) {
        result = 'SUPPORTED';
      } else {
        result = 'CONTRADICTED';
        limitations.push('Zero user shipping selection observed in event stream.');
      }
    } else if (hypothesis.type === 'INNOCUOUS_OPTIONAL_UPGRADE') {
      if (hasUserAddon) {
        result = 'SUPPORTED';
      } else {
        result = 'CONTRADICTED';
        limitations.push('Zero user upgrade or addon selection observed in event stream.');
      }
    } else if (hypothesis.type === 'DECEPTIVE_DRIP_PRICING') {
      if (!hasUserShipping && !hasUserAddon && obsFeesCount > 0) {
        // Delta occurred despite NO user voluntary selections -> mandatory fee invariant to user choice
        result = 'SUPPORTED';
      } else if (hasUserShipping || hasUserAddon) {
        result = 'WEAKLY_SUPPORTED';
      }
    }

    return Object.freeze({
      evaluationId: `cf-eval-${this.ruleId}-${hypothesis.id}`,
      hypothesisId: hypothesis.id,
      navigationId,
      ruleId: this.ruleId,
      baselineObservations: observedEvents.map(e => e.observationId),
      removedEvents: Object.freeze(removedEventIds),
      observedState,
      counterfactualState: cfState,
      stateDelta: deltas,
      result,
      limitations: Object.freeze(limitations),
      timestamp: Date.now(),
    });
  }
}
