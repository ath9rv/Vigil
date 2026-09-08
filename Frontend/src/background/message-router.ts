import { ExtensionMessage, StatusResponseMessage, Finding } from '../shared/types';
import type { ScanContext } from '../shared/scan-context';
import { getStorageValue, setStorageValue, atomicUpdateStorage } from '../shared/storage';
import { createForensicAnalysis } from '../evidence/forensics';
import { aggregateScores } from './service-worker';
import { handleFastLaneAlert } from './fast-lane';
import { performLiveVerification } from './live-scanner';
import { getBlockedTrackerStats } from '../network/tracker-stats';
import { navigationState } from './navigation-state';

import { ObservationFactory } from '../evidence/observation';
import { trustEngine } from '../evidence/trust-engine';

/**
 * Registers chrome.runtime.onMessage listeners and dispatches messages to the appropriate handlers.
 */
export function registerMessageHandlers(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    // 1. Sender Authentication: Must strictly match extension ID
    if (chrome.runtime?.id && sender?.id && sender.id !== chrome.runtime.id) {
      console.warn('[Vigil Security] Message rejected: untrusted sender.id', sender.id);
      sendResponse({ success: false, error: 'Unauthorized: untrusted sender ID' });
      return false;
    }

    // 2. Tab Context & Origin Verification for PageBoundMessages
    if ('context' in message && message.context) {
      const { tabId, hostname } = message.context;

      // Verify that message claims to come from the tab that actually sent it
      if (sender.tab && sender.tab.id !== undefined && tabId && sender.tab.id !== tabId) {
        console.warn(`[Vigil Security] Cross-tab message spoofing blocked: reported tabId ${tabId} != sender tab ${sender.tab.id}`);
        sendResponse({ success: false, error: 'Unauthorized: tabId spoofing detected' });
        return false;
      }

      // Verify origin matches the sender URL
      if (sender.url && hostname) {
        try {
          const senderHost = new URL(sender.url).hostname;
          if (senderHost && senderHost !== hostname && !sender.url.startsWith('chrome-extension://')) {
            console.warn(`[Vigil Security] Cross-origin message spoofing blocked: reported hostname ${hostname} != sender host ${senderHost}`);
            sendResponse({ success: false, error: 'Unauthorized: origin spoofing detected' });
            return false;
          }
        } catch {
          // If URL parsing fails, ignore sender host check
        }
      }
    }

    // Stale message guard for PageBoundMessages
    if ('context' in message && message.type !== 'NAVIGATION_STARTED') {
      const { tabId, navigationId } = message.context;
      if (tabId && navigationId && !navigationState.isNavigationValid(tabId, navigationId)) {
        console.warn(`[Vigil] Dropping stale message ${message.type} from previous navigation ${navigationId}`);
        sendResponse({ success: false, dropped: true, reason: 'stale_navigation' });
        return true;
      }

      // Map page-bound messages to observations for the Trust Engine
      let observation = null;
      if (message.type === 'VIGIL_COOKIE_ACTION') {
        observation = ObservationFactory.fromCookieAction(message.context, { action: message.action, cmp: message.cmp });
      } else if (message.type === 'VIGIL_TRACKER_REPORT') {
        observation = ObservationFactory.fromNetworkRequest(message.context, { 
          trackerCount: message.payload.trackerCount, 
          isTracker: message.payload.trackerCount > 0,
          crossSite: true
        });
      } else if (message.type === 'VIGIL_LAYOUT_SHIFT') {
        observation = ObservationFactory.fromDOMMutation(message.context, message.payload);
      }

      if (observation) {
        trustEngine.observe(observation);
      }
    }

    handleMessage(message, sender)
      .then(sendResponse)
      .catch(err => {
        console.error('Message handler error:', err);
        sendResponse({ error: err.message });
      });
    
    // Return true to indicate that the response will be sent asynchronously
    return true; 
  });
}

/**
 * Type-safe message dispatcher mapping ExtensionMessage.type to handler logic.
 *
 * @param message - The extension message to process.
 * @param sender - Information about the sender of the message.
 * @returns A promise resolving to the response to be sent back.
 */
async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'SCAN_COMPLETE': {
      const ctx = message.context;
      const domain = ctx.hostname;
      
      // Perform Live Network/Internet verification & Policy Audit
      const liveFindings = await performLiveVerification(domain, ctx.navigationId);
      const allFindings = [...message.findings, ...liveFindings];

      // Feed legacy findings into the TrustEngine
      for (const f of allFindings) {
        trustEngine.observe(ObservationFactory.fromLegacyFinding(f, ctx));
      }

      // Finalize reasoning — this is the canonical verdict pipeline
      const trustResult = trustEngine.finalize(ctx.navigationId);
      
      // Attach TrustEngine forensic reports to findings for traceability
      // Each finding gets a graphRef pointing to the evidence that produced it
      if (trustResult.reports.length > 0) {
        for (const finding of allFindings) {
          // Attach the first matching report as forensic context
          const matchingReport = trustResult.reports.find(r => {
            if (!r.verdictType) return false;
            if (finding.module === 'M1' && r.verdictType === 'DECEPTIVE_UI_PATTERN') return true;
            if (finding.module === 'M2' && r.verdictType === 'PHISHING_RISK') return true;
            if (finding.module === 'M3' && (r.verdictType === 'CONSENT_VIOLATION' || r.verdictType === 'THIRD_PARTY_DATA_SHARING' || r.verdictType === 'TRACKER_USAGE')) return true;
            if (finding.module === 'M4' && r.verdictType === 'DECEPTIVE_UI_PATTERN') return true;
            if (finding.module === 'M5' && r.verdictType === 'DECEPTIVE_UI_PATTERN') return true;
            return r.verdictType.startsWith(finding.module);
          });
          if (matchingReport && finding.context) {
            finding.context.trustEngineReport = matchingReport;
          }
        }
      }

      // Log TrustEngine resolutions for forensic traceability
      if (trustResult.resolutions.length > 0) {
        console.log(`[Vigil TrustEngine] ${domain}: ${trustResult.resolutions.length} resolutions, ` +
          `${trustResult.reports.length} eligible reports, ` +
          `${trustResult.rejectedCount} budget rejections`);
      }
      
      // Fast-lane integration: trigger alert if there is any severe finding
      const severeFinding = allFindings.find(f =>
        f.severity === 'CRITICAL' && (f.reviewStatus === 'CONFIRMED' || f.confidenceState === 'CONFIRMED')
      );
      if (severeFinding && ctx.tabId) {
        await handleFastLaneAlert(severeFinding, ctx.tabId);
      }
      
      // Delegate to score aggregation logic
      await aggregateScores(allFindings, ctx);
      
      // Atomically cache the findings for this domain without racing other tabs
      await atomicUpdateStorage('findings_cache', (cache) => ({
        ...cache,
        [domain]: allFindings
      }));
      await atomicUpdateStorage('scan_coverage', reports => ({
        ...reports,
        [domain]: {
          domain,
          capturedAt: Date.now(),
          dom: true,
          threatIntel: true,
          network: reports?.[domain]?.network ?? false,
          cookies: reports?.[domain]?.cookies ?? false,
          dynamicEvents: true,
          storage: false,
          crossSite: false
        }
      }));

      return { success: true };
    }
    
    case 'GET_STATUS': {
      const trustDataRecord = await getStorageValue('trust_data');
      const findingsCache = await getStorageValue('findings_cache');
      const denylist = await getStorageValue('site_denylist');
      
      const response: StatusResponseMessage = {
        type: 'STATUS_RESPONSE',
        trustData: trustDataRecord[message.domain] || null,
        findings: findingsCache[message.domain] || [],
        enabled: !denylist.includes(message.domain)
      };
      
      return response;
    }
    
    case 'TOGGLE_SITE': {
      const denylist = await getStorageValue('site_denylist');
      
      if (message.enabled) {
        // Remove from denylist to enable
        const newDenylist = denylist.filter(d => d !== message.domain);
        await setStorageValue('site_denylist', newDenylist);
      } else {
        // Add to denylist to disable
        if (!denylist.includes(message.domain)) {
          denylist.push(message.domain);
          await setStorageValue('site_denylist', denylist);
        }
      }
      
      return { success: true };
    }
    
    case 'VIGIL_LAYOUT_SHIFT': {
      const domain = message.context.hostname;
      
      const findingsCache = await getStorageValue('findings_cache');
      const domainFindings = findingsCache[domain] || [];
      
      // Basic Threat Correlator Logic
      const analysis = createForensicAnalysis({
        confidence: 'CONFIRMED',
        reviewStatus: 'CONFIRMED',
        observed: [
          `Detected a suspicious layout shift (score: ${message.payload.value.toFixed(2)}) without user input.`,
          `Jumping distance: ${message.payload.sources[0]?.movement?.toFixed(1) || 0}px.`
        ],
        assumptions: ['This is commonly a click-jacking or timed trap when occurring without user interaction.']
      });

      const newFinding: Finding = {
        id: crypto.randomUUID(),
        ruleId: 'M4-003',
        ruleName: 'suspicious_layout_shift',
        module: 'M4',
        severity: 'CONFIRMED',
        confidenceState: 'CONFIRMED',
        reviewStatus: 'CONFIRMED',
        statuteRef: 'Behavioral Manipulation / Layout Trap',
        explanation: analysis.observed.join(' ') + ' ' + analysis.assumptions.join(' '),
        elementSelector: message.payload.sources[0]?.selector || 'html',
        elementRect: { top: 0, left: 0, width: 0, height: 0 },
        pageUrl: message.context.navigationId,
        detectedAt: new Date().toISOString(),
        context: {
          scan: message.context,
          evidence: [{
            sourceType: 'DOM',
            sourceUrl: message.context.navigationId,
            capturedAt: Date.now(),
            excerpt: message.payload.sources[0]?.selector || 'html',
            forensics: analysis
          }],
          coverage: {
            dom: true, threatIntel: false, network: false, cookies: false, dynamicEvents: true, storage: false, crossSite: false
          }
        }
      };
      
      // Deduplicate to avoid flooding
      const alreadyHasShift = domainFindings.some(f => f.ruleId === 'M4-003');
      if (!alreadyHasShift) {
        domainFindings.push(newFinding);
        findingsCache[domain] = domainFindings;
        await setStorageValue('findings_cache', findingsCache);
        await aggregateScores(domainFindings, message.context);
      }
      
      return { success: true };
    }
    
    case 'VIGIL_COOKIE_ACTION': {
      await setStorageValue('vigil_cookie_action', {
        domain: message.context.hostname,
        action: message.action,
        cmp: message.cmp,
        timestamp: Date.now()
      });
      console.log(`[Vigil Service Worker] Cookie action for ${message.context.hostname}: ${message.action} (${message.cmp || 'Generic'})`);
      return { success: true };
    }

    case 'VIGIL_TRACKER_REPORT': {
      const domain = message.context.hostname;
      const blocked = await getBlockedTrackerStats(message.context.tabId);
      const report = {
        ...message.payload,
        domain,
        trackersBlocked: blocked.total,
        capturedAt: Date.now()
      };
      await atomicUpdateStorage('vigil_tracker_reports', reports => ({ ...reports, [domain]: report }));
      await atomicUpdateStorage('scan_coverage', reports => ({
        ...reports,
        [domain]: {
          domain,
          capturedAt: Date.now(),
          dom: reports?.[domain]?.dom ?? false,
          threatIntel: reports?.[domain]?.threatIntel ?? false,
          network: true,
          cookies: true,
          dynamicEvents: reports?.[domain]?.dynamicEvents ?? false,
          storage: false,
          crossSite: false
        }
      }));
      console.log(`[Vigil Service Worker] Tracker report for ${domain}: ${report.trackerCount} found, ${report.trackersBlocked} blocked`);
      return { success: true };
    }

    case 'VIGIL_CAPABILITIES_CHANGED': {
      try {
        const storage = await chrome.storage.local.get('permission_state');
        const permState = storage.permission_state;
        const isStrict = permState?.strictIntent || (permState?.protectedOrigins && permState.protectedOrigins.length > 0);
        
        const existing = await chrome.scripting.getRegisteredContentScripts({ ids: ['vigil-strict-main'] });
        
        if (isStrict) {
          const origins = (permState.protectedOrigins && permState.protectedOrigins.length > 0)
            ? permState.protectedOrigins.map((o: string) => `https://${o}/*`)
            : ['<all_urls>'];

          if (existing.length > 0) {
            await chrome.scripting.unregisterContentScripts({ ids: ['vigil-strict-main'] });
          }

          await chrome.scripting.registerContentScripts([{
            id: 'vigil-strict-main',
            matches: origins,
            js: ['defender.js'],
            world: 'MAIN' as any,
            runAt: 'document_start'
          }]);
        } else {
          if (existing.length > 0) {
            await chrome.scripting.unregisterContentScripts({ ids: ['vigil-strict-main'] });
          }
        }
      } catch (e) {
        console.error('[Vigil] Failed to reconcile dynamic content scripts:', e);
      }
      return { success: true };
    }

    case 'NAVIGATION_STARTED': {
      const { tabId, navigationId, hostname } = message.context;
      if (tabId && navigationId) {
        navigationState.startNavigation(tabId, navigationId);
        trustEngine.dispose(navigationId);
      }
      console.log(`[Vigil] Navigation started: Tab ${tabId} -> ${navigationId} (${hostname})`);
      return { success: true };
    }

    case 'GET_RULES':
    case 'HIGHLIGHT_REQUEST':
    case 'REPORT_FINDING':
      return { success: true, stub: true };

    default:
      // Fail closed on unsupported or unknown message types
      console.warn(`[Vigil Security] Rejected unsupported message type: ${(message as any)?.type}`);
      return { success: false, error: `Unsupported or unknown message type: ${(message as any)?.type}` };
  }
}
