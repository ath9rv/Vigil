import type { TemporalEvent, CompetingHypothesis } from '../v4/types';

export type CounterfactualResult =
  | 'SUPPORTED'
  | 'WEAKLY_SUPPORTED'
  | 'UNRESOLVED'
  | 'CONTRADICTED'
  | 'INCOMPUTABLE';

export interface StateDelta {
  readonly property: string;
  readonly observedValue: unknown;
  readonly counterfactualValue: unknown;
  readonly deltaType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';
  readonly interpretation: string;
}

export interface CounterfactualEvaluation {
  readonly evaluationId: string;
  readonly hypothesisId: string;
  readonly navigationId: string;
  readonly ruleId: string;
  readonly baselineObservations: readonly string[];
  readonly removedEvents: readonly string[];
  readonly observedState: Readonly<Record<string, unknown>>;
  readonly counterfactualState: Readonly<Record<string, unknown>>;
  readonly stateDelta: readonly StateDelta[];
  readonly result: CounterfactualResult;
  readonly limitations: readonly string[];
  readonly timestamp: number;
}

export interface CounterfactualRule {
  readonly ruleId: string;
  readonly description: string;
  evaluate(
    hypothesis: CompetingHypothesis,
    navigationId: string,
    observedEvents: readonly TemporalEvent[],
    observedState: Readonly<Record<string, unknown>>
  ): CounterfactualEvaluation;
}

export interface CounterfactualEngineOptions {
  readonly maxBudgetMs?: number;
}

export interface CounterfactualAnalysisResult {
  readonly navigationId: string;
  readonly hypothesisId: string;
  readonly evaluations: readonly CounterfactualEvaluation[];
  readonly aggregateResult: CounterfactualResult;
  readonly governorYielded: boolean;
  readonly executionTimeMs: number;
}
