import type { RawObservation } from '../shared/types';
import type { TemporalEvent, EvidenceNodeType } from './v4/types';

/**
 * TemporalEventIndex
 *
 * Organizes immutable RawObservations into a strictly navigation-fenced,
 * monotonically sequenced, deterministically ordered timeline.
 *
 * Enforces:
 * - INV-V4-002: Navigation boundaries are strictly isolated.
 * - INV-V4-006: Temporal indexes cannot contain observations from another navigation.
 * - Deterministic total ordering: primary sort by timestamp, secondary sort by sequence counter.
 */
export class TemporalEventIndex {
  private eventsByNav = new Map<string, TemporalEvent[]>();
  private seqByNav = new Map<string, number>();
  private eventLookup = new Map<string, TemporalEvent>();

  /**
   * Ingests an immutable RawObservation into the navigation's temporal timeline.
   */
  public addObservation(obs: RawObservation): TemporalEvent {
    const navId = obs.navigationId;
    if (!navId) {
      throw new Error('[TemporalEventIndex] Observation missing navigationId');
    }

    const currentSeq = (this.seqByNav.get(navId) || 0) + 1;
    this.seqByNav.set(navId, currentSeq);

    const event: TemporalEvent = Object.freeze({
      eventId: `event-${obs.id}`,
      observationId: obs.id,
      navigationId: navId,
      timestamp: obs.timestamp,
      sequence: currentSeq,
      type: obs.sourceType as EvidenceNodeType,
      source: obs.source,
      payload: obs.payload,
    });

    this.insertEvent(navId, event);
    this.eventLookup.set(event.eventId, event);
    return event;
  }

  /**
   * Ingests an explicit user interaction event or synthetic probe into the timeline.
   */
  public addEvent(
    navigationId: string,
    type: EvidenceNodeType,
    source: string,
    payload: Readonly<Record<string, unknown>>,
    customTimestamp?: number
  ): TemporalEvent {
    if (!navigationId) {
      throw new Error('[TemporalEventIndex] Missing navigationId for event');
    }

    const currentSeq = (this.seqByNav.get(navigationId) || 0) + 1;
    this.seqByNav.set(navigationId, currentSeq);

    const eventId = `event-${navigationId}-${currentSeq}`;
    const event: TemporalEvent = Object.freeze({
      eventId,
      observationId: `obs-${navigationId}-${currentSeq}`,
      navigationId,
      timestamp: customTimestamp ?? Date.now(),
      sequence: currentSeq,
      type,
      source,
      payload: Object.freeze({ ...payload }),
    });

    this.insertEvent(navigationId, event);
    this.eventLookup.set(event.eventId, event);
    return event;
  }

  /**
   * Retrieves all events for a given navigation in strict deterministic total order.
   */
  public getEvents(navigationId: string): readonly TemporalEvent[] {
    const events = this.eventsByNav.get(navigationId);
    if (!events) return [];
    return Object.freeze([...events]);
  }

  /**
   * Direct lookup by eventId.
   */
  public getEventById(eventId: string): TemporalEvent | undefined {
    return this.eventLookup.get(eventId);
  }

  /**
   * Retrieves events within a time range [fromTimestamp, toTimestamp] inclusive.
   */
  public getEventsInRange(
    navigationId: string,
    fromTimestamp: number,
    toTimestamp: number
  ): readonly TemporalEvent[] {
    const events = this.getEvents(navigationId);
    return events.filter(e => e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp);
  }

  /**
   * Returns total event count, optionally filtered by navigationId.
   */
  public getEventCount(navigationId?: string): number {
    if (navigationId) {
      return this.eventsByNav.get(navigationId)?.length || 0;
    }
    let total = 0;
    for (const list of this.eventsByNav.values()) {
      total += list.length;
    }
    return total;
  }

  /**
   * Prunes all timeline events for a given navigation (memory bounding).
   */
  public pruneNavigation(navigationId: string): number {
    const list = this.eventsByNav.get(navigationId);
    if (!list) return 0;
    const count = list.length;
    for (const e of list) {
      this.eventLookup.delete(e.eventId);
    }
    this.eventsByNav.delete(navigationId);
    this.seqByNav.delete(navigationId);
    return count;
  }

  /**
   * Clears the entire index.
   */
  public clear(): void {
    this.eventsByNav.clear();
    this.seqByNav.clear();
    this.eventLookup.clear();
  }

  /**
   * Inserts an event maintaining deterministic sort:
   * 1. timestamp ascending
   * 2. sequence ascending
   */
  private insertEvent(navId: string, event: TemporalEvent): void {
    let list = this.eventsByNav.get(navId);
    if (!list) {
      list = [];
      this.eventsByNav.set(navId, list);
    }

    // Binary search insertion to maintain sorted order in O(log N)
    let low = 0;
    let high = list.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const midEvent = list[mid];

      if (
        midEvent.timestamp < event.timestamp ||
        (midEvent.timestamp === event.timestamp && midEvent.sequence < event.sequence)
      ) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    list.splice(low, 0, event);
  }
}
