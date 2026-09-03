import type { ScoredBehavioralDNA } from './behavioral-scorer';

export interface LearnedCookieSignature {
  cookieName: string;
  domain: string;
  entropy: number;
  charsetProfile: string;
  lifespanDays: number;
  score: number;
  category: string;
  confidence: number;
  reasons: string[];
  observedOrigins: string[];
  firstObserved: number;
  lastObserved: number;
}

const STORAGE_KEY = 'vigil_learned_signatures';

/**
 * Retrieves all locally learned behavioral signatures from storage.
 */
export async function getAllLearnedSignatures(): Promise<Record<string, LearnedCookieSignature>> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return {};
    }
    if (chrome.runtime && !chrome.runtime.id) {
      return {};
    }
    const res = await chrome.storage.local.get(STORAGE_KEY);
    return (res && res[STORAGE_KEY]) || {};
  } catch {
    return {};
  }
}

/**
 * Returns how many unique origins have set or accessed a given cookie identifier.
 */
export async function getCrossSiteCount(cookieName: string): Promise<number> {
  try {
    const signatures = await getAllLearnedSignatures();
    const sig = signatures[cookieName];
    return sig && sig.observedOrigins ? sig.observedOrigins.length : 1;
  } catch {
    return 1;
  }
}

/**
 * Records a cookie behavioral observation in the local privacy-preserving evidence store.
 * 
 * STRICT PRIVACY GUARANTEE:
 * Raw cookie values, session tokens, and passwords are NEVER persisted.
 * Only derived mathematical fingerprints and classification verdicts are stored.
 */
export async function recordCookieObservation(
  cookieName: string,
  domain: string,
  scored: ScoredBehavioralDNA,
  currentOrigin: string
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }
    if (chrome.runtime && !chrome.runtime.id) {
      return;
    }

    const signatures = await getAllLearnedSignatures();
    const existing = signatures[cookieName];

    const originSet = new Set<string>(existing?.observedOrigins || []);
    if (currentOrigin) {
      try {
        const urlObj = new URL(currentOrigin);
        originSet.add(urlObj.hostname);
      } catch {
        originSet.add(currentOrigin);
      }
    }

    const updatedSignature: LearnedCookieSignature = {
      cookieName,
      domain,
      entropy: scored.entropy,
      charsetProfile: scored.charsetProfile,
      lifespanDays: scored.lifespanDays,
      score: scored.score,
      category: scored.category,
      confidence: scored.confidence,
      reasons: scored.reasons,
      observedOrigins: Array.from(originSet),
      firstObserved: existing?.firstObserved || Date.now(),
      lastObserved: Date.now()
    };

    signatures[cookieName] = updatedSignature;

    await chrome.storage.local.set({ [STORAGE_KEY]: signatures });
  } catch {
    // Suppress context invalidation on extension reload
  }
}
