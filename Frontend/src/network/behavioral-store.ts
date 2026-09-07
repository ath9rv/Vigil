import type { ScoredBehavioralDNA } from './behavioral-scorer';

export interface CookieObservation {
  instanceKey: string;
  behaviorKey: string;

  cookieName: string;
  domain: string;
  path: string;

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

const STORAGE_KEY = 'vigil_cookie_observations';

/**
 * Retrieves all locally learned cookie observations from storage.
 */
export async function getAllLearnedSignatures(): Promise<Record<string, CookieObservation>> {
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

function getEntropyBucket(entropy: number): string {
  if (entropy < 2.0) return 'OBSERVED';
  if (entropy < 4.0) return 'SUGGESTIVE';
  if (entropy < 6.0) return 'CONFIRMED';
  return 'MAX';
}

function getLengthBucket(len: number): string {
  if (len < 8) return 'XS';
  if (len < 16) return 'S';
  if (len < 32) return 'M';
  if (len < 64) return 'L';
  if (len < 128) return 'XL';
  return 'XXL';
}

function getKeys(
  name: string,
  domain: string,
  path: string,
  secure: boolean,
  httpOnly: boolean,
  sameSite: string,
  charsetProfile: string,
  entropy: number,
  valueLength: number
) {
  // Answers: Which specific cookie instance is this? Prevents unrelated cookies from merging.
  const instanceKey = `${name}|${domain}|${path}|${secure}|${httpOnly}|${sameSite}|${charsetProfile}`;
  
  // Answers: Do these instances belong to the same tracking mechanism? Enables cross-site correlation.
  // STRICT: NEVER include raw cookie values, domains (if third party, maybe provider family), or exact names (unless structural).
  const nameShape = name.replace(/[0-9a-fA-F]/g, 'x'); // abstract away random hex in names
  const entropyBucket = getEntropyBucket(entropy);
  const lengthBucket = getLengthBucket(valueLength);
  
  const behaviorKey = `beh|${nameShape}|${charsetProfile}|${lengthBucket}|${entropyBucket}`;
  
  return { instanceKey, behaviorKey };
}

/**
 * Returns how many unique origins have set or accessed a given behavioral family.
 */
export async function getCrossSiteCount(behaviorKey: string): Promise<number> {
  try {
    const observations = await getAllLearnedSignatures();
    const origins = new Set<string>();
    
    // Aggregate origins across all instances matching the behavior family
    for (const obs of Object.values(observations)) {
      if (obs.behaviorKey === behaviorKey) {
        obs.observedOrigins.forEach(o => origins.add(o));
      }
    }
    
    return Math.max(1, origins.size);
  } catch {
    return 1;
  }
}

/**
 * Records a cookie behavioral observation in the local privacy-preserving evidence store.
 */
export async function recordCookieObservation(
  cookieDetails: {
    name: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
  },
  scored: ScoredBehavioralDNA,
  currentOrigin: string
): Promise<{ instanceKey: string, behaviorKey: string }> {
  try {
    const { instanceKey, behaviorKey } = getKeys(
      cookieDetails.name,
      cookieDetails.domain,
      cookieDetails.path,
      cookieDetails.secure,
      cookieDetails.httpOnly,
      cookieDetails.sameSite,
      scored.charsetProfile,
      scored.entropy,
      scored.length || 10
    );

    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { instanceKey, behaviorKey };
    }
    if (chrome.runtime && !chrome.runtime.id) {
      return { instanceKey, behaviorKey };
    }

    const observations = await getAllLearnedSignatures();
    const existing = observations[instanceKey];

    const originSet = new Set<string>(existing?.observedOrigins || []);
    if (currentOrigin) {
      try {
        const urlObj = new URL(currentOrigin);
        originSet.add(urlObj.hostname);
      } catch {
        originSet.add(currentOrigin);
      }
    }

    const updatedObservation: CookieObservation = {
      instanceKey,
      behaviorKey,
      cookieName: cookieDetails.name,
      domain: cookieDetails.domain,
      path: cookieDetails.path,
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

    observations[instanceKey] = updatedObservation;

    await chrome.storage.local.set({ [STORAGE_KEY]: observations });
    
    return { instanceKey, behaviorKey };
  } catch {
    // Suppress context invalidation on extension reload
    return { instanceKey: '', behaviorKey: '' };
  }
}
