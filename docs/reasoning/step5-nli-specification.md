# Step 5 — Gated Probabilistic & NLI Reasoning Specification

## Governing doctrine

> **Vigil does not let intelligence create authority. Intelligence operates only where deterministic evidence has already earned the right to ask a harder question.**

## Runtime flow

```text
AmbiguityGate
    ↓
EscalationRequest
    ↓
ModelCatalog admission
    ↓
NLI Web Worker
    ↓
NLIModelAssessment
    ↓
HypothesisReconciler
    ↓
TrustEngine / VerdictResolver
```

## Epistemic triad

```text
Model Assessment Confidence
        ≠
Vigil Epistemic Confidence
        ≠
Canonical Verdict
```

## Runtime constraints

- bounded input size;
- local/off-thread execution;
- model admission through a pinned catalog/checksum gate;
- one concurrent inference at a time;
- hard timeout;
- failure to unresolved/degraded behavior;
- no EvidenceGraph mutation;
- bounded reconciliation contribution;
- source observation IDs retained for provenance.

## Model provenance

Every assessment records sufficient provenance to identify the model and execution context, including model identity/version, checksum metadata, adapter information, execution mode, timing, and source observation references.

## Implementation status

The real local NLI/ONNX Web Worker has been integrated and profiled in Chromium as part of Milestone 4. The production model path is therefore no longer described as merely planned.

## Safety rule

The NLI worker is an advisory reasoning assistant. It is not a decision authority and cannot create canonical browser verdicts.
