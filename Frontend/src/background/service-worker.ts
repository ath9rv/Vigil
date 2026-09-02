import { initializeStorage, getStorageValue, setStorageValue, atomicUpdateStorage } from '../shared/storage';
import { Finding, DomainTrustData, ModuleId, ModuleScore } from '../shared/types';
import { SEVERITY_PENALTIES, SCORE_EMA_ALPHA, SCORE_CAUTION_THRESHOLD, SCORE_DANGER_THRESHOLD, BADGE_COLORS } from '../shared/constants';
import { registerMessageHandlers } from './message-router';

// Initialize storage and strict privacy policies on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  await initializeStorage();
  
  // V2: WebRTC IP Leak Protection
  // Forces WebRTC to only use the default public interface, hiding the user's true local IP
  if (chrome.privacy && chrome.privacy.network) {
    chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: 'default_public_interface_only'
    });
  }

  // V3: Automated "Do Not Sell" Enforcer (GPC)
  // Dynamically injects the Sec-GPC: 1 header into all outgoing requests
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: 'Sec-GPC', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: '1' }
          ]
        },
        condition: {
          urlFilter: '*',
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
            chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.PING,
            chrome.declarativeNetRequest.ResourceType.SCRIPT,
            chrome.declarativeNetRequest.ResourceType.IMAGE
          ]
        }
      }
    ]
  }).catch(console.error);
});

// Register message handlers on startup
registerMessageHandlers();

/**
 * Aggregates trust scores for a domain based on its findings, computes module sub-scores,
 * applies EMA smoothing if previous data exists, and updates badge state.
 *
 * @param findings - Array of findings for the domain.
 * @param domain - The domain to aggregate scores for.
 */
export async function aggregateScores(findings: Finding[], domain: string): Promise<void> {
  const moduleScoresMap = new Map<ModuleId, { score: number; count: number }>();
  let totalPenalty = 0;

  findings.forEach(finding => {
    const penalty = SEVERITY_PENALTIES[finding.severity] || 0;
    totalPenalty += penalty;
    
    const current = moduleScoresMap.get(finding.module) || { score: 100, count: 0 };
    current.score -= penalty;
    current.count += 1;
    moduleScoresMap.set(finding.module, current);
  });

  const rawScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  
  const moduleScores: ModuleScore[] = Array.from(moduleScoresMap.entries()).map(([module, data]) => ({
    module,
    score: Math.max(0, Math.min(100, data.score)),
    findingCount: data.count
  }));

  let newScore = rawScore;
  await atomicUpdateStorage('trust_data', (trustDataRecord) => {
    const previousData = trustDataRecord[domain];
    if (previousData) {
      // Apply EMA smoothing
      newScore = Math.round((SCORE_EMA_ALPHA * rawScore) + ((1 - SCORE_EMA_ALPHA) * previousData.unifiedScore));
    }
    
    const trustData: DomainTrustData = {
      domain,
      unifiedScore: newScore,
      moduleScores,
      lastUpdated: new Date().toISOString()
    };

    return {
      ...trustDataRecord,
      [domain]: trustData
    };
  });

  // Manage badge based on the unified score
  let badgeColor: string = BADGE_COLORS.safe;
  if (newScore <= SCORE_DANGER_THRESHOLD) {
    badgeColor = BADGE_COLORS.danger;
  } else if (newScore <= SCORE_CAUTION_THRESHOLD) {
    badgeColor = BADGE_COLORS.caution;
  }
  
  await chrome.action.setBadgeText({ text: newScore.toString() });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}
