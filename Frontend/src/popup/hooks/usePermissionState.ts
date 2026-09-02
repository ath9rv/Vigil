import { useState, useEffect, useCallback } from 'react';
import { PermissionState, DEFAULT_PERMISSION_STATE, StrictIntent, Capabilities } from '../../shared/permission-state';

export function usePermissionState(currentDomain: string) {
  const [state, setState] = useState<PermissionState | null>(null);

  const reconcile = useCallback(async (baseState: PermissionState): Promise<PermissionState> => {
    const isLocal = currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';
    const siteUrl = `${protocol}://${currentDomain}/*`;
    
    // 1. Check true capabilities from Chrome
    const [hasAllSites, hasSiteAccess, scriptRegistered] = await Promise.all([
      chrome.permissions.contains({ origins: ['<all_urls>'] }),
      currentDomain ? chrome.permissions.contains({ origins: [siteUrl] }) : false,
      chrome.scripting.getRegisteredContentScripts({ ids: ['vigil-strict-main'] })
        .then(scripts => scripts.length > 0)
        .catch(() => false)
    ]);

    const capabilities: Capabilities = {
      siteAccessGranted: hasSiteAccess,
      allSitesAccessGranted: hasAllSites,
      scriptRegistered
    };

    // 2. Reconcile
    const reconciledState = { ...baseState, capabilities };

    // If browser revoked all sites, downgrade intent if it was ALL_SITES
    if (!hasAllSites && baseState.strictIntent === 'ALL_SITES') {
      reconciledState.strictIntent = 'SITE';
    }

    // Sync protected origins array based on actual capabilities
    const validatedOrigins = [];
    for (const origin of baseState.protectedOrigins) {
      const origIsLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
      const origProto = origIsLocal ? 'http' : 'https';
      if (origin === currentDomain && hasSiteAccess) {
        validatedOrigins.push(origin);
      } else if (origin !== currentDomain) {
        const hasOrigin = await chrome.permissions.contains({ origins: [`${origProto}://${origin}/*`] });
        if (hasOrigin) validatedOrigins.push(origin);
      }
    }
    reconciledState.protectedOrigins = validatedOrigins;

    // If intent was SITE but we lost ALL origins, downgrade to OFF
    if (reconciledState.strictIntent === 'SITE' && validatedOrigins.length === 0) {
      reconciledState.strictIntent = 'OFF';
    }

    // Save if changes happened
    if (
      baseState.strictIntent !== reconciledState.strictIntent ||
      baseState.protectedOrigins.length !== reconciledState.protectedOrigins.length
    ) {
      await chrome.storage.local.set({ permission_state: reconciledState });
    }

    return reconciledState;
  }, [currentDomain]);

  const loadAndReconcile = useCallback(async () => {
    const res = await chrome.storage.local.get('permission_state');
    let loaded = res.permission_state;
    if (!loaded || loaded.lastConsentVersion !== "3.0") {
      loaded = { ...DEFAULT_PERMISSION_STATE, vigilPaused: loaded?.vigilPaused || false };
    }
    const safeState = await reconcile(loaded as PermissionState);
    setState(safeState);
  }, [reconcile]);

  useEffect(() => {
    loadAndReconcile();

    // Listen for storage changes
    const onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.permission_state) {
        // If changed elsewhere, reconcile it
        reconcile(changes.permission_state.newValue).then(setState);
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);

    // Re-check on window focus (user might have changed Chrome settings)
    const onFocus = () => loadAndReconcile();
    window.addEventListener('focus', onFocus);

    return () => {
      chrome.storage.onChanged.removeListener(onStorageChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadAndReconcile]);

  const requestPermission = async (origins: string[], updates: Partial<PermissionState>) => {
    try {
      const granted = await chrome.permissions.request({ origins });
      if (granted) {
        const nextState = { ...state!, ...updates };
        await chrome.storage.local.set({ permission_state: nextState });
        // The storage listener will trigger reconciliation and update state with true capabilities
        await loadAndReconcile();
        
        // Signal background to re-register scripts
        chrome.runtime.sendMessage({ type: 'VIGIL_CAPABILITIES_CHANGED' });
      }
      return granted;
    } catch (e) {
      console.error('Failed to request permission', e);
      return false;
    }
  };

  const revokePermission = async (origins: string[]) => {
    try {
      const removed = await new Promise<boolean>(resolve => {
        chrome.permissions.remove({ origins }, resolve);
      });
      if (removed) {
        // Force reconciliation to clean up state naturally
        await loadAndReconcile();
        chrome.runtime.sendMessage({ type: 'VIGIL_CAPABILITIES_CHANGED' });
      }
      return removed;
    } catch (e) {
      console.error('Failed to revoke permission', e);
      return false;
    }
  };

  const updateState = async (updates: Partial<PermissionState>) => {
    if (!state) return;
    const nextState = { ...state, ...updates };
    await chrome.storage.local.set({ permission_state: nextState });
    await loadAndReconcile();
  };

  return { state, updateState, requestPermission, revokePermission };
}
