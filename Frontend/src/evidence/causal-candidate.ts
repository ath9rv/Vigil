import type { ReadOnlyEvidenceGraph } from './graph';
import type { TemporalEventIndex } from './temporal-event-index';
import type {
  CausalCandidate,
  CausalRelationshipType,
  CausalCandidateStatus,
  TemporalEvent,
} from './v4/types';

export interface CausalCandidateOptions {
  maxTemporalWindowMs?: number;
  maxSequenceDistance?: number;
}

const DEFAULT_MAX_WINDOW_MS = 10000; // 10 seconds
const DEFAULT_MAX_SEQ_DIST = 50;

/**
 * CausalCandidateGenerator
 *
 * Generates deterministic causal candidate relationships from temporal timelines.
 * Explicitly separates temporal correlation from causal assertions.
 *
 * Enforces:
 * - INV-V4-001: Every candidate grounds out in immutable observations.
 * - INV-V4-007: CausalCandidate requires >= 2 referenced observations.
 * - INV-V4-008: Temporal precedence alone cannot produce CONFIRMED status.
 */
export class CausalCandidateGenerator {
  /**
   * Identifies candidate causal pairs within the active navigation timeline.
   */
  public generateCandidates(
    navigationId: string,
    timeline: TemporalEventIndex,
    _graph: ReadOnlyEvidenceGraph,
    options: CausalCandidateOptions = {}
  ): readonly CausalCandidate[] {
    const events = timeline.getEvents(navigationId);
    if (events.length < 2) {
      return [];
    }

    const maxWindow = options.maxTemporalWindowMs ?? DEFAULT_MAX_WINDOW_MS;
    const maxSeq = options.maxSequenceDistance ?? 20;
    const candidates: CausalCandidate[] = [];

    // Scan adjacent and near-adjacent events deterministically
    for (let i = 0; i < events.length - 1; i++) {
      const cause = events[i];
      const limitJ = Math.min(events.length, i + maxSeq + 1);

      for (let j = i + 1; j < limitJ; j++) {
        const effect = events[j];
        const temporalDistance = effect.timestamp - cause.timestamp;
        const sequenceDistance = effect.sequence - cause.sequence;

        if (temporalDistance > maxWindow || sequenceDistance > maxSeq) {
          break; // Beyond correlation horizon
        }

        const relation = this.classifyRelationship(cause, effect);
        if (!relation) continue;

        // INV-V4-007: Ensure both cause and effect point to distinct valid observation IDs
        if (!cause.observationId || !effect.observationId) {
          continue;
        }

        // INV-V4-008: Status is never CONFIRMED at candidate stage
        const status: CausalCandidateStatus =
          relation.relationship === 'USER_TRIGGERED' || relation.relationship === 'STATE_TRANSITION'
            ? 'SUPPORTED'
            : 'CANDIDATE';

        const candidate: CausalCandidate = Object.freeze({
          candidateId: `causal-${cause.eventId}->${effect.eventId}`,
          navigationId,
          causeEventId: cause.eventId,
          effectEventId: effect.eventId,
          causeObservationId: cause.observationId,
          effectObservationId: effect.observationId,
          temporalDistanceMs: temporalDistance,
          sequenceDistance,
          relationship: relation.relationship,
          status,
          supportingObservations: Object.freeze([cause.observationId, effect.observationId]),
          contradictoryObservations: Object.freeze([]),
          metadata: Object.freeze(relation.metadata || {}),
        });

        candidates.push(candidate);
      }
    }

    return Object.freeze(candidates);
  }

  /**
   * Deterministic structural classification of relationship between two events.
   */
  private classifyRelationship(
    cause: TemporalEvent,
    effect: TemporalEvent
  ): { relationship: CausalRelationshipType; metadata?: Record<string, unknown> } | null {
    // 1. User Triggered: User interaction immediately precedes DOM change or network call
    if (cause.type === 'USER_EVENT' && (effect.type === 'DOM' || effect.type === 'NETWORK')) {
      return {
        relationship: 'USER_TRIGGERED',
        metadata: {
          triggerAction: cause.source,
          responseTarget: effect.source,
        },
      };
    }

    // 2. State Transition: Both events are DOM observations indicating state deltas (e.g. price changes)
    if (cause.type === 'DOM' && effect.type === 'DOM') {
      const causePrice = cause.payload?.price || cause.payload?.amount;
      const effectPrice = effect.payload?.price || effect.payload?.amount;

      if (causePrice !== undefined && effectPrice !== undefined && causePrice !== effectPrice) {
        return {
          relationship: 'STATE_TRANSITION',
          metadata: {
            initialValue: causePrice,
            finalValue: effectPrice,
            delta: typeof effectPrice === 'number' && typeof causePrice === 'number'
              ? effectPrice - causePrice
              : 'non_numeric',
          },
        };
      }

      // DOM structural replacement or fee appearance
      if (effect.payload?.addedText || effect.payload?.feeAppeared) {
        return {
          relationship: 'STATE_TRANSITION',
          metadata: {
            transitionType: 'FEE_APPEARANCE',
          },
        };
      }
    }

    // 3. DOM Response: Network response or storage change followed by DOM update
    if ((cause.type === 'NETWORK' || cause.type === 'STORAGE') && effect.type === 'DOM') {
      return {
        relationship: 'DOM_RESPONSE',
        metadata: {
          sourceType: cause.type,
        },
      };
    }

    // 4. Network Response: User event or DOM mutation followed by network request
    if (cause.type === 'USER_EVENT' && effect.type === 'NETWORK') {
      return {
        relationship: 'NETWORK_RESPONSE',
        metadata: {
          initiator: cause.source,
        },
      };
    }

    // 5. Default temporal precedence if within short proximity (< 1000ms)
    if (effect.timestamp - cause.timestamp < 1000) {
      return {
        relationship: 'TEMPORALLY_PRECEDES',
      };
    }

    return null;
  }
}
