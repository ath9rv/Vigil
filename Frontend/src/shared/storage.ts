import type { StorageSchema } from './types';

// ─── Default Storage Values ─────────────────────────────────────────────────

const STORAGE_DEFAULTS: StorageSchema = {
  enabled: true,
  site_denylist: [],
  install_id: '',
  onboarding_complete: false,
  findings_cache: {},
  trust_data: {},
  rules_m1: null,
  rules_m2: null,
  rules_m3: null,
  rules_m4: null,
  rules_m5: null,
  vigil_cookie_action: null,
  vigil_tracker_report: null,
};

// ─── Typed Storage Access ───────────────────────────────────────────────────

/**
 * Get a typed value from chrome.storage.local.
 * Returns the default value if the key doesn't exist or extension context is invalidated.
 */
export async function getStorageValue<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K]> {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
      return STORAGE_DEFAULTS[key];
    }
    const result = await chrome.storage.local.get(key);
    if (result && result[key] !== undefined) {
      return result[key] as StorageSchema[K];
    }
    return STORAGE_DEFAULTS[key];
  } catch {
    return STORAGE_DEFAULTS[key];
  }
}

/**
 * Get multiple typed values from chrome.storage.local.
 */
export async function getStorageValues<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  const output = {} as Pick<StorageSchema, K>;
  for (const key of keys) {
    output[key] = STORAGE_DEFAULTS[key];
  }
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
      return output;
    }
    const result = await chrome.storage.local.get(keys);
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        output[key] = result[key] as StorageSchema[K];
      }
    }
    return output;
  } catch {
    return output;
  }
}

/**
 * Set a typed value in chrome.storage.local.
 */
export async function setStorageValue<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
      return;
    }
    await chrome.storage.local.set({ [key]: value });
  } catch {
    // Suppress context invalidated errors during extension reload
  }
}

/**
 * Set multiple values in chrome.storage.local.
 */
export async function setStorageValues(
  values: Partial<StorageSchema>
): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
      return;
    }
    await chrome.storage.local.set(values);
  } catch {
    // Suppress context invalidated errors during extension reload
  }
}

/**
 * Asynchronous mutex lock to serialize concurrent read-modify-write operations
 * across tabs and prevent lost updates in chrome.storage.local.
 */
export class AsyncMutex {
  private queue: Promise<any> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
}

export const storageMutex = new AsyncMutex();

/**
 * Atomically updates a key in chrome.storage.local under a mutex lock.
 * Prevents concurrent read-modify-write race conditions across multiple tabs.
 */
export async function atomicUpdateStorage<K extends keyof StorageSchema>(
  key: K,
  updater: (prev: StorageSchema[K]) => StorageSchema[K] | Promise<StorageSchema[K]>
): Promise<StorageSchema[K]> {
  return storageMutex.runExclusive(async () => {
    const current = await getStorageValue(key);
    const updated = await updater(current);
    await setStorageValue(key, updated);
    return updated;
  });
}

/**
 * Listen for changes to a specific storage key.
 * Returns an unsubscribe function.
 */
export function onStorageChange<K extends keyof StorageSchema>(
  key: K,
  callback: (newValue: StorageSchema[K], oldValue: StorageSchema[K]) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local') return;
    if (key in changes) {
      const change = changes[key];
      callback(
        (change.newValue ?? STORAGE_DEFAULTS[key]) as StorageSchema[K],
        (change.oldValue ?? STORAGE_DEFAULTS[key]) as StorageSchema[K]
      );
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/**
 * Initialize storage with defaults for any unset keys.
 * Called once during extension install.
 */
export async function initializeStorage(): Promise<void> {
  const existing = await chrome.storage.local.get(null);
  const defaults: Record<string, unknown> = {};

  for (const [key, defaultValue] of Object.entries(STORAGE_DEFAULTS)) {
    if (existing[key] === undefined) {
      defaults[key] = defaultValue;
    }
  }

  // Generate install_id if not set
  if (!existing['install_id']) {
    defaults['install_id'] = crypto.randomUUID();
  }

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
}
