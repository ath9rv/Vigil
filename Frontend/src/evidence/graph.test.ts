import { describe, it, expect } from 'vitest';
import { EvidenceGraph, EvidenceNode, EvidenceEdge } from './graph';

describe('EvidenceGraph (Phase 2A)', () => {
  const mockProvenance = { collector: 'test', collectorVersion: '1.0', observationId: 'obs-1' };
  const mockContext = { tabId: 1, navigationId: 'nav-1', origin: 'test.com', hostname: 'test.com', startedAt: 123 };

  it('adds nodes and edges and retrieves connected subgraphs', () => {
    const graph = new EvidenceGraph();

    const node1: EvidenceNode = { id: 'n1', type: 'DOM', navigationId: 'nav-1', tabId: 1, timestamp: 100, source: 'login-form', strength: 1.0, context: mockContext as any, data: null, provenance: mockProvenance };
    const node2: EvidenceNode = { id: 'n2', type: 'NETWORK', navigationId: 'nav-1', tabId: 1, timestamp: 110, source: 'auth-request', strength: 0.9, context: mockContext as any, data: null, provenance: mockProvenance };
    const node3: EvidenceNode = { id: 'n3', type: 'DOCUMENT', navigationId: 'nav-1', tabId: 1, timestamp: 120, source: 'oauth-redirect', strength: 1.0, context: mockContext as any, data: null, provenance: mockProvenance };

    graph.addNode(node1);
    graph.addNode(node2);
    graph.addNode(node3);

    graph.addEdge({ from: 'n1', to: 'n2', relation: 'PRECEDES', weight: 1.0 });
    graph.addEdge({ from: 'n2', to: 'n3', relation: 'CORRELATES', weight: 0.8 });

    const subgraph = graph.getConnectedSubgraph('n1');
    expect(subgraph.nodes).toHaveLength(3);
    expect(subgraph.edges).toHaveLength(2);
  });

  it('queries neighbors by specific relations', () => {
    const graph = new EvidenceGraph();

    const baseNode: EvidenceNode = { id: 'base', type: 'DOM', navigationId: 'nav-1', tabId: 1, timestamp: 100, source: 'form', strength: 1.0, context: mockContext as any, data: null, provenance: mockProvenance };
    const supportNode: EvidenceNode = { id: 'sup', type: 'NETWORK', navigationId: 'nav-1', tabId: 1, timestamp: 110, source: 'req', strength: 0.9, context: mockContext as any, data: null, provenance: mockProvenance };
    const contradictNode: EvidenceNode = { id: 'con', type: 'THREAT_INTEL', navigationId: 'nav-1', tabId: 1, timestamp: 120, source: 'whitelist', strength: 1.0, context: mockContext as any, data: null, provenance: mockProvenance };

    graph.addNode(baseNode);
    graph.addNode(supportNode);
    graph.addNode(contradictNode);

    graph.addEdge({ from: 'sup', to: 'base', relation: 'SUPPORTS', weight: 1.0 });
    graph.addEdge({ from: 'con', to: 'base', relation: 'CONTRADICTS', weight: 1.0 });

    const supporters = graph.getNeighborsByRelation('base', 'SUPPORTS');
    expect(supporters).toHaveLength(1);
    expect(supporters[0].id).toBe('sup');

    const contradicters = graph.getNeighborsByRelation('base', 'CONTRADICTS');
    expect(contradicters).toHaveLength(1);
    expect(contradicters[0].id).toBe('con');
  });
});
