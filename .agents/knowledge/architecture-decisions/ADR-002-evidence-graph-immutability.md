# ADR-002: EvidenceGraph Immutability

**Status**: LOCKED
**Date**: 2026-09-04
**Phase**: 2A

## Context
When gathering evidence across asynchronous browser events, it is tempting to update or mutate existing evidence nodes as more context arrives. However, this introduces race conditions, breaks provenance trails, and makes temporal reasoning non-deterministic.

## Decision
The `EvidenceGraph` is an append-only, directed acyclic graph (DAG). Once an `EvidenceNode` or `EvidenceEdge` is added, it is immutable. All updates must be represented as new nodes linked to previous nodes.

## Consequences
- **Positive**: Guaranteed deterministic reasoning, clean forensic trails, and zero state-mutation race conditions in the graph layer.
- **Negative**: Increases memory usage, requiring aggressive budget limits and pruning on navigation end.

## Do Not
- Add setters or update methods to `EvidenceNode` or `EvidenceEdge`.
- Attempt to "merge" two nodes into one.

## Revisit When
Memory profiling proves the append-only approach is unsustainable within MV3 service worker budgets, requiring a compaction strategy.
