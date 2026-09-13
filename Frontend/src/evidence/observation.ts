import { RawObservation, Finding, ObservationProvenance } from '../shared/types';
import type { ScanContext } from '../shared/scan-context';

export class ObservationFactory {
  /**
   * Freezes and seals an observation, creating a defensive snapshot of payload and provenance.
   * Conforms to INV-V4-001 / ADR-002: observations are immutable runtime facts.
   */
  public static freezeObservation(obs: {
    id: string;
    tabId: number;
    navigationId: string;
    timestamp: number;
    sourceType: 'DOM' | 'NETWORK' | 'DOCUMENT' | 'STORAGE' | 'THREAT_INTEL';
    source: string;
    payload: any;
    collector: string;
    collectorVersion: string;
    provenance: ObservationProvenance;
  }): RawObservation {
    const frozenPayload = Object.freeze(
      typeof obs.payload === 'object' && obs.payload !== null
        ? { ...obs.payload }
        : { value: obs.payload }
    );
    const frozenProvenance = Object.freeze({ ...obs.provenance });
    return Object.freeze({
      id: obs.id,
      observationId: obs.id,
      tabId: obs.tabId,
      navigationId: obs.navigationId,
      timestamp: obs.timestamp,
      sourceType: obs.sourceType,
      source: obs.source,
      payload: frozenPayload,
      collector: obs.collector,
      collectorVersion: obs.collectorVersion,
      provenance: frozenProvenance,
    });
  }

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

    return ObservationFactory.freezeObservation({
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
    });
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

    return ObservationFactory.freezeObservation({
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
    });
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

    return ObservationFactory.freezeObservation({
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
    });
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

    return ObservationFactory.freezeObservation({
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
    });
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

    return ObservationFactory.freezeObservation({
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
    });
  }

  /**
   * Convert legal auditor clause analysis into a structured DOCUMENT RawObservation.
   * Clause content and interpretation enter the TrustEngine strictly as evidence,
   * without assuming legal authority or pre-determining legal violation.
   */
  static fromLegalEvidence(
    clause: {
      id: string;
      ruleId: string;
      ruleName?: string;
      interpretation?: string;
      evidence?: {
        excerpt?: string;
        context?: string;
        sourceUrl?: string;
        capturedAt?: number;
        documentHash?: string;
      };
      severity?: string;
      confidence?: string;
    },
    context: ScanContext
  ): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'POLICY',
      detectorId: 'legal-auditor',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'LEGAL_CLAUSE_CLASSIFICATION',
      collectionMethod: 'ml-classifier',
    };

    const category = clause.ruleId.replace(/^LEGAL-/, '');
    let availability: 'EXPLICITLY_DENIED' | 'EXPLICITLY_ALLOWED' | 'OBSERVED' | 'UNKNOWN' = 'OBSERVED';
    if (clause.interpretation) {
      if (clause.interpretation.startsWith('FAIR:')) availability = 'EXPLICITLY_DENIED';
      else if (clause.interpretation.startsWith('TRICKY:') || clause.interpretation.startsWith('WARNING:')) availability = 'EXPLICITLY_ALLOWED';
    }

    return ObservationFactory.freezeObservation({
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'DOCUMENT',
      source: 'legal-auditor',
      payload: {
        legalFindingId: clause.id,
        ruleId: clause.ruleId,
        category,
        severity: clause.severity,
        confidence: clause.confidence,
        interpretation: clause.interpretation,
        excerpt: clause.evidence?.excerpt,
        clauseContext: clause.evidence?.context,
        documentHash: clause.evidence?.documentHash,
        availability,
      },
      collector: 'legal-auditor',
      collectorVersion: '1.0.0',
      provenance,
    });
  }

  /** Alias for backward compatibility */
  static fromLegalFinding = ObservationFactory.fromLegalEvidence;

  /**
   * Convert threat intelligence evaluation into a THREAT_INTEL RawObservation.
   * Threat matches enter the TrustEngine strictly as evidence nodes.
   */
  static fromThreatIntel(
    threatMatch: {
      status: string;
      source?: string;
      confidence: string;
      details: string;
      hashPrefixHex?: string;
    },
    context: ScanContext
  ): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'THREAT_INTEL',
      detectorId: 'threat-intel-engine',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'THREAT_REPUTATION_LOOKUP',
      collectionMethod: 'local-heuristic-engine',
    };

    return ObservationFactory.freezeObservation({
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'THREAT_INTEL',
      source: 'threat-intel-engine',
      payload: {
        threatStatus: threatMatch.status,
        threatSource: threatMatch.source || 'LOCAL_HEURISTIC',
        confidence: threatMatch.confidence,
        details: threatMatch.details,
        hashPrefixHex: threatMatch.hashPrefixHex,
      },
      collector: 'threat-intel-engine',
      collectorVersion: '1.0.0',
      provenance,
    });
  }

  /**
   * Convert connection security check into a NETWORK RawObservation.
   */
  static fromConnectionSecurity(
    url: string,
    context: ScanContext
  ): RawObservation {
    const timestamp = Date.now();
    const provenance: ObservationProvenance = {
      source: 'NETWORK',
      detectorId: 'connection-security-probe',
      navigationId: context.navigationId,
      timestamp,
      frameId: 'main',
      origin: context.origin || context.hostname,
      evidenceType: 'PROTOCOL_SECURITY_CHECK',
      collectionMethod: 'navigation-probe',
    };

    const isHttp = url.startsWith('http://');

    return ObservationFactory.freezeObservation({
      id: crypto.randomUUID(),
      tabId: context.tabId || 0,
      navigationId: context.navigationId || 'unknown',
      timestamp,
      sourceType: 'NETWORK',
      source: 'connection-security-probe',
      payload: {
        protocol: isHttp ? 'http:' : 'https:',
        isUnencrypted: isHttp,
        targetUrl: url,
        details: isHttp ? 'Unencrypted HTTP transport detected.' : 'Encrypted HTTPS transport.',
      },
      collector: 'connection-security-probe',
      collectorVersion: '1.0.0',
      provenance,
    });
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

    return ObservationFactory.freezeObservation({
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
    });
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

    return ObservationFactory.freezeObservation({
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
    });
  }
}
