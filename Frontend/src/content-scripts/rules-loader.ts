import type { Rule, RuleSet, ModuleId } from '../shared/types';
import { RULE_FILE_PATHS, WORKER_RULES_TIMEOUT_MS } from '../shared/constants';
import { getStorageValue, setStorageValue } from '../shared/storage';

// ─── In-Memory Rule Cache ───────────────────────────────────────────────────
// Rules are immutable between extension updates. Cache them in memory after
// first load to eliminate 5 fetch + 5 storage writes per scan cycle.

const memoryCache = new Map<ModuleId, Rule[]>();

function getStorageKeyForModule(module: ModuleId): 'rules_m1' | 'rules_m2' | 'rules_m3' | 'rules_m4' | 'rules_m5' {
  switch (module) {
    case 'M1': return 'rules_m1';
    case 'M2': return 'rules_m2';
    case 'M3': return 'rules_m3';
    case 'M4': return 'rules_m4';
    case 'M5': return 'rules_m5';
  }
}

async function fetchFromBundle(module: ModuleId): Promise<Rule[]> {
  const path = RULE_FILE_PATHS[module];
  if (!path) {
    throw new Error(`Unknown module path: ${module}`);
  }
  const url = chrome.runtime.getURL(path);
  const response = await fetch(url);
  const data: RuleSet = await response.json();
  
  if (data.module.startsWith(module) && Array.isArray(data.rules)) {
    // Cache the rule set to storage (cold-start fallback)
    const key = getStorageKeyForModule(module);
    await setStorageValue(key, data);
    return data.rules;
  }
  throw new Error(`Invalid rule JSON structure for ${module}`);
}

async function getCachedRules(module: ModuleId): Promise<Rule[]> {
  const key = getStorageKeyForModule(module);
  const cached = await getStorageValue(key);
  if (cached && Array.isArray(cached.rules)) {
    return cached.rules;
  }
  return [];
}

function timeout(ms: number): Promise<void> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
}

export async function loadRules(module: ModuleId): Promise<Rule[]> {
  // Fast path: return from in-memory cache (zero I/O)
  const cached = memoryCache.get(module);
  if (cached) return cached;

  try {
    const rules = await Promise.race([
      fetchFromBundle(module),
      timeout(WORKER_RULES_TIMEOUT_MS).then(() => { throw new Error('Timeout'); })
    ]);
    memoryCache.set(module, rules);
    return rules;
  } catch {
    const storageCached = await getCachedRules(module);
    if (storageCached.length > 0) {
      memoryCache.set(module, storageCached);
      return storageCached;
    }
    // Fallback to fetch without timeout if cache is empty
    const rules = await fetchFromBundle(module);
    memoryCache.set(module, rules);
    return rules;
  }
}

/**
 * Invalidate the in-memory rule cache. Call on extension update
 * to pick up new rule definitions.
 */
export function invalidateRuleCache(): void {
  memoryCache.clear();
}

export function loadM1Rules(): Promise<Rule[]> {
  return loadRules('M1');
}

export function loadM2Rules(): Promise<Rule[]> {
  return loadRules('M2');
}

export function loadM3Rules(): Promise<Rule[]> {
  return loadRules('M3');
}

export function loadM4Rules(): Promise<Rule[]> {
  return loadRules('M4');
}

export function loadM5Rules(): Promise<Rule[]> {
  return loadRules('M5');
}
