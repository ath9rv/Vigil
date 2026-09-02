export interface TosDrPoint {
  id: number;
  title: string;
  source: string;
  status: 'approved' | 'pending' | 'declined';
  analysis: string;
  case_id: number;
  classification: 'good' | 'neutral' | 'bad' | 'blocker';
  topic: string;
  updated_at: string;
}

export interface TosDrService {
  id: number;
  name: string;
  slug: string;
  rated: boolean;
  rating: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  points: TosDrPoint[];
  urls: string[];
  image: string;
}

/**
 * Checks whether user granted explicit permission to look up this domain externally on ToS;DR.
 */
export async function getTosDrConsent(domain: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('legal_audit_consent');
    const map = (result.legal_audit_consent || {}) as Record<string, boolean>;
    return map[domain] === true;
  } catch {
    return false;
  }
}

/**
 * Stores explicit user consent decision for external ToS;DR lookups on this domain.
 */
export async function setTosDrConsent(domain: string, granted: boolean): Promise<void> {
  try {
    const result = await chrome.storage.local.get('legal_audit_consent');
    const map = (result.legal_audit_consent || {}) as Record<string, boolean>;
    map[domain] = granted;
    await chrome.storage.local.set({ legal_audit_consent: map });
  } catch (e) {
    console.warn('Vigil: Failed to save legal audit consent', e);
  }
}

export async function fetchTosDrService(domain: string, requireExplicitConsent = true): Promise<TosDrService | null> {
  // Option C + Option A Privacy Enforcement: Zero network egress without affirmative user consent
  if (requireExplicitConsent) {
    const hasConsent = await getTosDrConsent(domain);
    if (!hasConsent) {
      return null;
    }
  }

  const cacheKey = `tosdr_${domain}`;
  const cached = await chrome.storage.local.get(cacheKey);
  
  if (cached[cacheKey]) {
    const { data, timestamp } = cached[cacheKey];
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
      return data;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://api.tosdr.org/service/v1/?url=${encodeURIComponent(domain)}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (json.error || !json.parameters) {
      return null;
    }

    const data = json.parameters as TosDrService;
    
    await chrome.storage.local.set({
      [cacheKey]: {
        data,
        timestamp: Date.now()
      }
    });

    return data;
  } catch (err) {
    console.error('Vigil: ToS;DR API error', err);
    return null;
  }
}
