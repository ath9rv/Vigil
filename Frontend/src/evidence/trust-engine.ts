import {
  RawObservation,
  TrustEngineResult,
  ForensicReport,
  VerdictResolution,
} from '../shared/types';
import { EVIDENCE_BUDGETS } from '../shared/constants';
import { EvidenceGraph, EvidenceNode } from './graph';
import { TemporalCorrelator, TemporalEventType } from './temporal';
import { ConsistencyEngine } from './contradiction';
import { VerdictResolver } from './verdict-resolver';
import { ExplanationEngine } from './explanation-engine';
import { ClaimExtractor } from './claim-extractor';
import { navigationState } from '../background/navigation-state';

export class TrustEngine {
  private graph = new EvidenceGraph();
  private correlator = new TemporalCorrelator();
  private consistencyEngine = new ConsistencyEngine();
  private verdictResolver = new VerdictResolver();
  private explanationEngine = new ExplanationEngine();
  private claimExtractor = new ClaimExtractor();

  private processedObservationIds = new Set<string>();
  private observationContentHashes = new Set<string>();
  
  private nodeCountByNav = new Map<string, number>();
  private claimCountByNav = new Map<string, number>();
  private disposedNavigations = new Set<string>();
  
  /** Maps claimId → predicate for external lookup */
  public claimPredicateMap = new Map<string, string>();
  
  public budgetRejectedCount = 0;
  public budgetRejectionsByType: Record<string, number> = {};

  private generateHash(obs: RawObservation): string {
    return `${obs.navigationId}:${obs.sourceType}:${obs.source}:${JSON.stringify(obs.payload)}`;
  }

  public observe(observation: RawObservation): void {
    const { id, navigationId, tabId, sourceType } = observation;

    if (!navigationState.isNavigationValid(tabId, navigationId) || this.disposedNavigations.has(navigationId)) {
      console.warn(`[TrustEngine] Dropping observation for stale navigation ${navigationId}`);
      return;
    }

    if (this.processedObservationIds.has(id)) {
      return; // Idempotent deduplication
    }
    this.processedObservationIds.add(id);

    const hash = this.generateHash(observation);
    if (this.observationContentHashes.has(hash)) {
      return; // Identical evidence deduplication
    }
    this.observationContentHashes.add(hash);

    const currentNodes = this.nodeCountByNav.get(navigationId) || 0;
    if (currentNodes >= EVIDENCE_BUDGETS.MAX_NODES_PER_NAVIGATION) {
      this.recordBudgetRejection('MAX_NODES');
      return;
    }

    // Map observation to EvidenceNode
    const nodeId = crypto.randomUUID();
    const node: EvidenceNode<any> = {
      id: nodeId,
      type: sourceType,
      navigationId,
      tabId,
      timestamp: observation.timestamp,
      source: observation.source,
      strength: 1.0,
      context: { hostname: 'unknown', url: 'unknown', tabId, navigationId, startedAt: 0, initiator: 'unknown' } as any,
      data: observation.payload,
      provenance: {
        observationId: id,
        collector: observation.collector,
        collectorVersion: observation.collectorVersion,
      }
    };

    this.graph.addNode(node);
    this.nodeCountByNav.set(navigationId, currentNodes + 1);

    // Record into temporal correlator
    const eventType = this.mapToTemporalEventType(observation);
    if (eventType) {
       this.correlator.record({
         id: crypto.randomUUID(),
         navigationId,
         tabId,
         timestamp: observation.timestamp,
         nodeId,
         eventType,
         sequence: 0,
       });
    }
  }

  public finalize(navigationId: string): TrustEngineResult {
    // 1. Gather Nodes and Temporal Correlations
    // In a real system, you'd get the subgraph for the navigation. Here we just filter.
    // (A real EvidenceGraph would need a getNodesByNavigationId method, but for now we filter all nodes or mock it)
    // We'll extract this directly from the graph if possible. Since graph doesn't expose getAllNodes, we'll track them, or assume we can query.
    // Let's implement a workaround: we know the graph nodes internally. For simplicity here, we assume we can query them.
    const nodes = this.getAllNodesForNav(navigationId);
    const correlations = this.correlator.correlate(navigationId);

    // Cap correlations budget
    const cappedCorrelations = correlations.slice(0, EVIDENCE_BUDGETS.MAX_CORRELATIONS_PER_NAVIGATION);

    // 2. Extract Claims
    const extractedClaims = this.claimExtractor.extractClaims(nodes);
    const cappedClaims = extractedClaims.slice(0, EVIDENCE_BUDGETS.MAX_CLAIMS_PER_NAVIGATION);
    this.claimCountByNav.set(navigationId, cappedClaims.length);

    // Store claim predicates for external lookup
    for (const claim of cappedClaims) {
      this.claimPredicateMap.set(claim.id, claim.predicate);
    }

    // 3. Resolve Verdicts
    const resolutions: VerdictResolution[] = [];
    const reports: ForensicReport[] = [];

    for (const claim of cappedClaims) {
      const score = this.consistencyEngine.evaluateClaim(claim, nodes, cappedCorrelations);
      const resolution = this.verdictResolver.resolve(claim, score, nodes, cappedCorrelations);
      
      resolutions.push(resolution);

      if (resolution.eligibility === 'ELIGIBLE' && resolution.verdict) {
        reports.push(this.explanationEngine.generateReport(resolution, nodes, cappedCorrelations));
      }
    }

    return {
      navigationId,
      resolutions,
      reports,
      rejectedCount: this.budgetRejectedCount,
    };
  }

  public dispose(navigationId: string): void {
    this.disposedNavigations.add(navigationId);
    this.correlator.disposeNavigation(navigationId);
    this.nodeCountByNav.delete(navigationId);
    this.claimCountByNav.delete(navigationId);
  }

  private recordBudgetRejection(type: string) {
    this.budgetRejectedCount++;
    this.budgetRejectionsByType[type] = (this.budgetRejectionsByType[type] || 0) + 1;
  }

  private mapToTemporalEventType(obs: RawObservation): TemporalEventType | null {
    if (obs.sourceType === 'NETWORK') return 'NETWORK_REQUEST';
    if (obs.sourceType === 'DOM') return 'DOM_MUTATION';
    if (obs.sourceType === 'STORAGE') return 'COOKIE_SET'; // Or STORAGE_WRITE
    if (obs.sourceType === 'DOCUMENT') return 'POLICY_OBSERVATION';
    return null;
  }

  // Use the proper public API to get nodes for a specific navigation
  private getAllNodesForNav(navigationId: string): EvidenceNode<any>[] {
    if (this.disposedNavigations.has(navigationId)) {
      return [];
    }
    return this.graph.getNodesByNavigationId(navigationId);
  }
}

export const trustEngine = new TrustEngine();
