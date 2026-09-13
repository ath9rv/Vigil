import type { CounterfactualRule, CounterfactualEvaluation, CounterfactualResult } from '../types';
import type { TemporalEvent, CompetingHypothesis } from '../../v4/types';
import { StateSnapshotExtractor } from '../state-snapshot';
import { StateDiffComputer } from '../state-diff';

/**
 * ProgressionRemovalRule (CF-RULE-001)
 *
 * Evaluates: "If the checkout progression event had not occurred, would the additional fee still have appeared?"
 * Evaluates whether fee disclosure was progression-dependent.
 * Registers epistemic limitations: cannot establish intentional concealment.
 */
export class ProgressionRemovalRule implements CounterfactualRule {
  public readonly ruleId = 'CF-RULE-001';
  public readonly description = 'Evaluates fee persistence when checkout progression event is counterfactually removed.';

  public evaluate(
    hypothesis: CompetingHypothesis,
    navigationId: string,
    observedEvents: readonly TemporalEvent[],
    observedState: Readonly<Record<string, unknown>>
  ): CounterfactualEvaluation {
    const progressionEvents = observedEvents.filter(
      e => e.payload?.isProgression || e.source === 'checkout-progression' || e.payload?.action === 'checkout_continue'
    );
    const removedEventIds = progressionEvents.map(e => e.eventId);

    // If no progression occurred in observed timeline
    if (progressionEvents.length === 0) {
      return Object.freeze({
        evaluationId: `cf-eval-${this.ruleId}-${hypothesis.id}`,
        hypothesisId: hypothesis.id,
        navigationId,
        ruleId: this.ruleId,
        baselineObservations: observedEvents.map(e => e.observationId),
        removedEvents: Object.freeze([]),
        observedState,
        counterfactualState: observedState,
        stateDelta: Object.freeze([]),
        result: 'UNRESOLVED',
        limitations: Object.freeze([
          'No checkout progression event observed in timeline.',
          'Cannot establish intentional concealment or fraudulent corporate intent.',
        ]),
        timestamp: Date.now(),
      });
    }

    // Counterfactual state: pre-progression events only
    const cfSnapshot = StateSnapshotExtractor.extractPreProgression(observedEvents);
    const cfState = StateSnapshotExtractor.toRecord(cfSnapshot);
    const deltas = StateDiffComputer.diff(observedState, cfState);

    const obsFeesCount = Number(observedState.feesCount ?? 0);
    const cfFeesCount = Number(cfState.feesCount ?? 0);

    let result: CounterfactualResult = 'UNRESOLVED';
    const limitations: string[] = [
      'Cannot establish intentional concealment or fraudulent corporate intent.',
      'Subject to DOM mutation timing jitter.',
    ];

    if (hypothesis.type === 'DECEPTIVE_DRIP_PRICING') {
      if (obsFeesCount > 0 && cfFeesCount === 0) {
        // Fee exists in observed world, but disappears in counterfactual world without progression
        result = 'SUPPORTED';
      } else if (obsFeesCount > 0 && cfFeesCount > 0) {
        // Fee was already present before progression
        result = 'CONTRADICTED';
        limitations.push('Fee was already present prior to checkout progression.');
      } else {
        result = 'UNRESOLVED';
      }
    } else if (hypothesis.category === 'INNOCUOUS') {
      if (obsFeesCount > 0 && cfFeesCount === 0) {
        result = 'WEAKLY_SUPPORTED'; // Innocuous reasons can also appear at checkout (e.g. shipping tier)
      } else {
        result = 'UNRESOLVED';
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
