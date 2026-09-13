# ADR-002: Mandatory Immutable Observation Provenance

**Status:** Accepted
**Introduced:** V2.1 RC1
**Enforces:** INV-V4-001

### Context
Observations previously carried optional provenance fields, allowing callers to omit origin, collector version, or timestamp metadata. This opened risks of ungrounded inference in V4 and message tampering.

### Decision
Make `provenance: Readonly<ObservationProvenance>` non-optional on `RawObservation`. All observations constructed by `ObservationFactory` are sealed using `Object.freeze` along with shallow-copied payloads and provenance metadata.

### Consequences
- Every evidence node can be traced to its exact source, detector, timestamp, and frame.
- Un-provenanced observations cannot be constructed without compile-time and runtime rejection.
