import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationFactory } from './observation';
import { TrustEngine } from './trust-engine';
import { EvidenceGraph, EvidenceNode } from './graph';
import { navigationState } from '../background/navigation-state';
import type { ScanContext } from '../shared/scan-context';

describe('Vigil Phase 1: Observation Provenance & Graph Traceability', () => {
  const mockContext: ScanContext = {
    tabId: 42,
    navigationId: 'nav-test-prov',
    origin: 'https://shop.example.com',
    hostname: 'shop.example.com',
    startedAt: 1700000000000,
  };

  beforeEach(() => {
    navigationState.startNavigation(42, 'nav-test-prov');
  });

  it('ObservationFactory attaches complete ObservationProvenance to network observations', () => {
    const obs = ObservationFactory.fromNetworkRequest(mockContext, {
      url: 'https://tracker.com/beacon',
      crossSite: true,
    });

    expect(obs.provenance).toBeDefined();
    expect(obs.provenance?.source).toBe('NETWORK');
    expect(obs.provenance?.detectorId).toBe('network-monitor');
    expect(obs.provenance?.navigationId).toBe('nav-test-prov');
    expect(obs.provenance?.origin).toBe('https://shop.example.com');
    expect(obs.provenance?.evidenceType).toBe('HTTP_REQUEST');
    expect(obs.provenance?.collectionMethod).toBe('web-request-listener');
    expect(obs.provenance?.timestamp).toBeGreaterThan(0);
  });

  it('ObservationFactory attaches complete ObservationProvenance to storage observations', () => {
    const obs = ObservationFactory.fromCookieAction(mockContext, {
      action: 'SET_COOKIE',
      name: 'cart_id',
    });

    expect(obs.provenance).toBeDefined();
    expect(obs.provenance?.source).toBe('STORAGE');
    expect(obs.provenance?.detectorId).toBe('cookie-monitor');
    expect(obs.provenance?.evidenceType).toBe('COOKIE_TRANSACTION');
    expect(obs.provenance?.collectionMethod).toBe('storage-observer');
  });

  it('ObservationFactory attaches complete ObservationProvenance to DOM observations', () => {
    const obs = ObservationFactory.fromDOMMutation(mockContext, {
      type: 'COUNTDOWN_DETECTED',
    });

    expect(obs.provenance).toBeDefined();
    expect(obs.provenance?.source).toBe('DOM');
    expect(obs.provenance?.detectorId).toBe('dom-observer');
    expect(obs.provenance?.evidenceType).toBe('DOM_MUTATION');
    expect(obs.provenance?.collectionMethod).toBe('mutation-observer');
  });

  it('ObservationFactory attaches complete ObservationProvenance to policy observations', () => {
    const obs = ObservationFactory.fromPolicyObservation(mockContext, {
      statement: 'We do not sell data.',
    });

    expect(obs.provenance).toBeDefined();
    expect(obs.provenance?.source).toBe('POLICY');
    expect(obs.provenance?.detectorId).toBe('policy-scanner');
    expect(obs.provenance?.evidenceType).toBe('LEGAL_DISCLOSURE');
  });

  it('EvidenceGraph retains provenance and supports encapsulated queries', () => {
    const graph = new EvidenceGraph();

    const node1: EvidenceNode<any> = {
      id: 'node-1',
      type: 'NETWORK',
      navigationId: 'nav-test-prov',
      tabId: 42,
      timestamp: 1000,
      source: 'network-monitor',
      strength: 1.0,
      context: mockContext,
      data: { url: 'https://ad.com' },
      provenance: {
        observationId: 'obs-1',
        collector: 'network-monitor',
        collectorVersion: '1.0.0',
        source: 'NETWORK',
        detectorId: 'network-monitor',
        timestamp: 1000,
        evidenceType: 'HTTP_REQUEST',
        origin: 'https://shop.example.com',
      },
    };

    const node2: EvidenceNode<any> = {
      id: 'node-2',
      type: 'STORAGE',
      navigationId: 'nav-test-prov',
      tabId: 42,
      timestamp: 1010,
      source: 'cookie-monitor',
      strength: 1.0,
      context: mockContext,
      data: { key: '_id' },
      provenance: {
        observationId: 'obs-2',
        collector: 'cookie-monitor',
        collectorVersion: '1.0.0',
        source: 'STORAGE',
        detectorId: 'cookie-monitor',
        timestamp: 1010,
        evidenceType: 'COOKIE_TRANSACTION',
        origin: 'https://shop.example.com',
      },
    };

    graph.addNode(node1);
    graph.addNode(node2);
    graph.addEdge({ from: 'node-1', to: 'node-2', relation: 'CORRELATES', weight: 0.9 });

    // Encapsulated queries
    expect(graph.getNodeProvenance('node-1')?.detectorId).toBe('network-monitor');
    expect(graph.getNodeProvenance('node-2')?.source).toBe('STORAGE');

    const networkNodes = graph.getNodesByDetector('network-monitor');
    expect(networkNodes.length).toBe(1);
    expect(networkNodes[0].id).toBe('node-1');

    const cookieNodes = graph.getNodesByEvidenceType('COOKIE_TRANSACTION');
    expect(cookieNodes.length).toBe(1);
    expect(cookieNodes[0].id).toBe('node-2');

    // Complete node trace
    const trace = graph.getNodeTrace('node-1');
    expect(trace).toBeDefined();
    expect(trace?.provenance.observationId).toBe('obs-1');
    expect(trace?.edges.length).toBe(1);
    expect(trace?.edges[0].relation).toBe('CORRELATES');
  });

  it('TrustEngine propagates provenance through observe -> finalize pipeline', () => {
    const engine = new TrustEngine();
    const obs = ObservationFactory.fromNetworkRequest(mockContext, {
      url: 'https://thirdparty.test/collect',
      crossSite: true,
    });

    engine.observe(obs);
    const nodes = (engine as any).graph.getNodesByNavigationId('nav-test-prov');
    expect(nodes.length).toBe(1);
    expect(nodes[0].provenance.detectorId).toBe('network-monitor');
    expect(nodes[0].provenance.origin).toBe('https://shop.example.com');
  });
});
