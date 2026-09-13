# Vigil Canonical Architecture Specification
## The Trust & Reasoning Contract — V2.1 Hardened Substrate → V4 Cognitive Reasoning

> **Vigil first learned how to know what it observed.**
> **V4 is about learning how to reason about why it happened.**

## 1. Core contract

> **V4 is an inference consumer, never an evidence authority.**

V4 reasoning operates strictly on top of the V2.1 trust substrate. It may organize evidence, compare hypotheses, evaluate bounded counterfactuals, and request advisory model assistance, but it may not invent evidence or bypass the authoritative decision path.

## 2. Layered hierarchy

```text
LAYER 3 — PRESENTATION & ACTION
  ForensicReport • Explain Mode • structured investigation export
  User explanations • intervention execution

LAYER 2 — V4 COGNITIVE REASONING
  TemporalEventIndex
  CausalCandidateGenerator
  HypothesisGraph
  CounterfactualEngine
  AmbiguityGate
  NLI advisory reasoning
  HypothesisReconciler

LAYER 1 — V2.1 TRUST SUBSTRATE
  RawObservation
  Provenance & navigation fencing
  EvidenceGraph / claims
  contradiction rules
  VerdictResolver

LAYER 0 — RUNTIME SAFETY
  MV3 service-worker lifecycle
  PerformanceGovernor
  storage/resource ceilings
  isolated UI / intervention safeguards
```

## 3. Epistemic ladder

```text
1. OBSERVE
2. VERIFY
3. CORRELATE
4. TEST ALTERNATIVES
5. CHECK COUNTERFACTUALS
6. MEASURE AMBIGUITY
7. ASK MODEL (only when admitted)
8. RECONCILE
9. AUTHORITATIVE DECIDE
10. EXPLAIN
```

## 4. Hard boundaries

### Evidence authority
All canonical verdicts originate from `VerdictResolver`. Detectors and advisory model components cannot manufacture canonical Findings outside the evidence lifecycle.

### Model non-authority
`INV-V4-021`: removing, disabling, timing out, or replacing the probabilistic model must never make the deterministic pipeline less safe, less conservative, or less auditable.

### Explanation non-interference
`INV-V4-022`: the explanation layer is a pure projection over frozen reasoning outputs and cannot mutate evidence, hypotheses, confidence, verdicts, or intervention state.

### Semantic fidelity
`INV-V4-023`: presentation must preserve the epistemic meaning of the underlying evidence and verdict. A moderate backend result must not become a confirmed accusation in the UI.

## 5. Runtime model

The actual ONNX/NLI execution occurs in an isolated Web Worker behind the AmbiguityGate and ModelCatalog admission path.

```text
AmbiguityGate
    ↓
EscalationRequest
    ↓
ModelCatalog admission
    ↓
NLI Worker
    ↓
NLIModelAssessment
    ↓
HypothesisReconciler
    ↓
TrustEngine / VerdictResolver
```

The NLI model cannot create EvidenceGraph nodes, Findings, or Verdicts directly.

## 6. Explanation architecture

The ForensicReportBuilder consumes frozen snapshots and authoritative outputs only.

```text
Reason once
   ↓
Freeze result
   ↓
Render many times
```

Explain Mode exposes three disclosure levels:

- **Level 1 — User explanation:** plain-language narrative and uncertainty.
- **Level 2 — Evidence receipts:** timeline, supporting observations, contradictions, and rejected alternatives.
- **Level 3 — Forensic trace:** identifiers, provenance, reasoning lineage, model contribution, and limitations.

## 7. Current verification baseline

The recorded latest baseline is:

- 96 frontend test files / 500 tests passing.
- 27/27 Chromium browser specifications passing.
- 0 TypeScript compilation errors.
- Production build successfully generated.

These are project-internal verification results, not universal guarantees of web safety.

## 8. Product transition

The architecture is now considered feature-complete at the major V4 reasoning level. Future work is primarily product hardening, wild-web acceptance testing, release hardening, and external validation.
