# ADR-001: TrustEngine as Canonical Ingestion Boundary

**Status**: LOCKED
**Date**: 2026-09-04
**Phase**: 5

## Context
Vigil previously allowed individual scanners (like the M1 Deceptive Commerce scanner) to generate `Finding` objects directly and send them to the `message-router`. This created parallel architectures and bypassed the central reasoning capabilities of the Trust Engine.

## Decision
All detector output must enter the `TrustEngine` as `RawObservation` objects. Scanners are evidence producers, not verdict producers. The `message-router` must route all incoming messages into `TrustEngine.observe()` and only output findings after calling `TrustEngine.finalize()`.

## Consequences
- **Positive**: Guarantees evidence provenance, prevents confidence inflation, enables cross-scanner correlation, and centralizes budget management.
- **Negative**: Adds slight processing overhead to simple findings.

## Do Not
- Create direct `Finding` objects from scanners or background listeners.
- Bypass `TrustEngine.observe()`.

## Revisit When
A replacement ingestion architecture is formally approved.
