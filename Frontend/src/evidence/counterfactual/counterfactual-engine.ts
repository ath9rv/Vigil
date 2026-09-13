import type { TemporalEventIndex } from '../temporal-event-index';
import type { CompetingHypothesis } from '../v4/types';
import type {
  CounterfactualRule,
  CounterfactualEvaluation,
  CounterfactualResult,
  CounterfactualAnalysisResult,
  CounterfactualEngineOptions,
} from './types';
import { StateSnapshotExtractor, type BoundedStateSnapshot } from './state-snapshot';
import { ProgressionRemovalRule } from './rules/progression-removal';
import { UserSelectionRemovalRule } from './rules/user-selection-removal';
import { DisclosurePresenceRule } from './rules/disclosure-presence';

const DEFAULT_BUDGET_MS = 25;

/**
 * CounterfactualEngine
 *
 * Coordinates counterfactual rule evaluations against observed evidence.
 *
 * Enforces:
 * - PERF-V4-005: Operates on bounded state deltas, not full DOM reconstruction.
 * - PERF-V4-006: Does not re-collect already-observed evidence.
 * - PERF-V4-007: Multiple hypotheses share cached immutable state snapshots.
 * - PERF-V4-008: P2 contextual reasoning: budget-bounded and yields safely under pressure.
 * - Epistemic Humility: Explicitly records limitations for every evaluation.
 */
export class CounterfactualEngine {
  private readonly rules: readonly CounterfactualRule[];
  private readonly snapshotCache = new Map<string, BoundedStateSnapshot>();

  constructor(customRules?: readonly CounterfactualRule[]) {
    this.rules = Object.freeze(
      customRules ?? [
        new ProgressionRemovalRule(),
        new UserSelectionRemovalRule(),
        new DisclosurePresenceRule(),
      ]
    );
  }

  /**
   * Evaluates counterfactual rules for a given hypothesis.
   */
  public evaluateHypothesis(
    hypothesis: CompetingHypothesis,
    navigationId: string,
    timeline: TemporalEventIndex,
    options: CounterfactualEngineOptions = {}
  ): CounterfactualAnalysisResult {
    const startTime = performance.now();
    const budgetMs = options.maxBudgetMs ?? DEFAULT_BUDGET_MS;
    const events = timeline.getEvents(navigationId);

    // PERF-V4-007: Cache bounded snapshot per navigation timeline across hypotheses
    let snapshot = this.snapshotCache.get(navigationId);
    if (!snapshot) {
      snapshot = StateSnapshotExtractor.extract(events);
      this.snapshotCache.set(navigationId, snapshot);
    }

    const observedState = StateSnapshotExtractor.toRecord(snapshot);
    const evaluations: CounterfactualEvaluation[] = [];
    let governorYielded = false;

    for (const rule of this.rules) {
      // PERF-V4-008: Enforce budget check before each rule execution
      if (performance.now() - startTime > budgetMs) {
        governorYielded = true;
        break;
      }

      const evaluation = rule.evaluate(hypothesis, navigationId, events, observedState);
      evaluations.push(evaluation);
    }

    const executionTimeMs = performance.now() - startTime;
    const aggregateResult = this.computeAggregateResult(evaluations, governorYielded);

    return Object.freeze({
      navigationId,
      hypothesisId: hypothesis.id,
      evaluations: Object.freeze(evaluations),
      aggregateResult,
      governorYielded,
      executionTimeMs,
    });
  }

  /**
   * Clears the snapshot cache (e.g. upon navigation cleanup).
   */
  public clearCache(navigationId?: string): void {
    if (navigationId) {
      this.snapshotCache.delete(navigationId);
    } else {
      this.snapshotCache.clear();
    }
  }

  private computeAggregateResult(
    evaluations: readonly CounterfactualEvaluation[],
    governorYielded: boolean
  ): CounterfactualResult {
    if (governorYielded && evaluations.length === 0) {
      return 'INCOMPUTABLE';
    }
    if (evaluations.length === 0) {
      return 'UNRESOLVED';
    }

    const hasContradiction = evaluations.some(e => e.result === 'CONTRADICTED');
    if (hasContradiction) {
      return 'CONTRADICTED';
    }

    const allSupported = evaluations.every(e => e.result === 'SUPPORTED');
    if (allSupported) {
      return 'SUPPORTED';
    }

    const hasSupport = evaluations.some(e => e.result === 'SUPPORTED' || e.result === 'WEAKLY_SUPPORTED');
    if (hasSupport) {
      return 'WEAKLY_SUPPORTED';
    }

    return 'UNRESOLVED';
  }
}
