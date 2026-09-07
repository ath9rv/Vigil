/**
 * Phase 2B: Temporal Correlation Engine
 * 
 * Provides temporal reasoning over navigation-scoped evidence.
 * This module does NOT own navigation validation — the router/state layer
 * must establish navigation validity before events reach this module.
 * 
 * Design invariant:
 *   A stale event can never enter the temporal buffer.
 *   The correlator is a deterministic evidence processor.
 */

// ─── Event Types ────────────────────────────────────────────────────────────

export type TemporalEventType =
  | 'NAVIGATION'
  | 'DOM_MUTATION'
  | 'NETWORK_REQUEST'
  | 'STORAGE_WRITE'
  | 'COOKIE_SET'
  | 'SCRIPT_EXECUTION'
  | 'UI_EVENT'
  | 'POLICY_OBSERVATION';

export interface TemporalEvent {
  id: string;
  navigationId: string;
  tabId: number;
  timestamp: number;
  /** Reference to the EvidenceNode this event was derived from */
  nodeId: string;
  eventType: TemporalEventType;
  /**
   * Monotonically increasing sequence number within a navigation.
   * Used as a deterministic tie-breaker when timestamps are equal.
   */
  sequence: number;
  metadata?: Record<string, unknown>;
}

// ─── Temporal Relations ─────────────────────────────────────────────────────

export type TemporalRelation =
  | 'PRECEDES'
  | 'FOLLOWS'
  | 'WITHIN_WINDOW'
  | 'CO_OCCURS'
  | 'REPEATS'
  | 'INTERRUPTS';

export interface TemporalEdge {
  from: string; // TemporalEvent ID
  to: string;   // TemporalEvent ID
  relation: TemporalRelation;
  deltaMs: number;
  confidence: number;
}

// ─── Payload Matching ───────────────────────────────────────────────────────

/**
 * Payload match classification.
 * Exact substring matching only — no heuristic decoding in Phase 2B.
 * 
 * EXACT:            Full value match (cookie value === request param value)
 * EXACT_SUBSTRING:  Cookie value appears as a substring in the request
 * NONE:             No textual overlap
 * UNAVAILABLE:      One or both payloads could not be inspected
 */
export type PayloadMatch =
  | 'EXACT'
  | 'EXACT_SUBSTRING'
  | 'NONE'
  | 'UNAVAILABLE';

// ─── Correlation Scores ─────────────────────────────────────────────────────

/**
 * Decomposable correlation score.
 * Every component is individually explainable.
 */
export interface CorrelationScore {
  /** How close in time were the events? 0.0–1.0 */
  temporal: number;
  /** Do the events share an entity (domain, selector, key)? 0.0–1.0 */
  entityMatch: number;
  /** Was the same identifier observed in both events? 0.0–1.0 */
  payloadSubstring: number;
  /** Was this sequence seen repeatedly? 0.0–1.0 */
  repetition: number;
  /** Weighted composite. NOT an average — the weights are relation-specific. */
  total: number;
}

export interface TemporalCorrelation {
  id: string;
  navigationId: string;
  eventIds: string[];
  startTime: number;
  endTime: number;
  durationMs: number;
  pattern: string;
  score: CorrelationScore;
  payloadMatch: PayloadMatch;
  supportingNodeIds: string[];
}

// ─── Declarative Temporal Patterns ──────────────────────────────────────────

export interface TemporalPattern {
  id: string;
  sequence: TemporalEventType[];
  maxGapMs: number;
  requiredRelations?: TemporalRelation[];
}

export const TRACKING_INITIALIZATION: TemporalPattern = {
  id: 'TRACKING_INITIALIZATION',
  sequence: ['SCRIPT_EXECUTION', 'COOKIE_SET', 'NETWORK_REQUEST'],
  maxGapMs: 1000,
};

export const IDENTIFIER_EXFILTRATION: TemporalPattern = {
  id: 'IDENTIFIER_EXFILTRATION',
  sequence: ['STORAGE_WRITE', 'COOKIE_SET', 'NETWORK_REQUEST'],
  maxGapMs: 1000,
};

export const DARK_PATTERN_UI_SEQUENCE: TemporalPattern = {
  id: 'DARK_PATTERN_UI_SEQUENCE',
  sequence: ['DOM_MUTATION', 'UI_EVENT', 'DOM_MUTATION'],
  maxGapMs: 2000,
};

export const BUILTIN_PATTERNS: TemporalPattern[] = [
  TRACKING_INITIALIZATION,
  IDENTIFIER_EXFILTRATION,
  DARK_PATTERN_UI_SEQUENCE,
];

// ─── Relation-Specific Temporal Windows ─────────────────────────────────────

/**
 * Maximum millisecond gap for a correlation to be considered meaningful
 * between two specific event types.
 * 
 * These are intentionally conservative — adaptive windows belong in Phase 4.
 */
export const TEMPORAL_WINDOWS: Record<string, number> = {
  STORAGE_WRITE_TO_NETWORK_REQUEST: 500,
  COOKIE_SET_TO_NETWORK_REQUEST: 1000,
  DOM_MUTATION_TO_NETWORK_REQUEST: 250,
  SCRIPT_EXECUTION_TO_NETWORK_REQUEST: 100,
  SCRIPT_EXECUTION_TO_COOKIE_SET: 500,
  COOKIE_SET_TO_COOKIE_SET: 200,
  DOM_MUTATION_TO_UI_EVENT: 2000,
  DEFAULT: 1000,
};

function getWindowKey(fromType: TemporalEventType, toType: TemporalEventType): string {
  return `${fromType}_TO_${toType}`;
}

function getTemporalWindow(fromType: TemporalEventType, toType: TemporalEventType): number {
  return TEMPORAL_WINDOWS[getWindowKey(fromType, toType)] ?? TEMPORAL_WINDOWS.DEFAULT;
}

// ─── Temporal Buffer ────────────────────────────────────────────────────────

export interface TemporalBufferConfig {
  maxEvents: number;
  maxAgeMs: number;
}

const DEFAULT_BUFFER_CONFIG: TemporalBufferConfig = {
  maxEvents: 500,
  maxAgeMs: 3600000, // 1 hour hard cap
};

/**
 * Navigation-scoped temporal event buffer.
 * 
 * The navigation lifetime is the primary boundary.
 * maxAgeMs is the secondary safety cap for long-lived tabs.
 */
class TemporalBuffer {
  private events: TemporalEvent[] = [];
  private sequenceCounter = 0;

  constructor(
    public readonly navigationId: string,
    private readonly config: TemporalBufferConfig = DEFAULT_BUFFER_CONFIG
  ) {}

  /**
   * Insert an event into the buffer.
   * Returns the assigned sequence number.
   */
  insert(event: TemporalEvent): number {
    // Enforce capacity — evict oldest if at limit
    if (this.events.length >= this.config.maxEvents) {
      this.events.shift();
    }

    const seq = this.sequenceCounter++;
    this.events.push({ ...event, sequence: seq });

    // Purge events older than maxAgeMs relative to the newest event
    this.purgeExpired();

    return seq;
  }

  /**
   * Get all events, sorted by timestamp then sequence (deterministic).
   */
  getOrderedEvents(): TemporalEvent[] {
    return [...this.events].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a.sequence - b.sequence;
    });
  }

  get size(): number {
    return this.events.length;
  }

  private purgeExpired(): void {
    if (this.events.length === 0) return;
    const newest = this.events[this.events.length - 1].timestamp;
    this.events = this.events.filter(e => (newest - e.timestamp) < this.config.maxAgeMs);
  }
}

// ─── Payload Matching ───────────────────────────────────────────────────────

/**
 * Performs asymmetric exact-substring payload matching.
 * 
 * Rules:
 * - If either payload is missing/empty → UNAVAILABLE
 * - If payloadA === payloadB → EXACT
 * - If payloadB contains payloadA (or vice versa) → EXACT_SUBSTRING
 * - Otherwise → NONE
 */
export function matchPayloads(payloadA?: string, payloadB?: string): PayloadMatch {
  if (!payloadA || !payloadB) return 'UNAVAILABLE';
  if (payloadA === payloadB) return 'EXACT';
  if (payloadB.includes(payloadA) || payloadA.includes(payloadB)) return 'EXACT_SUBSTRING';
  return 'NONE';
}

// ─── Temporal Correlator ────────────────────────────────────────────────────

let correlationIdCounter = 0;

/**
 * The Temporal Correlator.
 * 
 * Contract:
 * - Does NOT own navigation validation. The caller must ensure validity
 *   before calling record().
 * - Is a deterministic evidence processor.
 * - Uses relation-specific temporal windows.
 * - Uses exact-substring payload matching.
 */
export class TemporalCorrelator {
  private buffers = new Map<string, TemporalBuffer>();

  constructor(private readonly config: TemporalBufferConfig = DEFAULT_BUFFER_CONFIG) {}

  /**
   * Record a temporal event into the appropriate navigation buffer.
   * 
   * Precondition: the caller has already validated navigation validity.
   * This method does NOT check navigationState.
   */
  record(event: TemporalEvent): void {
    let buffer = this.buffers.get(event.navigationId);
    if (!buffer) {
      buffer = new TemporalBuffer(event.navigationId, this.config);
      this.buffers.set(event.navigationId, buffer);
    }
    buffer.insert(event);
  }

  /**
   * Correlate events within a navigation using relation-specific windows.
   * 
   * @param navigationId - The navigation to correlate within
   * @param windowMs - Optional override for the temporal window (uses relation-specific defaults if omitted)
   */
  correlate(navigationId: string, windowMs?: number): TemporalCorrelation[] {
    const buffer = this.buffers.get(navigationId);
    if (!buffer) return [];

    const events = buffer.getOrderedEvents();
    if (events.length < 2) return [];

    const correlations: TemporalCorrelation[] = [];
    const pairsSeen = new Set<string>();

    // Pairwise correlation with relation-specific windows
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        const delta = b.timestamp - a.timestamp;
        const effectiveWindow = windowMs ?? getTemporalWindow(a.eventType, b.eventType);

        if (delta > effectiveWindow) continue;

        const pairKey = `${a.id}:${b.id}`;
        if (pairsSeen.has(pairKey)) continue;
        pairsSeen.add(pairKey);

        // Determine relation
        const relation: TemporalRelation = delta === 0 ? 'CO_OCCURS' : 'PRECEDES';

        // Compute payload match
        const payloadA = a.metadata?.payload as string | undefined;
        const payloadB = b.metadata?.payload as string | undefined;
        const payloadMatchResult = matchPayloads(payloadA, payloadB);

        // Compute decomposable score
        const score = computeCorrelationScore(delta, effectiveWindow, a, b, payloadMatchResult);

        const edge: TemporalEdge = {
          from: a.id,
          to: b.id,
          relation,
          deltaMs: delta,
          confidence: score.total,
        };

        correlations.push({
          id: `tc-${++correlationIdCounter}`,
          navigationId,
          eventIds: [a.id, b.id],
          startTime: a.timestamp,
          endTime: b.timestamp,
          durationMs: delta,
          pattern: `${a.eventType}_TO_${b.eventType}`,
          score,
          payloadMatch: payloadMatchResult,
          supportingNodeIds: [a.nodeId, b.nodeId],
        });
      }
    }

    // Detect repeated patterns
    const repetitions = this.detectRepetitions(events, correlations, navigationId);
    correlations.push(...repetitions);

    // Match declarative patterns
    const patternMatches = this.matchPatterns(events, navigationId);
    correlations.push(...patternMatches);

    return correlations;
  }

  /**
   * Get the ordered event sequence for a navigation.
   */
  getSequence(navigationId: string): TemporalEvent[] {
    const buffer = this.buffers.get(navigationId);
    if (!buffer) return [];
    return buffer.getOrderedEvents();
  }

  /**
   * Explicitly dispose a navigation's temporal buffer.
   * Called on navigation end, tab closure, or extension restart.
   */
  disposeNavigation(navigationId: string): void {
    this.buffers.delete(navigationId);
  }

  /**
   * Get the number of events in a navigation's buffer.
   */
  getBufferSize(navigationId: string): number {
    return this.buffers.get(navigationId)?.size ?? 0;
  }

  // ─── Private: Repetition Detection ──────────────────────────────────────

  private detectRepetitions(
    events: TemporalEvent[],
    existingCorrelations: TemporalCorrelation[],
    navigationId: string
  ): TemporalCorrelation[] {
    const repetitions: TemporalCorrelation[] = [];

    // Group correlations by pattern
    const patternGroups = new Map<string, TemporalCorrelation[]>();
    for (const c of existingCorrelations) {
      const group = patternGroups.get(c.pattern) ?? [];
      group.push(c);
      patternGroups.set(c.pattern, group);
    }

    // If a pattern appears 3+ times, emit a REPEATS correlation
    for (const [pattern, group] of patternGroups) {
      if (group.length >= 3) {
        const allEventIds = [...new Set(group.flatMap(c => c.eventIds))];
        const allNodeIds = [...new Set(group.flatMap(c => c.supportingNodeIds))];

        repetitions.push({
          id: `tc-${++correlationIdCounter}`,
          navigationId,
          eventIds: allEventIds,
          startTime: Math.min(...group.map(c => c.startTime)),
          endTime: Math.max(...group.map(c => c.endTime)),
          durationMs: Math.max(...group.map(c => c.endTime)) - Math.min(...group.map(c => c.startTime)),
          pattern: `REPEATS:${pattern}`,
          score: {
            temporal: avg(group.map(c => c.score.temporal)),
            entityMatch: avg(group.map(c => c.score.entityMatch)),
            payloadSubstring: avg(group.map(c => c.score.payloadSubstring)),
            repetition: Math.min(1.0, group.length / 5), // scales up to 5 repetitions
            total: 0, // computed below
          },
          payloadMatch: group[0].payloadMatch,
          supportingNodeIds: allNodeIds,
        });

        // Compute total for the repetition correlation
        const rep = repetitions[repetitions.length - 1];
        rep.score.total = weightedTotal(rep.score);
      }
    }

    return repetitions;
  }

  // ─── Private: Declarative Pattern Matching ──────────────────────────────

  private matchPatterns(events: TemporalEvent[], navigationId: string): TemporalCorrelation[] {
    const matches: TemporalCorrelation[] = [];

    for (const pattern of BUILTIN_PATTERNS) {
      const found = this.findPatternOccurrences(events, pattern);
      for (const occurrence of found) {
        matches.push({
          id: `tc-${++correlationIdCounter}`,
          navigationId,
          eventIds: occurrence.map(e => e.id),
          startTime: occurrence[0].timestamp,
          endTime: occurrence[occurrence.length - 1].timestamp,
          durationMs: occurrence[occurrence.length - 1].timestamp - occurrence[0].timestamp,
          pattern: pattern.id,
          score: {
            temporal: 1.0, // Pattern matched within its maxGapMs
            entityMatch: 0.0,
            payloadSubstring: 0.0,
            repetition: 0.0,
            total: 0.7, // Pattern match is moderate-confidence structural evidence
          },
          payloadMatch: 'UNAVAILABLE',
          supportingNodeIds: occurrence.map(e => e.nodeId),
        });
      }
    }

    return matches;
  }

  private findPatternOccurrences(events: TemporalEvent[], pattern: TemporalPattern): TemporalEvent[][] {
    const results: TemporalEvent[][] = [];
    const usedEventIds = new Set<string>();

    for (let i = 0; i < events.length; i++) {
      if (events[i].eventType !== pattern.sequence[0]) continue;
      if (usedEventIds.has(events[i].id)) continue;

      const candidate: TemporalEvent[] = [events[i]];
      let seqIdx = 1;
      let lastTimestamp = events[i].timestamp;

      for (let j = i + 1; j < events.length && seqIdx < pattern.sequence.length; j++) {
        if (usedEventIds.has(events[j].id)) continue;
        if (events[j].eventType !== pattern.sequence[seqIdx]) continue;

        const gap = events[j].timestamp - lastTimestamp;
        if (gap > pattern.maxGapMs) break;

        candidate.push(events[j]);
        lastTimestamp = events[j].timestamp;
        seqIdx++;
      }

      if (candidate.length === pattern.sequence.length) {
        for (const e of candidate) usedEventIds.add(e.id);
        results.push(candidate);
      }
    }

    return results;
  }
}

// ─── Score Computation ──────────────────────────────────────────────────────

function computeCorrelationScore(
  deltaMs: number,
  windowMs: number,
  a: TemporalEvent,
  b: TemporalEvent,
  payloadMatch: PayloadMatch
): CorrelationScore {
  // Temporal: inverse proportional to the gap relative to the window
  const temporal = Math.max(0, 1 - (deltaMs / windowMs));

  // Entity match: check if shared metadata keys reference the same entity
  const entityMatch = computeEntityMatch(a, b);

  // Payload substring score
  const payloadSubstring = payloadMatch === 'EXACT' ? 1.0
    : payloadMatch === 'EXACT_SUBSTRING' ? 0.7
    : 0.0;

  // Repetition is 0 for pairwise — only set by the repetition detector
  const repetition = 0;

  const total = weightedTotal({ temporal, entityMatch, payloadSubstring, repetition, total: 0 });

  return { temporal, entityMatch, payloadSubstring, repetition, total };
}

function computeEntityMatch(a: TemporalEvent, b: TemporalEvent): number {
  if (!a.metadata || !b.metadata) return 0;

  let matches = 0;
  let checked = 0;

  // Check domain/host entity overlap
  const entityKeys = ['domain', 'host', 'cookieName', 'storageKey'];
  for (const key of entityKeys) {
    if (a.metadata[key] != null && b.metadata[key] != null) {
      checked++;
      if (a.metadata[key] === b.metadata[key]) matches++;
    }
  }

  return checked > 0 ? matches / checked : 0;
}

function weightedTotal(score: CorrelationScore): number {
  // Weights: temporal proximity is important but not dominant.
  // Payload match is the strongest single signal.
  const w = {
    temporal: 0.25,
    entityMatch: 0.20,
    payloadSubstring: 0.35,
    repetition: 0.20,
  };

  return Math.min(1.0,
    score.temporal * w.temporal +
    score.entityMatch * w.entityMatch +
    score.payloadSubstring * w.payloadSubstring +
    score.repetition * w.repetition
  );
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
