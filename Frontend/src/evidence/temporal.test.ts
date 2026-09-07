import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemporalCorrelator,
  TemporalEvent,
  matchPayloads,
  TEMPORAL_WINDOWS,
} from './temporal';

describe('Phase 2B: Temporal Correlation Engine', () => {
  let correlator: TemporalCorrelator;

  beforeEach(() => {
    correlator = new TemporalCorrelator();
  });

  function makeEvent(
    overrides: Partial<TemporalEvent> & Pick<TemporalEvent, 'id' | 'eventType' | 'timestamp'>
  ): TemporalEvent {
    return {
      navigationId: 'nav-1',
      tabId: 1,
      nodeId: `node-${overrides.id}`,
      sequence: 0,
      ...overrides,
    };
  }

  // ─── 1. Basic Sequence ──────────────────────────────────────────────────

  describe('basic sequence correlation', () => {
    it('produces PRECEDES edges for A → B → C', () => {
      correlator.record(makeEvent({ id: 'a', eventType: 'COOKIE_SET', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'b', eventType: 'NETWORK_REQUEST', timestamp: 150 }));
      correlator.record(makeEvent({ id: 'c', eventType: 'NETWORK_REQUEST', timestamp: 200 }));

      const correlations = correlator.correlate('nav-1');

      // A→B should exist
      const ab = correlations.find(c => c.eventIds.includes('a') && c.eventIds.includes('b') && c.pattern === 'COOKIE_SET_TO_NETWORK_REQUEST');
      expect(ab).toBeDefined();
      expect(ab!.durationMs).toBe(50);

      // B→C should exist
      const bc = correlations.find(c => c.eventIds.includes('b') && c.eventIds.includes('c') && c.pattern === 'NETWORK_REQUEST_TO_NETWORK_REQUEST');
      expect(bc).toBeDefined();
      expect(bc!.durationMs).toBe(50);
    });
  });

  // ─── 2. Outside Window ─────────────────────────────────────────────────

  describe('relation-specific temporal windows', () => {
    it('produces no correlation when delta exceeds the relation window', () => {
      // SCRIPT_EXECUTION_TO_NETWORK_REQUEST window is 100ms
      correlator.record(makeEvent({ id: 'a', eventType: 'SCRIPT_EXECUTION', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'b', eventType: 'NETWORK_REQUEST', timestamp: 5100 }));

      const correlations = correlator.correlate('nav-1');
      const scriptToNetwork = correlations.filter(c => c.pattern === 'SCRIPT_EXECUTION_TO_NETWORK_REQUEST');
      expect(scriptToNetwork).toHaveLength(0);
    });

    it('produces a correlation when delta is within the relation window', () => {
      // SCRIPT_EXECUTION_TO_NETWORK_REQUEST window is 100ms
      correlator.record(makeEvent({ id: 'a', eventType: 'SCRIPT_EXECUTION', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'b', eventType: 'NETWORK_REQUEST', timestamp: 150 }));

      const correlations = correlator.correlate('nav-1');
      const scriptToNetwork = correlations.filter(c => c.pattern === 'SCRIPT_EXECUTION_TO_NETWORK_REQUEST');
      expect(scriptToNetwork).toHaveLength(1);
      expect(scriptToNetwork[0].durationMs).toBe(50);
    });
  });

  // ─── 3. Payload Correlation ─────────────────────────────────────────────

  describe('payload substring matching', () => {
    it('produces high confidence for exact payload match', () => {
      correlator.record(makeEvent({
        id: 'a', eventType: 'COOKIE_SET', timestamp: 100,
        metadata: { payload: 'ABC123', cookieName: 'visitor_id' }
      }));
      correlator.record(makeEvent({
        id: 'b', eventType: 'NETWORK_REQUEST', timestamp: 150,
        metadata: { payload: 'ABC123', domain: 'tracker.example' }
      }));

      const correlations = correlator.correlate('nav-1');
      const match = correlations.find(c => c.eventIds.includes('a') && c.eventIds.includes('b'));
      expect(match).toBeDefined();
      expect(match!.payloadMatch).toBe('EXACT');
      expect(match!.score.payloadSubstring).toBe(1.0);
    });

    it('produces low confidence when payloads do not match', () => {
      correlator.record(makeEvent({
        id: 'a', eventType: 'COOKIE_SET', timestamp: 100,
        metadata: { payload: 'ABC123' }
      }));
      correlator.record(makeEvent({
        id: 'b', eventType: 'NETWORK_REQUEST', timestamp: 150,
        metadata: { payload: 'XYZ789' }
      }));

      const correlations = correlator.correlate('nav-1');
      const match = correlations.find(c => c.eventIds.includes('a') && c.eventIds.includes('b'));
      expect(match).toBeDefined();
      expect(match!.payloadMatch).toBe('NONE');
      expect(match!.score.payloadSubstring).toBe(0.0);
    });

    it('detects EXACT_SUBSTRING when one payload contains the other', () => {
      const result = matchPayloads('ABC123', 'prefix_ABC123_suffix');
      expect(result).toBe('EXACT_SUBSTRING');
    });

    it('returns UNAVAILABLE when a payload is missing', () => {
      expect(matchPayloads('ABC', undefined)).toBe('UNAVAILABLE');
      expect(matchPayloads(undefined, 'ABC')).toBe('UNAVAILABLE');
      expect(matchPayloads('', 'ABC')).toBe('UNAVAILABLE');
    });
  });

  // ─── 4. Navigation Isolation ────────────────────────────────────────────

  describe('navigation isolation', () => {
    it('correlating nav-B cannot see nav-A events', () => {
      // Navigation A events
      correlator.record(makeEvent({ id: 'a1', eventType: 'COOKIE_SET', timestamp: 100, navigationId: 'nav-A' }));
      correlator.record(makeEvent({ id: 'a2', eventType: 'NETWORK_REQUEST', timestamp: 150, navigationId: 'nav-A' }));

      // Navigation B events
      correlator.record(makeEvent({ id: 'b1', eventType: 'COOKIE_SET', timestamp: 200, navigationId: 'nav-B' }));
      correlator.record(makeEvent({ id: 'b2', eventType: 'NETWORK_REQUEST', timestamp: 250, navigationId: 'nav-B' }));

      const corrA = correlator.correlate('nav-A');
      const corrB = correlator.correlate('nav-B');

      // A correlations only contain A events
      for (const c of corrA) {
        for (const eid of c.eventIds) {
          expect(eid).toMatch(/^a/);
        }
      }

      // B correlations only contain B events
      for (const c of corrB) {
        for (const eid of c.eventIds) {
          expect(eid).toMatch(/^b/);
        }
      }
    });

    it('disposeNavigation removes the buffer entirely', () => {
      correlator.record(makeEvent({ id: 'x', eventType: 'COOKIE_SET', timestamp: 100, navigationId: 'nav-X' }));
      expect(correlator.getBufferSize('nav-X')).toBe(1);

      correlator.disposeNavigation('nav-X');

      expect(correlator.getBufferSize('nav-X')).toBe(0);
      expect(correlator.getSequence('nav-X')).toHaveLength(0);
    });
  });

  // ─── 5. Repeated Pattern ───────────────────────────────────────────────

  describe('repetition detection', () => {
    it('produces REPEATS for 3+ identical pairwise patterns', () => {
      // Three COOKIE_SET → NETWORK_REQUEST pairs
      for (let i = 0; i < 3; i++) {
        const base = i * 200;
        correlator.record(makeEvent({ id: `c${i}`, eventType: 'COOKIE_SET', timestamp: 100 + base }));
        correlator.record(makeEvent({ id: `n${i}`, eventType: 'NETWORK_REQUEST', timestamp: 150 + base }));
      }

      const correlations = correlator.correlate('nav-1');
      const repeats = correlations.filter(c => c.pattern.startsWith('REPEATS:'));
      expect(repeats.length).toBeGreaterThanOrEqual(1);
      expect(repeats[0].pattern).toContain('COOKIE_SET_TO_NETWORK_REQUEST');
    });
  });

  // ─── 6. Same-Timestamp Determinism ──────────────────────────────────────

  describe('deterministic ordering on same timestamp', () => {
    it('uses sequence field as tie-breaker', () => {
      correlator.record(makeEvent({ id: 'first', eventType: 'COOKIE_SET', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'second', eventType: 'NETWORK_REQUEST', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'third', eventType: 'SCRIPT_EXECUTION', timestamp: 101 }));

      const seq = correlator.getSequence('nav-1');
      expect(seq).toHaveLength(3);

      // first and second share timestamp=100, but first was recorded first → lower sequence
      expect(seq[0].id).toBe('first');
      expect(seq[1].id).toBe('second');
      expect(seq[2].id).toBe('third');
    });
  });

  // ─── 7. Buffer Bounds ──────────────────────────────────────────────────

  describe('buffer capacity enforcement', () => {
    it('evicts oldest events when exceeding maxEvents', () => {
      const smallCorrelator = new TemporalCorrelator({ maxEvents: 5, maxAgeMs: 3600000 });

      for (let i = 0; i < 8; i++) {
        smallCorrelator.record(makeEvent({
          id: `e${i}`,
          eventType: 'COOKIE_SET',
          timestamp: 100 + i * 10,
        }));
      }

      const seq = smallCorrelator.getSequence('nav-1');
      expect(seq).toHaveLength(5);
      // Oldest 3 should have been evicted
      expect(seq[0].id).toBe('e3');
    });
  });

  // ─── 8. Declarative Pattern Matching ────────────────────────────────────

  describe('declarative pattern matching', () => {
    it('detects TRACKING_INITIALIZATION pattern', () => {
      correlator.record(makeEvent({ id: 'se', eventType: 'SCRIPT_EXECUTION', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'cs', eventType: 'COOKIE_SET', timestamp: 200 }));
      correlator.record(makeEvent({ id: 'nr', eventType: 'NETWORK_REQUEST', timestamp: 300 }));

      const correlations = correlator.correlate('nav-1');
      const tracking = correlations.find(c => c.pattern === 'TRACKING_INITIALIZATION');
      expect(tracking).toBeDefined();
      expect(tracking!.supportingNodeIds).toHaveLength(3);
    });

    it('does not match pattern when gap exceeds maxGapMs', () => {
      correlator.record(makeEvent({ id: 'se', eventType: 'SCRIPT_EXECUTION', timestamp: 100 }));
      correlator.record(makeEvent({ id: 'cs', eventType: 'COOKIE_SET', timestamp: 200 }));
      // Gap of 2000ms from COOKIE_SET to NETWORK_REQUEST — exceeds TRACKING_INITIALIZATION maxGapMs of 1000
      correlator.record(makeEvent({ id: 'nr', eventType: 'NETWORK_REQUEST', timestamp: 2200 }));

      const correlations = correlator.correlate('nav-1');
      const tracking = correlations.find(c => c.pattern === 'TRACKING_INITIALIZATION');
      expect(tracking).toBeUndefined();
    });
  });
});
