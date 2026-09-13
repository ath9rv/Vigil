import type { StateDelta } from './types';

/**
 * StateDiffComputer
 *
 * Computes deterministic deltas between observed state and counterfactual state.
 * Emits typed StateDelta records with forensic interpretations.
 */
export class StateDiffComputer {
  public static diff(
    observed: Readonly<Record<string, unknown>>,
    counterfactual: Readonly<Record<string, unknown>>
  ): readonly StateDelta[] {
    const deltas: StateDelta[] = [];
    const allKeys = new Set([...Object.keys(observed), ...Object.keys(counterfactual)]);
    const sortedKeys = Array.from(allKeys).sort();

    for (const key of sortedKeys) {
      const obsVal = observed[key];
      const cfVal = counterfactual[key];

      const obsJson = JSON.stringify(obsVal);
      const cfJson = JSON.stringify(cfVal);

      if (obsJson === cfJson) {
        deltas.push(Object.freeze({
          property: key,
          observedValue: obsVal,
          counterfactualValue: cfVal,
          deltaType: 'UNCHANGED',
          interpretation: `Property ${key} is invariant under counterfactual condition.`,
        }));
      } else if (obsVal === undefined && cfVal !== undefined) {
        deltas.push(Object.freeze({
          property: key,
          observedValue: obsVal,
          counterfactualValue: cfVal,
          deltaType: 'REMOVED',
          interpretation: `Property ${key} is absent in observed state but present in counterfactual state.`,
        }));
      } else if (obsVal !== undefined && cfVal === undefined) {
        deltas.push(Object.freeze({
          property: key,
          observedValue: obsVal,
          counterfactualValue: cfVal,
          deltaType: 'ADDED',
          interpretation: `Property ${key} was introduced by the evaluated condition.`,
        }));
      } else {
        deltas.push(Object.freeze({
          property: key,
          observedValue: obsVal,
          counterfactualValue: cfVal,
          deltaType: 'MODIFIED',
          interpretation: `Property ${key} changed from ${cfJson} to ${obsJson} under observed execution.`,
        }));
      }
    }

    return Object.freeze(deltas);
  }
}
