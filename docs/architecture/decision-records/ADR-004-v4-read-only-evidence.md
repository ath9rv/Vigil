# ADR-004: V4 Read-Only Evidence Snapshot

**Status:** Accepted
**Introduced:** V2.1 RC1
**Governs:** Layer 2 Reasoning Intake

### Context
If V4 reasoning components receive a reference to the active mutable `EvidenceGraph`, reasoning routines could inadvertently alter evidentiary nodes, inject synthetic edges, or manipulate graph lifecycle.

### Decision
Expose evidence to V4 strictly through `ReadOnlyEvidenceGraph` via `trustEngine.getReadOnlyEvidenceSnapshot(navigationId)`. The snapshot provides read-only getters and freezes node references.

### Consequences
- V4 is structurally barred from mutating evidence.
- Guarantees the architectural invariant: **V4 is an inference consumer, never an evidence authority.**
