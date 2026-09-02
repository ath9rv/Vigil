export type TrackerCategory = 'advertising' | 'analytics' | 'social' | 'fingerprinting' | 'cryptomining' | 'content';

export const TRACKER_DOMAINS: Record<string, TrackerCategory> = {
  // Advertising
  'doubleclick.net': 'advertising',
  'googlesyndication.com': 'advertising',
  'googleadservices.com': 'advertising',
  'adnxs.com': 'advertising',
  'adsrvr.com': 'advertising',
  'criteo.com': 'advertising',
  'taboola.com': 'advertising',
  'outbrain.com': 'advertising',
  'amazon-adsystem.com': 'advertising',
  'moatads.com': 'advertising',
  'pubmatic.com': 'advertising',
  'rubiconproject.com': 'advertising',
  'openx.net': 'advertising',
  'casalemedia.com': 'advertising',
  'bidswitch.net': 'advertising',
  'contextweb.com': 'advertising',
  'smartadserver.com': 'advertising',
  'advertising.com': 'advertising',
  '33across.com': 'advertising',
  'sharethrough.com': 'advertising',
  'indexexchange.com': 'advertising',
  'media.net': 'advertising',
  'yieldmo.com': 'advertising',
  'teads.tv': 'advertising',
  'triplelift.com': 'advertising',
  
  // Analytics
  'google-analytics.com': 'analytics',
  'googletagmanager.com': 'analytics',
  'hotjar.com': 'analytics',
  'fullstory.com': 'analytics',
  'mixpanel.com': 'analytics',
  'segment.io': 'analytics',
  'segment.com': 'analytics',
  'amplitude.com': 'analytics',
  'heap.io': 'analytics',
  'mouseflow.com': 'analytics',
  'luckyorange.com': 'analytics',
  'clarity.ms': 'analytics',
  'newrelic.com': 'analytics',
  'nr-data.net': 'analytics',
  'bugsnag.com': 'analytics',
  'loggly.com': 'analytics',
  'datadoghq.com': 'analytics',
  'sumologic.com': 'analytics',
  
  // Social
  'connect.facebook.net': 'social',
  'platform.twitter.com': 'social',
  'platform.linkedin.com': 'social',
  'snap.licdn.com': 'social',
  'bat.bing.com': 'social',
  
  // Fingerprinting
  'cdn.krxd.net': 'fingerprinting',
  'iovation.com': 'fingerprinting',
  'fingerprintjs.com': 'fingerprinting',
  
  // Cryptomining
  'coinhive.com': 'cryptomining',
  'coin-hive.com': 'cryptomining',
  'jsecoin.com': 'cryptomining',
  'cryptoloot.pro': 'cryptomining',
  'minero.cc': 'cryptomining',
  'webmine.cz': 'cryptomining'
};

/**
 * Classifies a domain into a tracker category if it matches our known list.
 * Checks for exact matches and subdomain matches.
 */
export function classifyDomain(domain: string): TrackerCategory | null {
  const normalizedDomain = domain.toLowerCase();
  
  // Direct match
  if (TRACKER_DOMAINS[normalizedDomain]) {
    return TRACKER_DOMAINS[normalizedDomain];
  }
  
  // Subdomain match (e.g. static.doubleclick.net -> doubleclick.net)
  const parts = normalizedDomain.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const rootDomain = parts.slice(i).join('.');
    if (TRACKER_DOMAINS[rootDomain]) {
      return TRACKER_DOMAINS[rootDomain];
    }
  }
  
  return null;
}

export interface TrackerStats {
  total: number;
  categories: Record<TrackerCategory, number>;
}

/**
 * Retrieves statistics about blocked trackers from declarativeNetRequest.
 */
export async function getBlockedTrackerStats(): Promise<TrackerStats> {
  const stats: TrackerStats = {
    total: 0,
    categories: {
      advertising: 0,
      analytics: 0,
      social: 0,
      fingerprinting: 0,
      cryptomining: 0,
      content: 0
    }
  };

  try {
    if (chrome && chrome.declarativeNetRequest && chrome.declarativeNetRequest.getMatchedRules) {
      // Note: we can filter by specific extension rulesets if needed.
      const matchedRules = await chrome.declarativeNetRequest.getMatchedRules();
      
      // For detailed counting, we might need to map rule IDs to categories, 
      // but if we just want raw rule hits:
      for (const rule of matchedRules.rulesMatchedInfo) {
        const id = rule.rule.ruleId;
        
        // Match rule ID to category based on our tracker_blocklist.json logic
        let category: TrackerCategory | null = null;
        if (id === 1001) category = 'advertising';
        else if (id === 1002) category = 'analytics';
        else if (id === 1003 || id === 1004) category = 'social';
        else if (id === 1005 || id === 1006) category = 'fingerprinting';
        else if (id === 1007) category = 'cryptomining';
        
        if (category) {
          stats.categories[category]++;
          stats.total++;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get matched DNR rules:', error);
  }

  return stats;
}
