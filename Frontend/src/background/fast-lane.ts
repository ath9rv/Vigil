import { Finding } from '../shared/types';

export const MAX_FAST_LANE_ALERTS = 50;
export const FAST_LANE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FastLaneAlertRecord {
  finding: Finding;
  domain: string;
  timestamp: string;
}

/**
 * Strict eligibility policy for in-page Ambient Shield emergency intervention:
 * - Must be CRITICAL severity
 * - Must be CONFIRMED confidence
 * - Must be an active security threat (Module 2 Phishing / Credential theft)
 * - Must NOT be an internal browser URL (chrome://, edge://, about:)
 */
export function isEmergencyAlertEligible(finding: Finding): boolean {
  if (finding.severity !== 'CRITICAL') return false;
  if (finding.confidenceState !== 'CONFIRMED') return false;

  if (finding.pageUrl) {
    try {
      const parsed = new URL(finding.pageUrl);
      if (parsed.protocol === 'chrome:' || parsed.protocol === 'edge:' || parsed.protocol === 'about:') {
        return false;
      }
    } catch {}
  }

  return finding.module === 'M2';
}

/**
 * Handles Module 2 severe phishing alerts with ZERO network dependency.
 * Creates an urgent notification and sets a badge on the affected tab.
 * Stores events in a bounded, TTL-cleaned local audit queue.
 *
 * @param finding - The severe finding triggering the alert.
 * @param tabId - The ID of the tab where the finding occurred.
 */
export async function handleFastLaneAlert(finding: Finding, tabId: number): Promise<void> {
  let domain = 'unknown';
  try {
    const url = new URL(finding.pageUrl);
    domain = url.hostname || finding.context?.scan?.hostname || 'unknown';
  } catch {
    domain = finding.context?.scan?.hostname || 'unknown';
  }

  // Create an urgent desktop notification
  if (chrome.notifications && typeof chrome.notifications.create === 'function') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: '⚠️ Vigil Security Alert',
      message: `Domain similarity / phishing warning on ${domain}`,
      priority: 2
    });
  }

  // Set the extension badge to '!' with a red background on the specific tab
  if (chrome.action) {
    if (typeof chrome.action.setBadgeText === 'function') {
      chrome.action.setBadgeText({ text: '!', tabId });
    }
    if (typeof chrome.action.setBadgeBackgroundColor === 'function') {
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
    }
  }

  // In-page Ambient Shield: STRICTLY triggered downstream of verified critical security policy
  if (isEmergencyAlertEligible(finding) && chrome.tabs && typeof chrome.tabs.sendMessage === 'function' && tabId) {
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_EMERGENCY_ALERT',
        alert: {
          id: `fast-lane-${finding.id}`,
          type: 'CRITICAL_SECURITY',
          title: '🚨 Vigil Critical Security Alert',
          message: finding.explanation || `Phishing or deceptive credential threat detected on ${domain}.`,
          details: finding.ruleName ? `Pattern: ${finding.ruleName} (${finding.ruleId})` : undefined,
          primaryActionLabel: 'Review Security Details'
        }
      }).catch(() => {
        // Tab might be in an internal chrome:// URL or navigated away
      });
    } catch {
      // Ignore synchronous dispatch failures
    }
  }

  // Bounded storage with TTL eviction to prevent storage exhaustion
  try {
    const storage = await chrome.storage.local.get('fast_lane_alerts');
    const existingAlerts: FastLaneAlertRecord[] = Array.isArray(storage?.fast_lane_alerts)
      ? storage.fast_lane_alerts
      : [];

    const now = Date.now();
    // 1. Evict entries older than 24h TTL
    const freshAlerts = existingAlerts.filter(a => {
      const alertTime = new Date(a.timestamp).getTime();
      return !isNaN(alertTime) && (now - alertTime) < FAST_LANE_TTL_MS;
    });

    // 2. Append new alert record
    freshAlerts.push({
      finding,
      domain,
      timestamp: new Date().toISOString()
    });

    // 3. Enforce maximum capacity ceiling (FIFO eviction if > 50)
    const boundedAlerts = freshAlerts.length > MAX_FAST_LANE_ALERTS
      ? freshAlerts.slice(-MAX_FAST_LANE_ALERTS)
      : freshAlerts;

    await chrome.storage.local.set({ fast_lane_alerts: boundedAlerts });
  } catch (err) {
    console.warn('Vigil: Failed to record fast-lane alert', err);
  }
}
