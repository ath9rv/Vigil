import { describe, it, expect, beforeEach } from 'vitest';
import { TrustEngine } from './trust-engine';
import { EvidenceGraph, EvidenceNode } from './graph';
import { ObservationFactory } from './observation';
import { navigationState } from '../background/navigation-state';
import type { ScanContext } from '../shared/scan-context';

describe('Vigil Phase 2: Memory Lifecycle & Bounded Evidence Retention', () => {
  let engine: TrustEngine;

  beforeEach(() => {
    engine = new TrustEngine();
  });

  function makeContext(navId: string): ScanContext {
    return {
      tabId: 1,
      navigationId: navId,
      origin: 'https://app.test',
      hostname: 'app.test',
      startedAt: Date.now(),
    };
  }

  it('prunes all nodes and edges for disposed navigations', () => {
    const graph = new EvidenceGraph();

    const node1: EvidenceNode<any> = {
      id: 'n1',
      type: 'NETWORK',
      navigationId: 'nav-old',
      tabId: 1,
      timestamp: 1000,
      source: 'net',
      strength: 1,
      context: makeContext('nav-old'),
      data: {},
      provenance: { collector: 'c', collectorVersion: '1', observationId: 'o1' },
    };

    const node2: EvidenceNode<any> = {
      id: 'n2',
      type: 'DOM',
      navigationId: 'nav-old',
      tabId: 1,
      timestamp: 1001,
      source: 'dom',
      strength: 1,
      context: makeContext('nav-old'),
      data: {},
      provenance: { collector: 'c', collectorVersion: '1', observationId: 'o2' },
    };

    const node3: EvidenceNode<any> = {
      id: 'n3',
      type: 'NETWORK',
      navigationId: 'nav-current',
      tabId: 1,
      timestamp: 2000,
      source: 'net',
      strength: 1,
      context: makeContext('nav-current'),
      data: {},
      provenance: { collector: 'c', collectorVersion: '1', observationId: 'o3' },
    };

    graph.addNode(node1);
    graph.addNode(node2);
    graph.addNode(node3);
    graph.addEdge({ from: 'n1', to: 'n2', relation: 'CORRELATES', weight: 1.0 });

    expect(graph.getNodeCount()).toBe(3);
    expect(graph.getEdgeCount()).toBe(1);

    // Prune old navigation
    const prunedCount = graph.pruneNavigation('nav-old');

    expect(prunedCount).toBe(2);
    expect(graph.getNodeCount()).toBe(1);
    expect(graph.getEdgeCount()).toBe(0); // Edge between n1 and n2 was cleanly pruned
    expect(graph.getNode('n3')).toBeDefined();
    expect(graph.getNode('n1')).toBeUndefined();
  });

  it('guarantees bounded steady-state memory across 50 rapid SPA navigations', () => {
    // Simulate 50 route transitions
    for (let i = 0; i < 50; i++) {
      const navId = `nav-spa-${i}`;
      navigationState.startNavigation(1, navId);
      const ctx = makeContext(navId);

      // Ingest 5 observations per navigation
      for (let j = 0; j < 5; j++) {
        engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
          url: `https://api.test/data?v=${i}-${j}`,
          crossSite: false,
        }));
      }

      // Conclude and dispose previous navigations
      if (i > 0) {
        const prevNavId = `nav-spa-${i - 1}`;
        engine.dispose(prevNavId);
      }
    }

    // Graph node count must NOT be 250 (50 * 5)
    // Only the current active navigation's nodes should remain
    const activeNodes = engine.getActiveGraphNodeCount();
    expect(activeNodes).toBeLessThanOrEqual(5);
  });

  it('proves strict unreachability across 100 consecutive navigations', () => {
    const disposedNavIds: string[] = [];

    // Execute 100 navigations
    for (let i = 0; i < 100; i++) {
      const navId = `stress-nav-${i}`;
      navigationState.startNavigation(1, navId);
      const ctx = makeContext(navId);

      // Ingest observations
      for (let j = 0; j < 10; j++) {
        engine.observe(ObservationFactory.fromNetworkRequest(ctx, {
          url: `https://api.test/resource-${i}-${j}`,
          crossSite: false,
        }));
      }

      if (i > 0) {
        const prev = `stress-nav-${i - 1}`;
        engine.dispose(prev);
        disposedNavIds.push(prev);
      }
    }

    // Only active navigation 99 remains
    expect(engine.getActiveGraphNodeCount()).toBeLessThanOrEqual(10);

    // Verify all 99 disposed navigations are 100% unreachable
    const graph = (engine as any).graph as EvidenceGraph;
    for (const oldNavId of disposedNavIds) {
      const nodesForNav = graph.getNodesByNavigationId ? graph.getNodesByNavigationId(oldNavId) : [];
      expect(nodesForNav.length).toBe(0);
    }
  });

  it('prevents cross-navigation evidence contamination', () => {
    const navA = 'nav-authenticated-user';
    navigationState.startNavigation(1, navA);
    const ctxA = makeContext(navA);

    // Navigation A: User logged in, identifier X observed
    engine.observe(ObservationFactory.fromNetworkRequest(ctxA, {
      url: 'https://analytics.test/track?uid=user-12345',
      crossSite: true,
    }));

    // Dispose Navigation A
    engine.dispose(navA);

    // Navigation B: Anonymous session, identifier Y observed
    const navB = 'nav-anonymous-session';
    navigationState.startNavigation(1, navB);
    const ctxB = makeContext(navB);

    engine.observe(ObservationFactory.fromNetworkRequest(ctxB, {
      url: 'https://analytics.test/track?session=anon-99999',
      crossSite: true,
    }));

    const graph = (engine as any).graph as EvidenceGraph;
    const nodesB = graph.getNodesByNavigationId(navB);
    expect(nodesB.length).toBe(1);
    expect((nodesB[0].data as any).url).toContain('anon-99999');

    // Prove zero nodes exist for navA
    const nodesA = graph.getNodesByNavigationId(navA);
    expect(nodesA.length).toBe(0);

    // Finalize Navigation B
    const resultB = engine.finalize(navB);

    // Prove serializedResult has ZERO references to Navigation A's ID or user-12345
    const serializedResult = JSON.stringify(resultB);
    expect(serializedResult).not.toContain('user-12345');
    expect(serializedResult).not.toContain(navA);
  });
});
