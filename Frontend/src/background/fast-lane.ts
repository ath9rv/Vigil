import { Finding } from '../shared/types';

/**
 * Handles Module 2 severe phishing alerts with ZERO network dependency.
 * Creates an urgent notification and sets a badge on the affected tab.
 * 
 * @param finding - The severe finding triggering the alert.
 * @param tabId - The ID of the tab where the finding occurred.
 */
export async function handleFastLaneAlert(finding: Finding, tabId: number): Promise<void> {
  const url = new URL(finding.pageUrl);
  const domain = url.hostname;

  // Create an urgent notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png', // Fallback/default icon
    title: '⚠️ Vigil Security Alert',
    message: `Domain similarity / phishing warning on ${domain}`,
    priority: 2
  });

  // Set the extension badge to '!' with a red background on the specific tab
  chrome.action.setBadgeText({ text: '!', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });

  // Store fast-lane events
  const storage = await chrome.storage.local.get('fast_lane_alerts');
  const alerts = storage.fast_lane_alerts || [];
  alerts.push({
    finding,
    domain,
    timestamp: new Date().toISOString()
  });
  
  await chrome.storage.local.set({ fast_lane_alerts: alerts });
}
