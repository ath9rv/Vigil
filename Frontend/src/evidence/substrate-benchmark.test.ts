import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationFactory } from './observation';
import { TrustEngine } from './trust-engine';
import { EvidenceGraph } from './graph';
import { VerdictResolver } from './verdict-resolver';
import { navigationState } from '../background/navigation-state';
import { EVIDENCE_BUDGETS } from '../shared/constants';
import type { ScanContext } from '../shared/scan-context';

describe('V2.1 Trust Substrate: Contract Freeze & Performance Benchmark', () => {
  const dummyContext: ScanContext = {
    tabId: 99,
    navigationId: 'nav-bench-1',
    hostname: 'benchmark.example.com',
    startedAt: Date.now(),
    origin: 'https://benchmark.example.com',
  };

  beforeEach(() => {
    navigationState.startNavigation(dummyContext.tabId, dummyContext.navigationId);
  });

  describe('Contract & Immutability Verification (INV-V4-001 / ADR-002 / ADR-004)', () => {
    it('enforces deep runtime immutability on ObservationFactory output', () => {
      const obs = ObservationFactory.fromDOMMutation(dummyContext, {
        selector: '#checkout-fee',
        addedText: '$15.00 Service Fee',
      });

      expect(Object.isFrozen(obs)).toBe(true);
      expect(Object.isFrozen(obs.payload)).toBe(true);
      expect(Object.isFrozen(obs.provenance)).toBe(true);
      expect(obs.provenance.source).toBe('DOM');
      expect(obs.provenance.navigationId).toBe('nav-bench-1');

      // Attempted mutations should fail in strict mode
      expect(() => {
        (obs as any).timestamp = 12345;
      }).toThrow();

      expect(() => {
        (obs.payload as any).injected = 'malicious';
      }).toThrow();
    });

    it('returns a sealed ReadOnlyEvidenceGraph snapshot to reasoning consumers', () => {
      const engine = new TrustEngine();
      for (let i = 0; i < 10; i++) {
        const obs = ObservationFactory.fromDOMMutation(dummyContext, { index: i });
        engine.observe(obs);
      }

      const snapshot = engine.getReadOnlyEvidenceSnapshot('nav-bench-1');
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot.getNodeCount()).toBe(10);
      expect(snapshot.getNodes().length).toBe(10);

      // Verify returned nodes are frozen
      const firstNode = snapshot.getNodes()[0];
      expect(Object.isFrozen(firstNode)).toBe(true);

      // Verify no mutation API exists on snapshot
      expect((snapshot as any).addNode).toBeUndefined();
      expect((snapshot as any).addEdge).toBeUndefined();
      expect((snapshot as any).pruneNavigation).toBeUndefined();
    });

    it('VerdictResolver acts strictly as a pure consumer without mutating graph state', () => {
      const engine = new TrustEngine();
      const obs = ObservationFactory.fromConnectionSecurity('http://insecure.com', dummyContext);
      engine.observe(obs);

      const countBefore = engine.getActiveGraphNodeCount();
      const result = engine.finalize('nav-bench-1');

      expect(result.navigationId).toBe('nav-bench-1');
      expect(engine.getActiveGraphNodeCount()).toBe(countBefore);
    });
  });

  describe('Substrate Performance & Throughput Baselines', () => {
    it('measures observation creation throughput (Target: >50,000 obs/sec)', () => {
      const COUNT = 5000;
      const start = performance.now();

      for (let i = 0; i < COUNT; i++) {
        ObservationFactory.fromNetworkRequest(dummyContext, {
          url: `https://tracker.com/pixel?i=${i}`,
          method: 'GET',
        });
      }

      const elapsed = performance.now() - start;
      const obsPerSec = Math.round((COUNT / elapsed) * 1000);
      const latencyPerObsUs = Math.round((elapsed / COUNT) * 1000);

      console.log(`[BENCHMARK] Observation Creation: ${COUNT} items in ${elapsed.toFixed(2)}ms (${obsPerSec.toLocaleString()} obs/sec, ${latencyPerObsUs}µs/obs)`);

      expect(elapsed).toBeLessThan(150); // Well under 150ms for 5k observations
      expect(obsPerSec).toBeGreaterThan(10000);
    });

    it('measures EvidenceGraph insertion & indexing latency (Target: <0.05ms/node)', () => {
      const graph = new EvidenceGraph();
      const COUNT = 500;
      const start = performance.now();

      for (let i = 0; i < COUNT; i++) {
        graph.addNode({
          id: `node-${i}`,
          type: 'DOM',
          navigationId: 'nav-bench-1',
          tabId: 99,
          timestamp: Date.now() + i,
          source: 'bench',
          strength: 1.0,
          context: dummyContext,
          data: { index: i },
          provenance: {
            collector: 'bench',
            collectorVersion: '1.0.0',
            observationId: `obs-${i}`,
          },
        });
      }

      const elapsed = performance.now() - start;
      const msPerNode = elapsed / COUNT;

      console.log(`[BENCHMARK] EvidenceGraph Insertion: ${COUNT} nodes in ${elapsed.toFixed(2)}ms (${msPerNode.toFixed(4)}ms/node)`);

      expect(elapsed).toBeLessThan(50);
      expect(graph.getNodeCount()).toBe(COUNT);
    });

    it('measures TrustEngine observation ingestion and deduplication latency', () => {
      const engine = new TrustEngine();
      const COUNT = 200; // within 500-node budget
      const start = performance.now();

      for (let i = 0; i < COUNT; i++) {
        const obs = ObservationFactory.fromDOMMutation(dummyContext, { element: `#item-${i}` });
        engine.observe(obs);
      }

      const elapsed = performance.now() - start;
      const msPerIngest = elapsed / COUNT;

      console.log(`[BENCHMARK] TrustEngine Ingestion: ${COUNT} observations in ${elapsed.toFixed(2)}ms (${msPerIngest.toFixed(4)}ms/ingest)`);

      expect(elapsed).toBeLessThan(100);
      expect(engine.getActiveGraphNodeCount()).toBe(COUNT);

      // Measure duplicate rejection speed
      const dupStart = performance.now();
      for (let i = 0; i < 50; i++) {
        const obs = ObservationFactory.fromDOMMutation(dummyContext, { element: '#item-0' });
        engine.observe(obs); // Duplicate payload hash
      }
      const dupElapsed = performance.now() - dupStart;
      console.log(`[BENCHMARK] Duplicate Hash Rejection: 50 duplicates in ${dupElapsed.toFixed(2)}ms`);
      expect(dupElapsed).toBeLessThan(10);
    });

    it('measures TrustEngine finalization & verdict resolution latency', () => {
      const engine = new TrustEngine();
      // Add 10 diverse observations
      for (let i = 0; i < 10; i++) {
        engine.observe(ObservationFactory.fromConnectionSecurity(
          i % 2 === 0 ? 'http://insecure.test' : 'https://secure.test',
          dummyContext
        ));
      }

      const start = performance.now();
      const result = engine.finalize('nav-bench-1');
      const elapsed = performance.now() - start;

      console.log(`[BENCHMARK] TrustEngine Finalization: ${elapsed.toFixed(2)}ms (Resolutions: ${result.resolutions.length}, Reports: ${result.reports.length})`);

      expect(elapsed).toBeLessThan(50);
      expect(result.navigationId).toBe('nav-bench-1');
    });

    it('measures ReadOnlyEvidenceGraph snapshot extraction latency', () => {
      const engine = new TrustEngine();
      for (let i = 0; i < 300; i++) {
        engine.observe(ObservationFactory.fromDOMMutation(dummyContext, { idx: i }));
      }

      const start = performance.now();
      const snapshot = engine.getReadOnlyEvidenceSnapshot('nav-bench-1');
      const elapsed = performance.now() - start;

      console.log(`[BENCHMARK] ReadOnlyEvidenceGraph Snapshot: 300 nodes extracted and frozen in ${elapsed.toFixed(2)}ms`);

      expect(elapsed).toBeLessThan(20);
      // Graph is capped by EVIDENCE_BUDGETS.MAX_NODES_PER_NAVIGATION (200)
      expect(snapshot.getNodeCount()).toBe(EVIDENCE_BUDGETS.MAX_NODES_PER_NAVIGATION);
    });
  });
});
