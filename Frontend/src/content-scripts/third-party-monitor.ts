import { TrackerCategory, classifyDomain } from '../network/tracker-stats';

interface ThirdPartyReport {
  domain: string;
  category: TrackerCategory | 'unknown';
  resourceTypes: string[];
  count: number;
}

interface TrackerSummary {
  total: number;
  byCategory: Record<string, number>;
  domains: ThirdPartyReport[];
}

/**
 * Enumerates all third-party resources loaded on the current page
 * and classifies them using the tracker database.
 * 
 * Inspired by: Privacy Badger's heuristic detection + Ghostery's WhoTracks.Me
 */
export function analyzeThirdPartyResources(): TrackerSummary {
  const currentHost = window.location.hostname;
  const currentBaseDomain = getBaseDomain(currentHost);
  
  const domainMap = new Map<string, ThirdPartyReport>();
  
  // 1. Script tags
  document.querySelectorAll('script[src]').forEach(el => {
    const src = (el as HTMLScriptElement).src;
    recordResource(src, 'script', currentBaseDomain, domainMap);
  });
  
  // 2. Images / pixels (tracking pixels are 1x1 images)
  document.querySelectorAll('img[src]').forEach(el => {
    const src = (el as HTMLImageElement).src;
    recordResource(src, 'image', currentBaseDomain, domainMap);
  });
  
  // 3. Iframes (social widgets, ad frames)
  document.querySelectorAll('iframe[src]').forEach(el => {
    const src = (el as HTMLIFrameElement).src;
    recordResource(src, 'iframe', currentBaseDomain, domainMap);
  });
  
  // 4. Link preloads / prefetches
  document.querySelectorAll('link[href]').forEach(el => {
    const href = (el as HTMLLinkElement).href;
    const rel = (el as HTMLLinkElement).rel;
    if (rel === 'preconnect' || rel === 'prefetch' || rel === 'preload' || rel === 'dns-prefetch') {
      recordResource(href, 'preload', currentBaseDomain, domainMap);
    }
  });
  
  // 5. Check performance entries for XHR/fetch requests
  if (window.performance && performance.getEntriesByType) {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const entry of entries) {
      if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
        recordResource(entry.name, 'xhr', currentBaseDomain, domainMap);
      }
    }
  }
  
  // Build summary
  const domains = Array.from(domainMap.values());
  const byCategory: Record<string, number> = {};
  
  for (const d of domains) {
    byCategory[d.category] = (byCategory[d.category] || 0) + 1;
  }
  
  return {
    total: domains.length,
    byCategory,
    domains
  };
}

function recordResource(
  url: string,
  type: string,
  currentBaseDomain: string,
  map: Map<string, ThirdPartyReport>
) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const baseDomain = getBaseDomain(host);
    
    // Skip same-site resources
    if (baseDomain === currentBaseDomain) return;
    // Skip data: and blob: URLs
    if (!parsed.protocol.startsWith('http')) return;
    
    if (map.has(baseDomain)) {
      const existing = map.get(baseDomain)!;
      existing.count++;
      if (!existing.resourceTypes.includes(type)) {
        existing.resourceTypes.push(type);
      }
    } else {
      const category = classifyDomain(baseDomain) || classifyDomain(host);
      map.set(baseDomain, {
        domain: baseDomain,
        category: category || 'unknown',
        resourceTypes: [type],
        count: 1
      });
    }
  } catch {
    // Invalid URL, skip
  }
}

/**
 * Extract the base domain (eTLD+1) from a hostname.
 * Simple heuristic: take last two segments, or last three for known CCTLDs.
 */
function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  
  // Handle common country-code second-level domains
  const ccSLDs = ['co.uk', 'co.in', 'co.jp', 'com.au', 'com.br', 'co.nz', 'co.za', 'org.uk', 'net.au'];
  const lastTwo = parts.slice(-2).join('.');
  if (ccSLDs.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

/**
 * Detect potential cross-site tracking behavior (Privacy Badger heuristic).
 * Checks if a third-party domain is setting identifying cookies.
 */
export function detectTrackingBehavior(): string[] {
  const suspiciousDomains: string[] = [];
  const currentBaseDomain = getBaseDomain(window.location.hostname);
  
  // Check cookies for third-party identifiers
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name] = cookie.trim().split('=');
    const trackingCookiePatterns = [
      /^_ga/, /^_gid/, /^_fbp/, /^_fbc/, /^fr$/, /^IDE$/, /^MUID$/, 
      /^_gcl/, /^_uet/, /^_ttp/, /^_tt_/, /^li_/, /^bcookie/,
      /^__utm/, /^_hj/, /^mp_/, /^amplitude/, /^ajs_/
    ];
    
    if (trackingCookiePatterns.some(p => p.test(name.trim()))) {
      suspiciousDomains.push(name.trim());
    }
  }
  
  return suspiciousDomains;
}
