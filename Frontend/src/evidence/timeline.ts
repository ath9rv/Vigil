/**
 * Evidence Timeline Engine
 *
 * Derives a deterministic, chronological representation of security, privacy,
 * and behavioral observations directly from canonical EvidenceGraph nodes and
 * Temporal correlations.
 *
 * Distinctly preserves:
 * - What was observed at what exact moment
 * - The origin and detector provenance of the observation
 * - Lineage links to specific evidence node IDs
 */

import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';
import type { ObservationProvenance } from '../shared/types';

export interface EvidenceTimelineEvent {
  id: string;
  timestamp: number;
  category: 'NETWORK' | 'STORAGE' | 'DOM' | 'POLICY' | 'DEFENDER' | 'CORRELATION';
  title: string;
  description: string;
  source: ObservationProvenance;
  evidenceNodeIds: string[];
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class EvidenceTimeline {
  /**
   * Derives an ordered timeline of events for a set of nodes and temporal correlations.
   */
  public static buildTimeline(
    nodes: EvidenceNode[],
    correlations: TemporalCorrelation[] = []
  ): EvidenceTimelineEvent[] {
    const events: EvidenceTimelineEvent[] = [];

    // 1. Convert EvidenceNodes into timeline entries
    for (const node of nodes) {
      const event = this.nodeToTimelineEvent(node);
      if (event) {
        events.push(event);
      }
    }

    // 2. Add high-level temporal correlation events
    for (const corr of correlations) {
      const provenance: ObservationProvenance = {
        source: 'TEST_LAB', // synthesized internal correlation
        detectorId: 'temporal-correlator',
        timestamp: corr.startTime,
        evidenceType: 'TEMPORAL_CORRELATION',
        collectionMethod: 'event-correlation-engine',
      };

      const scoreTotal = corr.score?.total ?? 1.0;
      events.push({
        id: `timeline-corr-${corr.id}`,
        timestamp: corr.startTime,
        category: 'CORRELATION',
        title: `Correlated Pattern: ${corr.pattern.replace(/_/g, ' ')}`,
        description: `Correlated ${corr.supportingNodeIds.length} events spanning ${corr.durationMs}ms with correlation score ${(scoreTotal * 100).toFixed(0)}%`,
        source: provenance,
        evidenceNodeIds: corr.supportingNodeIds,
        importance: scoreTotal >= 0.8 ? 'HIGH' : 'MEDIUM',
      });
    }

    // 3. Sort strictly chronologically
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  private static nodeToTimelineEvent(node: EvidenceNode): EvidenceTimelineEvent | null {
    const prov: ObservationProvenance = {
      source: (node.provenance.source as any) || (node.type === 'DOCUMENT' ? 'POLICY' : (node.type as any)) || 'DOM',
      detectorId: node.provenance.detectorId || node.provenance.collector,
      navigationId: node.navigationId,
      timestamp: node.timestamp,
      frameId: node.provenance.frameId || 'main',
      origin: node.provenance.origin || node.context?.hostname,
      evidenceType: node.provenance.evidenceType || node.type,
      collectionMethod: node.provenance.collectionMethod || 'system-event',
    };

    const data = node.data as any;

    if (node.type === 'STORAGE') {
      const name = data?.name || data?.cookieName || 'cookie';
      const valueSnippet = data?.value ? ` (${String(data.value).slice(0, 10)}...)` : '';
      return {
        id: `timeline-node-${node.id}`,
        timestamp: node.timestamp,
        category: 'STORAGE',
        title: 'Identifier / Cookie Accessed',
        description: `Storage key "${name}"${valueSnippet} read or updated on ${node.context?.hostname || 'current origin'}`,
        source: prov,
        evidenceNodeIds: [node.id],
        importance: 'HIGH',
      };
    }

    if (node.type === 'NETWORK') {
      const domain = data?.domain || data?.url || 'remote host';
      const isCross = data?.crossSite ? 'Third-party' : 'First-party';
      return {
        id: `timeline-node-${node.id}`,
        timestamp: node.timestamp,
        category: 'NETWORK',
        title: `${isCross} Network Request`,
        description: `Outbound transmission to ${domain}${data?.trackerCount ? ` (matches ${data.trackerCount} tracker rules)` : ''}`,
        source: prov,
        evidenceNodeIds: [node.id],
        importance: data?.crossSite ? 'HIGH' : 'MEDIUM',
      };
    }

    if (node.type === 'DOCUMENT') {
      return {
        id: `timeline-node-${node.id}`,
        timestamp: node.timestamp,
        category: 'POLICY',
        title: 'Legal / Policy Statement Observed',
        description: data?.excerpt ? `Clause: "${String(data.excerpt).slice(0, 80)}..."` : 'Document disclosure parsed',
        source: prov,
        evidenceNodeIds: [node.id],
        importance: 'MEDIUM',
      };
    }

    if (node.type === 'DOM') {
      const isUrgency = data?.type === 'COUNTDOWN' || data?.legacyRuleId?.includes('M1');
      return {
        id: `timeline-node-${node.id}`,
        timestamp: node.timestamp,
        category: 'DOM',
        title: isUrgency ? 'Behavioral UI / Urgency Pattern' : 'DOM Mutation Observed',
        description: data?.originalMessage || data?.selector || (data?.elementCount ? `${data.elementCount} elements analyzed` : 'UI element rendered'),
        source: prov,
        evidenceNodeIds: [node.id],
        importance: isUrgency ? 'HIGH' : 'LOW',
      };
    }

    if (node.type === 'THREAT_INTEL') {
      return {
        id: `timeline-node-${node.id}`,
        timestamp: node.timestamp,
        category: 'DEFENDER',
        title: 'MAIN-World Interception',
        description: data?.api ? `Access to ${data.api} intercepted and normalized` : 'Fingerprint extraction defended',
        source: prov,
        evidenceNodeIds: [node.id],
        importance: 'HIGH',
      };
    }

    return {
      id: `timeline-node-${node.id}`,
      timestamp: node.timestamp,
      category: 'DOM',
      title: 'Observation Recorded',
      description: `Observed ${node.source} event`,
      source: prov,
      evidenceNodeIds: [node.id],
      importance: 'LOW',
    };
  }
}
