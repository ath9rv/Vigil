import { getStorageValue, setStorageValue } from '../shared/storage';
import { HashPrefixEntry, WebRiskState, HashConfirmationCacheEntry, ThreatSource } from './types';

const THREAT_DB_PREFIX_KEY = 'vigil_threat_prefixes';
const THREAT_STATE_KEY = 'vigil_threat_state';
const THREAT_CONFIRM_CACHE_KEY = 'vigil_threat_confirm_cache';

export async function applyWebRiskDiff(
  additions: HashPrefixEntry[], 
  removals: string[], // prefixes to remove
  newState: WebRiskState
) {
  const currentPrefixes = await getStorageValue(THREAT_DB_PREFIX_KEY) as Record<string, HashPrefixEntry> || {};
  
  // Atomic apply
  for (const removePrefix of removals) {
    delete currentPrefixes[removePrefix];
  }
  
  for (const addition of additions) {
    currentPrefixes[addition.prefix] = addition;
  }
  
  await setStorageValue(THREAT_DB_PREFIX_KEY, currentPrefixes);
  await setStorageValue(THREAT_STATE_KEY, newState);
}

export async function resetWebRiskDatabase(newState: WebRiskState, newEntries: HashPrefixEntry[]) {
  const currentPrefixes: Record<string, HashPrefixEntry> = {};
  for (const entry of newEntries) {
    currentPrefixes[entry.prefix] = entry;
  }
  await setStorageValue(THREAT_DB_PREFIX_KEY, currentPrefixes);
  await setStorageValue(THREAT_STATE_KEY, newState);
  
  // Clear the confirmation cache on a reset
  await setStorageValue(THREAT_CONFIRM_CACHE_KEY, {});
}

export async function lookupPrefixesLocally(prefixCandidatesBase64: string[]): Promise<HashPrefixEntry[]> {
  const currentPrefixes = await getStorageValue(THREAT_DB_PREFIX_KEY) as Record<string, HashPrefixEntry> || {};
  const matches: HashPrefixEntry[] = [];
  
  for (const candidate of prefixCandidatesBase64) {
    const entry = currentPrefixes[candidate];
    if (entry) {
      matches.push(entry);
    }
  }
  
  return matches;
}

export async function getWebRiskState(): Promise<WebRiskState | null> {
  return await getStorageValue(THREAT_STATE_KEY) as WebRiskState || null;
}

// Caching layer for full hash confirmation
export async function getConfirmationCache(fullHashBase64: string): Promise<HashConfirmationCacheEntry | null> {
  const cache = await getStorageValue(THREAT_CONFIRM_CACHE_KEY) as Record<string, HashConfirmationCacheEntry> || {};
  const entry = cache[fullHashBase64];
  if (entry && entry.expireTimestamp > Date.now()) {
    return entry;
  }
  return null;
}

export async function setConfirmationCache(entries: HashConfirmationCacheEntry[]) {
  const cache = await getStorageValue(THREAT_CONFIRM_CACHE_KEY) as Record<string, HashConfirmationCacheEntry> || {};
  for (const entry of entries) {
    cache[entry.fullHash] = entry;
  }
  await setStorageValue(THREAT_CONFIRM_CACHE_KEY, cache);
}
