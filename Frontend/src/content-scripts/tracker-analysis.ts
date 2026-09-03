import { analyzeThirdPartyResources, detectTrackingBehavior } from './third-party-monitor';
import type { TrackerReport } from '../shared/types';

export type PageTrackerReport = TrackerReport;

/**
 * Runs a full third-party analysis of the current page and reports
 * the results to the service worker for the Privacy Grade calculation.
 */
export function runTrackerAnalysis(): PageTrackerReport {
  const resources = analyzeThirdPartyResources();
  const trackingCookies = detectTrackingBehavior();
  
  // Check if the page was loaded over HTTPS
  const isHTTPS = window.location.protocol === 'https:';
  
  const report: PageTrackerReport = {
    domain: window.location.hostname,
    capturedAt: Date.now(),
    trackerCount: resources.total,
    trackersBlocked: 0, // Will be filled by service worker from DNR stats
    trackersByCategory: resources.byCategory,
    trackerDomains: resources.domains.map(d => d.domain),
    trackingCookies,
    httpsUpgraded: !isHTTPS // If we're on HTTP, the HTTPS rule didn't upgrade us
  };
  
  // Persist to storage so popup can read it
  chrome.storage.local.set({ vigil_tracker_report: report });
  
  // Send to service worker
  chrome.runtime.sendMessage({
    type: 'VIGIL_TRACKER_REPORT',
    payload: report,
    pageUrl: window.location.href
  }).catch(() => {
    // Extension context may be invalidated, ignore
  });
  
  return report;
}
