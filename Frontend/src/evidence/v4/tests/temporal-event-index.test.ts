import { describe, it, expect } from 'vitest';
import { TemporalEventIndex } from '../../temporal-event-index';
import { ObservationFactory } from '../../observation';
import type { ScanContext } from '../../../shared/scan-context';

describe('V4: TemporalEventIndex', () => {
  const contextA: ScanContext = {
    tabId: 1,
    navigationId: 'nav-A',
    origin: 'https://example.com',
    hostname: 'example.com',
    startedAt: 1000,
  };

  const contextB: ScanContext = {
    tabId: 1,
    navigationId: 'nav-B',
    origin: 'https://other.com',
    hostname: 'other.com',
    startedAt: 2000,
  };

  it('enforces deterministic total ordering: timestamp primary, sequence secondary', () => {
    const index = new TemporalEventIndex();
    const fixedTime = 5000;

    // Ingest three events with identical timestamp
    const e1 = index.addEvent('nav-A', 'DOM', 'test', { step: 1 }, fixedTime);
    const e2 = index.addEvent('nav-A', 'DOM', 'test', { step: 2 }, fixedTime);
    const e3 = index.addEvent('nav-A', 'DOM', 'test', { step: 3 }, fixedTime);

    const timeline = index.getEvents('nav-A');
    expect(timeline.length).toBe(3);
    expect(timeline[0].eventId).toBe(e1.eventId);
    expect(timeline[1].eventId).toBe(e2.eventId);
    expect(timeline[2].eventId).toBe(e3.eventId);
    expect(timeline[0].sequence).toBe(1);
    expect(timeline[1].sequence).toBe(2);
    expect(timeline[2].sequence).toBe(3);
  });

  it('INV-V4-006: strictly fences events by navigationId', () => {
    const index = new TemporalEventIndex();

    index.addObservation(ObservationFactory.fromDOMMutation(contextA, { val: 'A1' }));
    index.addObservation(ObservationFactory.fromDOMMutation(contextA, { val: 'A2' }));
    index.addObservation(ObservationFactory.fromDOMMutation(contextB, { val: 'B1' }));

    const eventsA = index.getEvents('nav-A');
    const eventsB = index.getEvents('nav-B');

    expect(eventsA.length).toBe(2);
    expect(eventsB.length).toBe(1);
    expect(eventsA.every(e => e.navigationId === 'nav-A')).toBe(true);
    expect(eventsB.every(e => e.navigationId === 'nav-B')).toBe(true);
  });

  it('supports time-range queries and bounded navigation pruning', () => {
    const index = new TemporalEventIndex();
    for (let i = 0; i < 10; i++) {
      index.addEvent('nav-A', 'DOM', 'test', { idx: i }, 1000 + i * 100);
    }

    const range = index.getEventsInRange('nav-A', 1200, 1500);
    expect(range.length).toBe(4); // 1200, 1300, 1400, 1500

    const pruned = index.pruneNavigation('nav-A');
    expect(pruned).toBe(10);
    expect(index.getEvents('nav-A').length).toBe(0);
  });
});
