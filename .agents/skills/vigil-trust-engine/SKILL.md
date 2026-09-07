---
name: vigil-trust-engine
description: Knowledge of the canonical TrustEngine pipeline (graph, temporal, consistency, verdict, explanation). Activate this when working on evidence processing, verdicts, or correlation logic.
---

# Vigil Trust Engine Pipeline

The Trust Engine is the heart of Vigil. It is a one-way pipeline that consumes `RawObservation` objects and produces `ForensicReport` objects. 

## The Canonical Pipeline

```text
RawObservation (Ingestion boundary)
      ↓
EvidenceNode (Graph representation)
      ↓
EvidenceGraph (Relationship tracking)
      ↓
TemporalEvent (Time-based representation)
      ↓
TemporalCorrelation (Cross-event time relationships)
      ↓
EvidenceClaim (Deterministic concept derivation)
      ↓
ConsistencyScore (Contradiction evaluation)
      ↓
VerdictResolution (Eligibility and confidence calculation)
      ↓
ForensicReport (User-facing explanation)
```

## Core Capability Layers

- **Evidence Ingestion (Phase 2A)**: Organizes evidence structurally in an append-only DAG.
- **Temporal Reasoning (Phase 2B)**: Establishes chronological sequence and proximity.
- **Claim Reasoning (Phase 2C)**: Determines if evidence supports or contradicts extracted claims.
- **Verdict Resolution (Phase 3)**: A hard gate determining if a claim is ELIGIBLE to become a verdict. High confidence cannot override an INELIGIBLE state.
- **Explanation (Phase 4)**: Strips technical IDs and presents a clear, non-contradictory rationale to the user.
- **Integration (Phase 5)**: The `TrustEngine` facade wraps all of this and manages budgets/lifecycle.

## Invariants

- **NEVER BYPASS A LAYER**: You cannot jump from `RawObservation` to `VerdictResolution`. You must go through the graph and claim extraction.
- **NO MUTATION**: The Verdict Resolver and Consistency Engine are pure functions. They evaluate the graph; they do not mutate it.
