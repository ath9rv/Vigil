import { getStorageValue, setStorageValue } from '../shared/storage';
import { HashPrefixEntry, HashConfirmationCacheEntry } from './types';

const THREAT_DB_PREFIX_KEY = 'vigil_threat_prefixes';
const THREAT_CONFIRM_CACHE_KEY = 'vigil_threat_confirm_cache';

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
