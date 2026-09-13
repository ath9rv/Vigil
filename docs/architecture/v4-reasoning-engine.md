# Vigil V4 Cognitive Reasoning Engine Specification

This document details the Layer 2 architecture for Vigil V4: Causal Inference, Temporal Reasoning, and Forensic Proof Chains.

---

## 1. Governing Principle

> **V4 is an inference consumer, never an evidence authority.**

V4 does not manufacture facts or create observations. It consumes immutable evidence snapshots from the V2.1 Trust Substrate, identifies temporal transitions, evaluates competing hypotheses, and produces verifiable forensic reports.

---


## The 11 V4 Cognitive Reasoning Invariants

| ID | Name | Rule |
| :--- | :--- | :--- |
| **INV-V4-001** | **Grounding** | Every hypothesis must reference ≥ 1 immutable `RawObservation`. |
| **INV-V4-002** | **Fencing** | Causal edges cannot cross navigation boundaries unless explicitly classified as cross-session correlation. |
| **INV-V4-003** | **Budget-Bound** | Reasoning is governor-scheduled and budget-bound (max 150ms per scan cycle). |
| **INV-V4-004** | **Transparency** | Forensic conclusions must expose supporting evidence, contradictions, uncertainty, and rejected alternatives. |
| **INV-V4-005** | **Epistemic Humility** | V4 may increase explanatory detail, but may never increase epistemic authority beyond the evidence supplied by the TrustEngine. |
| **INV-V4-006** | **Timeline Isolation** | Temporal indexes cannot contain observations from another navigation. |
| **INV-V4-007** | **Dual Grounding** | CausalCandidate cannot exist without ≥ 2 referenced observations unless explicitly classified as a single-observation seed. |
| **INV-V4-008** | **Non-Dogmatic Precedence** | Temporal precedence alone cannot produce a CONFIRMED causal conclusion. |
| **INV-V4-009** | **Read-Only Substrate** | Hypothesis evaluation cannot mutate the underlying evidence graph. |
| **INV-V4-010** | **Interruptible Traversal** | Graph traversal is governor-aware and interruptible. |
| **INV-V4-011** | **Auditable Rejection** | A rejected hypothesis must remain auditable; rejection cannot delete the evidence that caused its rejection. |
## 3. Temporal Causal Architecture

```text
ReadOnlyEvidenceGraph (Immutable Snapshot)
      │
      ▼
TemporalEventIndex (Monotonic timeline per navigation)
      │
      ▼
CausalCandidate Generator (State transitions T0 → T1)
      │
   ┌──┴──┐
   ▼     ▼
SUPPORTS CONTRADICTS
   │     │
   └──┬──┘
      ▼
HypothesisGraph (Evaluates H_Innocuous vs H_Deceptive)
      │
      ▼
ForensicReport (Auditable proof chain with rejected alternatives)
```
