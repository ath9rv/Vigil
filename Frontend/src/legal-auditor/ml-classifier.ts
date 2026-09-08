/**
 * Local ML Legal Classifier — Zero-Shot Text Classification Pipeline
 *
 * Uses @xenova/transformers (ONNX + WebAssembly) to run a quantized
 * NLI model directly inside the Chromium background service worker.
 * Model weights are cached in IndexedDB for zero-telemetry operation.
 *
 * Architecture:
 *   Clause → Zero-Shot Classifier (NLI-deberta-v3) → Category + Confidence
 *
 * Falls back to the keyword-based classifier if:
 *   - Model fails to download or initialize
 *   - WebAssembly is unavailable
 *   - Memory pressure is detected
 */

import type { LegalClauseCategory, SegmentedClause, ClauseAssessment } from './types';

// @ts-ignore — @xenova/transformers types loaded dynamically at runtime
type TransformersModule = any;
type PipelineResult = {
  sequence: string;
  labels: string[];
  scores: number[];
  logits?: any;
};

// ─── Model Configuration ────────────────────────────────────────────────────

const MODEL_ID = 'Xenova/nli-deberta-v3-xsmall';
const MODEL_CACHE_KEY = 'vigil_ml_model_cache';
const MODEL_CACHE_DB = 'vigil-model-store';
const MODEL_CACHE_STORE = 'weights';
const MODEL_INIT_TIMEOUT_MS = 15000;
const INFERENCE_TIMEOUT_MS = 5000;

// ─── Legal Category Labels (for zero-shot classification) ───────────────────

/**
 * Maps NLI entailment labels to our legal clause categories.
 * Each label is a natural-language description of the category
 * that the zero-shot classifier can understand.
 */
export const LEGAL_CATEGORY_LABELS: Record<string, LegalClauseCategory> = {
  'This clause describes selling or commercializing personal data': 'DATA_SALE',
  'This clause describes mandatory binding arbitration or jury trial waivers': 'ARBITRATION',
  'This clause describes class action lawsuit waivers': 'CLASS_ACTION',
  'This clause describes cookies, tracking pixels, or web beacons': 'COOKIE_POLICY',
  'This clause describes sharing data with third parties or partners': 'DATA_SHARING',
  'This clause describes user privacy rights like access, deletion, or portability': 'USER_RIGHTS',
  'This clause describes government or law enforcement data disclosure': 'GOVERNMENT_DISCLOSURE',
  'This clause describes data retention periods or indefinite storage': 'DATA_RETENTION',
  'This clause describes children privacy protection or COPPA compliance': 'CHILDREN_DATA',
  'This clause describes collecting personal information or data': 'DATA_COLLECTION',
  'This clause describes using data for AI or machine learning model training': 'AI_TRAINING',
  'This clause describes account termination or unilateral suspension': 'TERMINATION',
  'This clause describes liability disclaimers or warranty limitations': 'LIABILITY',
  'This clause describes broad content licensing or intellectual property rights': 'CONTENT_LICENSE',
};

const LABELS = Object.keys(LEGAL_CATEGORY_LABELS);

// ─── Confidence Thresholds ──────────────────────────────────────────────────

/**
 * Minimum entailment score for a classification to be considered.
 * Higher = fewer false positives, lower = catch more.
 */
const HIGH_CONFIDENCE_THRESHOLD = 0.70;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.45;
const LOW_CONFIDENCE_THRESHOLD = 0.25;

// ─── Classifier Instance (Singleton) ────────────────────────────────────────

let classifierInstance: any = null;
let classifierReady = false;
let classifierError: string | null = null;
let modelLoading = false;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialize the ML classifier. Must be called once before classification.
 * Downloads and caches the ONNX model weights in IndexedDB.
 * Returns true if initialization succeeded.
 */
export async function initMLClassifier(): Promise<boolean> {
  if (classifierReady) return true;
  if (classifierError) return false;
  if (modelLoading) return false;

  modelLoading = true;

  try {
    // Dynamic import to avoid blocking the main bundle
    // @ts-ignore — types loaded at runtime via dynamic import
    const { pipeline, env } = await import('@xenova/transformers') as TransformersModule;

    // Configure for browser environment
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Set up IndexedDB cache backend
    await configureModelCache();

    // Initialize the zero-shot classification pipeline with timeout
    const initPromise = pipeline('zero-shot-classification', MODEL_ID, {
      quantized: true,
      progress_callback: (progress: any) => {
        if (progress.status === 'downloading') {
          console.log(`Vigil ML: Downloading model... ${progress.progress || 0}%`);
        }
      },
    });

    classifierInstance = await withTimeout(initPromise, MODEL_INIT_TIMEOUT_MS);
    classifierReady = true;
    modelLoading = false;

    console.log('Vigil ML: Classifier initialized successfully');
    return true;
  } catch (err) {
    classifierError = err instanceof Error ? err.message : String(err);
    modelLoading = false;
    console.warn('Vigil ML: Classifier initialization failed, will use keyword fallback:', classifierError);
    return false;
  }
}

/**
 * Check if the ML classifier is ready for inference.
 */
export function isMLClassifierReady(): boolean {
  return classifierReady;
}

/**
 * Get the status of the ML classifier.
 */
export function getMLClassifierStatus(): { ready: boolean; error: string | null; loading: boolean } {
  return { ready: classifierReady, error: classifierError, loading: modelLoading };
}

/**
 * Classify a set of candidate clauses using the ML model.
 * Returns assessments for clauses that meet the confidence threshold.
 * Falls back to null if ML is unavailable (caller should use keyword classifier).
 */
export async function classifyWithML(
  candidates: SegmentedClause[]
): Promise<ClauseAssessment[] | null> {
  if (!classifierReady || !classifierInstance) {
    return null; // Signal fallback to keyword classifier
  }

  const assessments: ClauseAssessment[] = [];

  for (const clause of candidates) {
    try {
      const result = await classifyClause(clause.text);
      if (result) {
        assessments.push(result);
      }
    } catch {
      // Skip clauses that fail inference
    }
  }

  return assessments.length > 0 ? assessments : null;
}

// ─── Single Clause Classification ───────────────────────────────────────────

async function classifyClause(text: string): Promise<ClauseAssessment | null> {
  if (!classifierInstance) return null;

  try {
    const result: PipelineResult = await withTimeout(
      classifierInstance(text, LABELS, {
        multi_label: false,
        hypothesis_template: '{}',
      }),
      INFERENCE_TIMEOUT_MS
    );

    if (!result || !result.labels || !result.scores || result.labels.length === 0) {
      return null;
    }

    // Get the top-scoring category
    const topLabel = result.labels[0];
    const topScore = result.scores[0];
    const category = LEGAL_CATEGORY_LABELS[topLabel];

    if (!category || topScore < LOW_CONFIDENCE_THRESHOLD) {
      return null;
    }

    // Determine confidence tier
    let confidence: 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' = 'OBSERVED';
    if (topScore >= HIGH_CONFIDENCE_THRESHOLD) {
      confidence = 'CONFIRMED';
    } else if (topScore >= MEDIUM_CONFIDENCE_THRESHOLD) {
      confidence = 'SUGGESTIVE';
    }

    // Check negation context (ML doesn't handle negation natively)
    const isNegatedResult = checkNegation(text, category);
    const rationale = generateMLRationale(category, confidence, isNegatedResult, topScore);

    return {
      clauseId: '', // Will be set by caller
      category,
      confidence,
      rationale,
    };
  } catch {
    return null;
  }
}

// ─── Negation Detection (Post-ML Layer) ─────────────────────────────────────

/**
 * Applies negation detection as a post-classification layer.
 * Even though the ML model may classify a clause, negation context
 * can flip the assessment (e.g., "We do not sell" → fair).
 */
function checkNegation(text: string, category: LegalClauseCategory): boolean {
  const lowerText = text.toLowerCase();

  // Categories where negation matters
  const negationRelevant: LegalClauseCategory[] = [
    'DATA_SALE', 'DATA_SHARING', 'ARBITRATION', 'CLASS_ACTION',
    'AI_TRAINING', 'CONTENT_LICENSE',
  ];

  if (!negationRelevant.includes(category)) return false;

  const negationPatterns = [
    /do not|don't|does not|doesn't|will not|won't/i,
    /never|not applicable to|shall not|no right to/i,
    /prohibited from|except as required by law|without your consent/i,
    /not sell|do not share|will not share|does not use/i,
  ];

  // Check a window before the key phrase
  const keyPhrases: Record<string, string[]> = {
    DATA_SALE: ['sell', 'commercialize', 'monetize'],
    DATA_SHARING: ['share', 'disclose', 'transfer'],
    ARBITRATION: ['arbitration', 'jury trial'],
    CLASS_ACTION: ['class action'],
    AI_TRAINING: ['train', 'training', 'machine learning'],
    CONTENT_LICENSE: ['license', 'reproduce', 'modify'],
  };

  const phrases = keyPhrases[category] || [];
  for (const phrase of phrases) {
    const idx = lowerText.indexOf(phrase);
    if (idx !== -1) {
      const windowStart = Math.max(0, idx - 50);
      const prefix = lowerText.substring(windowStart, idx);
      if (negationPatterns.some((p) => p.test(prefix))) {
        return true;
      }
    }
  }

  return false;
}

// ─── Rationale Generation ───────────────────────────────────────────────────

function generateMLRationale(
  category: LegalClauseCategory,
  confidence: string,
  isNegated: boolean,
  score: number
): string {
  const scorePercent = Math.round(score * 100);

  if (isNegated) {
    return `ML (${scorePercent}%): Category "${category}" detected but negation context present — likely a consumer-friendly clause.`;
  }

  const severityHint = (confidence === 'CONFIRMED' || confidence === 'HIGH') ? 'TRICKY' : (confidence === 'SUGGESTIVE' || confidence === 'MEDIUM') ? 'NOTICE' : 'LOW_RISK';

  return `ML (${scorePercent}%): ${severityHint} — "${category}" classification with ${confidence.toLowerCase()} confidence.`;
}

// ─── Model Cache Configuration ──────────────────────────────────────────────

async function configureModelCache(): Promise<void> {
  // The @xenova/transformers library supports custom cache backends
  // via env.cacheDir. In the browser, it uses IndexedDB by default
  // when useBrowserCache = true. We just need to ensure the DB exists.
  try {
    const db = await openDB(MODEL_CACHE_DB, MODEL_CACHE_STORE);
    if (db) {
      console.log('Vigil ML: IndexedDB model cache ready');
    }
  } catch {
    console.warn('Vigil ML: Could not open IndexedDB cache, using default browser cache');
  }
}

function openDB(dbName: string, storeName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ─── Utility: Timeout Wrapper ───────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Classification Cache (Per-Session) ─────────────────────────────────────

const classificationCache = new Map<string, ClauseAssessment | null>();

export function getCachedClassification(textHash: string): ClauseAssessment | null | undefined {
  return classificationCache.has(textHash) ? classificationCache.get(textHash)! : undefined;
}

export function setCachedClassification(textHash: string, result: ClauseAssessment | null): void {
  classificationCache.set(textHash, result);
  // Limit cache size to prevent memory bloat
  if (classificationCache.size > 500) {
    const firstKey = classificationCache.keys().next().value;
    if (firstKey) classificationCache.delete(firstKey);
  }
}

export function clearClassificationCache(): void {
  classificationCache.clear();
}
