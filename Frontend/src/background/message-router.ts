import { ExtensionMessage, StatusResponseMessage } from '../shared/types';
import { getStorageValue, setStorageValue, atomicUpdateStorage } from '../shared/storage';
import { aggregateScores } from './service-worker';
import { handleFastLaneAlert } from './fast-lane';
import { performLiveVerification } from './live-scanner';

/**
 * Registers chrome.runtime.onMessage listeners and dispatches messages to the appropriate handlers.
 */
export function registerMessageHandlers(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
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
      const url = new URL(message.pageUrl);
      const domain = url.hostname;
      
      // Perform Live Network/Internet verification & Policy Audit
      const liveFindings = await performLiveVerification(domain, message.pageUrl);
      const allFindings = [...message.findings, ...liveFindings];
      
      // Fast-lane integration: trigger alert if there is any severe finding
      const severeFinding = allFindings.find(f => f.severity === 'severe');
      if (severeFinding && sender.tab?.id) {
        await handleFastLaneAlert(severeFinding, sender.tab.id);
      }
      
      // Delegate to score aggregation logic
      await aggregateScores(allFindings, domain);
      
      // Atomically cache the findings for this domain without racing other tabs
      await atomicUpdateStorage('findings_cache', (cache) => ({
        ...cache,
        [domain]: allFindings
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
      const url = new URL(message.pageUrl);
      const domain = url.hostname;
      
      const findingsCache = await getStorageValue('findings_cache');
      const domainFindings = findingsCache[domain] || [];
      
      // Basic Threat Correlator Logic
      // If a large layout shift occurs, we flag it. In the future, this wakes the Visual AI.
      const newFinding = {
        id: crypto.randomUUID(),
        ruleId: 'M4-003',
        ruleName: 'suspicious_layout_shift',
        module: 'M4' as any,
        severity: 'high' as const,
        confidenceState: 'under_review' as const,
        statuteRef: 'Behavioral Manipulation / Layout Trap',
        explanation: `Detected a suspicious layout shift (score: ${message.payload.value.toFixed(2)}) without user input, jumping distance: ${message.payload.sources[0]?.movement?.toFixed(1) || 0}px. This is commonly a click-jacking or timed trap.`,
        elementSelector: message.payload.sources[0]?.selector || 'html',
        elementRect: { top: 0, left: 0, width: 0, height: 0 },
        pageUrl: message.pageUrl,
        detectedAt: new Date().toISOString()
      };
      
      // Deduplicate to avoid flooding
      const alreadyHasShift = domainFindings.some(f => f.ruleId === 'M4-003');
      if (!alreadyHasShift) {
        domainFindings.push(newFinding);
        findingsCache[domain] = domainFindings;
        await setStorageValue('findings_cache', findingsCache);
        await aggregateScores(domainFindings, domain);
      }
      
      return { success: true };
    }
    
    case 'VIGIL_COOKIE_ACTION': {
      await setStorageValue('vigil_cookie_action', {
        domain: message.domain,
        action: message.action,
        cmp: message.cmp,
        timestamp: Date.now()
      });
      console.log(`[Vigil Service Worker] Cookie action for ${message.domain}: ${message.action} (${message.cmp || 'Generic'})`);
      return { success: true };
    }

    case 'VIGIL_TRACKER_REPORT': {
      await setStorageValue('vigil_tracker_report', message.payload);
      console.log(`[Vigil Service Worker] Tracker report for ${message.pageUrl}: ${message.payload?.trackerCount || 0} trackers found`);
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

    case 'GET_RULES':
    case 'HIGHLIGHT_REQUEST':
    case 'REPORT_FINDING':
    default:
      // Stub for remaining message types to gracefully handle them
      return { success: true };
  }
}
