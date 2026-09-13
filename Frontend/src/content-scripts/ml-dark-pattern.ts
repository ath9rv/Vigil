// Lightweight offline TF-IDF classifier for Dark Patterns (Zero network egress)
import weights from './dark_pattern_weights.json';

export const DARK_PATTERN_MODEL_VERSION = 'tfidf-v1.0.0';
export const DARK_PATTERN_THRESHOLD = 0.65;
export const MAX_CLASSIFIER_INPUT_LENGTH = 500;

export function classifyDarkPattern(text: string): 'URGENCY' | 'SOCIAL_PROOF' | 'SCARCITY' | null {
  if (!text || typeof text !== 'string') return null;
  // Bounded input length to protect against CPU exhaustion
  const boundedText = text.length > MAX_CLASSIFIER_INPUT_LENGTH ? text.slice(0, MAX_CLASSIFIER_INPUT_LENGTH) : text;
  const tokens = boundedText.toLowerCase().split(/\W+/).filter(t => t.length > 0);

  const vector = new Array(Object.keys(weights.vocabulary).length).fill(0);
  for (const token of tokens) {
    const idx = (weights.vocabulary as any)[token];
    if (idx !== undefined) {
      vector[idx] += 1;
    }
  }

  let bestScore = 0;
  let bestCategoryIdx = -1;

  for (let i = 0; i < weights.categories.length; i++) {
    let logit = weights.intercept[i];
    for (let v = 0; v < vector.length; v++) {
      if (vector[v] > 0) {
        logit += vector[v] * weights.coef[i][v];
      }
    }

    const prob = 1 / (1 + Math.exp(-logit));
    if (prob > bestScore) {
      bestScore = prob;
      bestCategoryIdx = i;
    }
  }

  if (bestCategoryIdx === -1 || bestScore < DARK_PATTERN_THRESHOLD) {
    return null;
  }

  return weights.categories[bestCategoryIdx] as any;
}
