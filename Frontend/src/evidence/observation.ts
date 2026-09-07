import { RawObservation, Finding } from '../shared/types';
import type { ScanContext } from '../shared/scan-context';

export class ObservationFactory {
  static fromNetworkRequest(context: ScanContext, payload: any): RawObservation {
    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp: Date.now(),
      sourceType: 'NETWORK',
      source: 'network-monitor',
      payload,
      collector: 'network-monitor',
      collectorVersion: '1.0.0',
    };
  }

  static fromCookieAction(context: ScanContext, payload: any): RawObservation {
    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp: Date.now(),
      sourceType: 'STORAGE',
      source: 'cookie-monitor',
      payload,
      collector: 'cookie-monitor',
      collectorVersion: '1.0.0',
    };
  }

  static fromDOMMutation(context: ScanContext, payload: any): RawObservation {
    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp: Date.now(),
      sourceType: 'DOM',
      source: 'dom-observer',
      payload,
      collector: 'dom-observer',
      collectorVersion: '1.0.0',
    };
  }

  static fromPolicyObservation(context: ScanContext, payload: any): RawObservation {
    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp: Date.now(),
      sourceType: 'DOCUMENT',
      source: 'policy-scanner',
      payload,
      collector: 'policy-scanner',
      collectorVersion: '1.0.0',
    };
  }

  static fromLegacyFinding(finding: Finding, context: ScanContext): RawObservation {
    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp: Date.now(),
      sourceType: 'DOM', // Most legacy findings are DOM-based from the content script
      source: 'legacy-scanner',
      payload: {
        legacyFindingId: finding.id,
        legacyRuleId: finding.ruleId,
        originalSeverity: finding.severity,
        originalMessage: finding.explanation,
        elementSelector: finding.elementSelector,
        module: finding.module,
      },
      collector: 'legacy-scanner',
      collectorVersion: '1.0.0',
    };
  }
}
