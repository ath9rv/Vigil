import { RawObservation, Finding, ObservationProvenance } from '../shared/types';
import type { ScanContext } from '../shared/scan-context';

export class ObservationFactory {
  static fromNetworkRequest(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'NETWORK',
      detectorId: 'network-monitor',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'HTTP_REQUEST',
      collectionMethod: 'web-request-listener',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'NETWORK',
      source: 'network-monitor',
      payload,
      collector: 'network-monitor',
      collectorVersion: '1.0.0',
      provenance,
    };
  }

  static fromCookieAction(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'STORAGE',
      detectorId: 'cookie-monitor',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'COOKIE_TRANSACTION',
      collectionMethod: 'storage-observer',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'STORAGE',
      source: 'cookie-monitor',
      payload,
      collector: 'cookie-monitor',
      collectorVersion: '1.0.0',
      provenance,
    };
  }

  static fromDOMMutation(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'DOM',
      detectorId: 'dom-observer',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'DOM_MUTATION',
      collectionMethod: 'mutation-observer',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'DOM',
      source: 'dom-observer',
      payload,
      collector: 'dom-observer',
      collectorVersion: '1.0.0',
      provenance,
    };
  }

  static fromPolicyObservation(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'POLICY',
      detectorId: 'policy-scanner',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'LEGAL_DISCLOSURE',
      collectionMethod: 'dom-extractor',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'DOCUMENT',
      source: 'policy-scanner',
      payload,
      collector: 'policy-scanner',
      collectorVersion: '1.0.0',
      provenance,
    };
  }

  static fromLegacyFinding(finding: Finding, context: ScanContext): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'DOM',
      detectorId: finding.module || 'legacy-scanner',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'DARK_PATTERN_PROBE',
      collectionMethod: 'content-script-scan',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
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
      provenance,
    };
  }

  static fromDefenderEvent(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'DEFENDER',
      detectorId: 'main-world-defender',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'FINGERPRINT_INTERCEPTION',
      collectionMethod: 'main-world-injection',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'THREAT_INTEL',
      source: 'main-world-defender',
      payload,
      collector: 'main-world-defender',
      collectorVersion: '1.0.0',
      provenance,
    };
  }

  static fromTestLab(context: ScanContext, payload: any): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'TEST_LAB',
      detectorId: 'scenario-runner',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'SCENARIO_PROBE',
      collectionMethod: 'test-lab-fixture',
    };

    return {
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'DOM',
      source: 'scenario-runner',
      payload,
      collector: 'scenario-runner',
      collectorVersion: '1.0.0',
      provenance,
    };
  }
}
