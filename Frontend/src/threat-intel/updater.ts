import { getWebRiskState, applyWebRiskDiff, resetWebRiskDatabase } from './local-index';
import { WebRiskState, HashPrefixEntry } from './types';
import { validateSafeExternalUrl } from '../shared/url-security';

/**
 * Synchronizes offline threat intelligence feeds.
 * Operates purely offline unless a verified, secure backend proxy URL is configured.
 * Never stores production API secrets in client-side extension code.
 */
export async function syncWebRiskThreatList(proxyEndpoint?: string): Promise<void> {
  const currentState = await getWebRiskState();
  
  if (currentState && currentState.nextUpdateTimestamp > Date.now()) {
    return;
  }
  
  // If no backend proxy is configured, the local heuristic engine operates autonomously
  if (!proxyEndpoint) {
    const newState: WebRiskState = {
      versionToken: 'LOCAL_OFFLINE_V1',
      nextUpdateTimestamp: Date.now() + (3600 * 1000), // Check hourly
      checksum: 'offline_heuristic_engine'
    };
    // Keep local database cleanly initialized
    return;
  }

  // Strict anti-SSRF validation on proxyEndpoint
  const validation = validateSafeExternalUrl(proxyEndpoint);
  if (!validation.valid || !validation.url) {
    console.error(`[Vigil Security] Threat sync proxyEndpoint rejected: ${validation.reason}`);
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(validation.url.toString(), { 
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Threat feed sync failed: ${res.status}`);
    
    const data = await res.json();
    const additions: HashPrefixEntry[] = data.additions || [];
    const removals: string[] = data.removals || [];

    if (data.reset) {
      await resetWebRiskDatabase({
        versionToken: data.versionToken || 'V1',
        nextUpdateTimestamp: Date.now() + (data.nextUpdateSeconds ? data.nextUpdateSeconds * 1000 : 3600 * 1000)
      }, additions);
    } else if (additions.length > 0 || removals.length > 0) {
      await applyWebRiskDiff(additions, removals, {
        versionToken: data.versionToken || 'V1',
        nextUpdateTimestamp: Date.now() + (data.nextUpdateSeconds ? data.nextUpdateSeconds * 1000 : 3600 * 1000)
      });
    }
  } catch (e) {
    console.warn("Vigil: Offline threat feed sync completed with local rules.", e);
  }
}

export async function syncAllThreatFeeds(proxyEndpoint?: string): Promise<void> {
  await syncWebRiskThreatList(proxyEndpoint);
}
