import type { Rule, RuleSet, ModuleId } from '../shared/types';
import { RULE_FILE_PATHS, WORKER_RULES_TIMEOUT_MS } from '../shared/constants';
import { getStorageValue, setStorageValue } from '../shared/storage';

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
    // Cache the rule set
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
  try {
    return await Promise.race([
      fetchFromBundle(module),
      timeout(WORKER_RULES_TIMEOUT_MS).then(() => { throw new Error('Timeout'); })
    ]);
  } catch {
    const cached = await getCachedRules(module);
    if (cached.length > 0) return cached;
    // Fallback to fetch without timeout if cache is empty
    return await fetchFromBundle(module);
  }
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
