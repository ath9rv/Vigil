import type { ScanContext } from '../shared/scan-context';
import type { EvidenceSourceType } from './evidence';
import type { RawObservation, ObservationProvenance } from '../shared/types';

export type EvidenceRelation = 
  | 'SUPPORTS' 
  | 'CONTRADICTS' 
  | 'CORRELATES' 
  | 'PRECEDES' 
  | 'EXPLAINS' 
  | 'DUPLICATES';

export interface EvidenceProvenance {
  collector: string;
  collectorVersion: string;
  observationId: string;
  source?: 'DOM' | 'NETWORK' | 'STORAGE' | 'POLICY' | 'DEFENDER' | 'TEST_LAB';
  detectorId?: string;
  timestamp?: number;
  frameId?: string;
  origin?: string;
  evidenceType?: string;
  collectionMethod?: string;
  rawObservation?: RawObservation;
}

export interface EvidenceNode<T = unknown> {
  id: string;
  type: EvidenceSourceType;
  navigationId: string;
  tabId: number;
  timestamp: number;
  source: string;
  strength: number;
  context: ScanContext;
  data: T;
  provenance: EvidenceProvenance;
}

export interface EvidenceEdge {
  from: string; // Node ID
  to: string; // Node ID
  relation: EvidenceRelation;
  weight: number;
}

export interface EvidenceSubgraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface NodeTrace {
  node: EvidenceNode;
  provenance: EvidenceProvenance;
  edges: EvidenceEdge[];
}

/**
 * The core Evidence Graph for the Vigil V4 Reasoning Engine.
 * Maintains evidence nodes and relationships, allowing for complex
 * querying of contradictions, corroborations, and temporal flows.
 */
export class EvidenceGraph {
  private nodes = new Map<string, EvidenceNode>();
  private edges = new Set<EvidenceEdge>();
  
  // Quick lookup indices
  private edgesByNode = new Map<string, Set<EvidenceEdge>>();

  public addNode(node: EvidenceNode): void {
    this.nodes.set(node.id, node);
    if (!this.edgesByNode.has(node.id)) {
      this.edgesByNode.set(node.id, new Set());
    }
  }

  public addEdge(edge: EvidenceEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      console.warn(`[Vigil EvidenceGraph] Cannot add edge between non-existent nodes: ${edge.from} -> ${edge.to}`);
      return;
    }

    // Check for duplicates
    for (const existing of this.edges) {
      if (existing.from === edge.from && existing.to === edge.to && existing.relation === edge.relation) {
        return; // Prevent exact duplicate edges
      }
    }

    this.edges.add(edge);
    this.edgesByNode.get(edge.from)!.add(edge);
    this.edgesByNode.get(edge.to)!.add(edge);
  }

  public getNode(id: string): EvidenceNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Returns all nodes belonging to a specific navigation.
   */
  public getNodesByNavigationId(navigationId: string): EvidenceNode[] {
    return Array.from(this.nodes.values()).filter(n => n.navigationId === navigationId);
  }

  /**
   * Trace back node to its exact source provenance.
   */
  public getNodeProvenance(nodeId: string): EvidenceProvenance | undefined {
    return this.nodes.get(nodeId)?.provenance;
  }

  /**
   * Retrieve the raw observation that produced this node, if retained.
   */
  public getSourceObservation(nodeId: string): RawObservation | undefined {
    return this.nodes.get(nodeId)?.provenance?.rawObservation;
  }

  /**
   * Query all nodes produced by a specific detector ID.
   */
  public getNodesByDetector(detectorId: string): EvidenceNode[] {
    return Array.from(this.nodes.values()).filter(n => n.provenance?.detectorId === detectorId);
  }

  /**
   * Query all nodes matching an evidence type.
   */
  public getNodesByEvidenceType(evidenceType: string): EvidenceNode[] {
    return Array.from(this.nodes.values()).filter(n => n.provenance?.evidenceType === evidenceType);
  }

  /**
   * Encapsulated complete trace of an evidence node (node, provenance, and edges).
   */
  public getNodeTrace(nodeId: string): NodeTrace | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;
    const edges = Array.from(this.edgesByNode.get(nodeId) || []);
    return {
      node,
      provenance: node.provenance,
      edges,
    };
  }

  /**
   * Retrieves all nodes and edges connected to a starting node ID.
   */
  public getConnectedSubgraph(startNodeId: string): EvidenceSubgraph {
    const startNode = this.nodes.get(startNodeId);
    if (!startNode) return { nodes: [], edges: [] };

    const visitedNodes = new Set<string>();
    const collectedEdges = new Set<EvidenceEdge>();
    const queue = [startNodeId];
    visitedNodes.add(startNodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const adjacentEdges = this.edgesByNode.get(current) || new Set();

      for (const edge of adjacentEdges) {
        collectedEdges.add(edge);
        
        const neighbor = edge.from === current ? edge.to : edge.from;
        if (!visitedNodes.has(neighbor)) {
          visitedNodes.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return {
      nodes: Array.from(visitedNodes).map(id => this.nodes.get(id)!),
      edges: Array.from(collectedEdges)
    };
  }

  /**
   * Queries immediate neighbors by a specific relation.
   */
  public getNeighborsByRelation(nodeId: string, relation: EvidenceRelation, direction: 'IN' | 'OUT' | 'BOTH' = 'BOTH'): EvidenceNode[] {
    const adjacentEdges = this.edgesByNode.get(nodeId) || new Set();
    const neighbors: EvidenceNode[] = [];

    for (const edge of adjacentEdges) {
      if (edge.relation === relation) {
        if (direction === 'OUT' || direction === 'BOTH') {
          if (edge.from === nodeId) neighbors.push(this.nodes.get(edge.to)!);
        }
        if (direction === 'IN' || direction === 'BOTH') {
          if (edge.to === nodeId) neighbors.push(this.nodes.get(edge.from)!);
        }
      }
    }

    return neighbors;
  }
}
