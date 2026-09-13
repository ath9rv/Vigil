import type { CounterfactualRule, CounterfactualEvaluation, CounterfactualResult } from '../types';
import type { TemporalEvent, CompetingHypothesis } from '../../v4/types';
import { StateSnapshotExtractor } from '../state-snapshot';
import { StateDiffComputer } from '../state-diff';

/**
 * DisclosurePresenceRule (CF-RULE-003)
 *
 * Evaluates: "Did an upfront disclosure exist prior to checkout progression?"
 * Checks pre-progression timeline for asterisk notes, fee disclosures, or fine print.
 */
export class DisclosurePresenceRule implements CounterfactualRule {
  public readonly ruleId = 'CF-RULE-003';
  public readonly description = 'Evaluates whether equivalent fee disclosure was displayed prior to progression.';

  public evaluate(
    hypothesis: CompetingHypothesis,
    navigationId: string,
    observedEvents: readonly TemporalEvent[],
    observedState: Readonly<Record<string, unknown>>
  ): CounterfactualEvaluation {
    const preSnapshot = StateSnapshotExtractor.extractPreProgression(observedEvents);
    const disclosuresCount = preSnapshot.disclosures.length;

    const cfState = Object.freeze({
      ...observedState,
      disclosuresCount: 0,
    });
    const deltas = StateDiffComputer.diff(observedState, cfState);

    let result: CounterfactualResult = 'UNRESOLVED';
    const limitations: string[] = [
      'Disclosures hidden inside collapsed accordions, tooltips, or external links cannot be proven absent.',
      'Heuristic disclosure matching is bounded by recorded textual observations.',
    ];

    const obsFeesCount = Number(observedState.feesCount ?? 0);

    if (hypothesis.type === 'DECEPTIVE_DRIP_PRICING') {
      if (obsFeesCount === 0 || observedEvents.length === 0) {
        result = 'UNRESOLVED';
        limitations.push('No fees observed in baseline state to evaluate disclosure presence.');
      } else if (disclosuresCount === 0) {
        // No disclosure existed prior to progression
        result = 'SUPPORTED';
      } else {
        // Disclosures were present prior to progression
        result = 'CONTRADICTED';
        limitations.push('Upfront disclosure was detected prior to checkout progression.');
      }
    } else if (hypothesis.type === 'INNOCUOUS_REGIONAL_TAX') {
      const taxItemized = Boolean(observedState.taxItemizedSeparately);
      if (taxItemized) {
        result = 'SUPPORTED';
      } else {
        result = 'WEAKLY_SUPPORTED';
      }
    }

    return Object.freeze({
      evaluationId: `cf-eval-${this.ruleId}-${hypothesis.id}`,
      hypothesisId: hypothesis.id,
      navigationId,
      ruleId: this.ruleId,
      baselineObservations: observedEvents.map(e => e.observationId),
      removedEvents: Object.freeze([]),
      observedState,
      counterfactualState: cfState,
      stateDelta: deltas,
      result,
      limitations: Object.freeze(limitations),
      timestamp: Date.now(),
    });
  }
}
