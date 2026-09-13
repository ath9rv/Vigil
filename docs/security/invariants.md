# Vigil Security & Epistemic Invariants

This catalog records the non-negotiable properties that protect Vigil's trust boundary.

## V2.1 security foundation

The hardened V2.1 substrate enforces the documented security gate covering, among other properties:

- no direct Finding bypass around the TrustEngine;
- no unbounded persistent storage paths;
- stale navigation rejection;
- sender/origin validation;
- no cross-frame authority confusion;
- closed Shadow DOM protection;
- no new unnecessary external egress or permissions.

## V4 epistemic invariants

### INV-V4-001 — Grounding
Every hypothesis must reference immutable observed evidence.

### INV-V4-002 — Temporal & navigation fencing
Causal inference cannot silently cross navigation boundaries.

### INV-V4-003 — Performance & budget guarantees
Reasoning is governor-scheduled and budget-bound.

### INV-V4-004 — Forensic transparency
Conclusions expose evidence, contradictions, uncertainty, and rejected alternatives.

### INV-V4-005 — Epistemic humility
Reasoning may increase explanation, not unsupported authority.

### INV-V4-006 — Timeline isolation
Temporal indexes cannot contain observations from another navigation.

### INV-V4-007 — Dual grounding
Causal candidates require sufficient observed grounding.

### INV-V4-008 — Non-dogmatic precedence
Temporal precedence alone cannot produce a confirmed causal conclusion.

### INV-V4-009 — Read-only substrate
Hypothesis evaluation cannot mutate the underlying evidence graph.

### INV-V4-010 — Interruptible traversal
Graph traversal is governor-aware and interruptible.

### INV-V4-011 — Auditable rejection
Rejected hypotheses remain auditable.

### INV-V4-012 — Bounded counterfactual space
Counterfactual evaluation operates only on observed, bounded state differences.

### INV-V4-013 — Non-definitive intent
Counterfactual evidence does not establish intent beyond its evidence.

### INV-V4-014 — Counterfactual immutability
Counterfactual evaluation cannot mutate its source evidence.

### INV-V4-015 — Asymmetric diff determinism
State diffs are deterministic and consistently ordered.

### INV-V4-016 — Zero synthetic evidence nodes
Probabilistic reasoning cannot introduce evidence nodes.

### INV-V4-017 — Inference authority boundary
NLI cannot directly create a Finding or Verdict.

### INV-V4-018 — Deterministic escalation grounding
Probabilistic conclusions must reference the deterministic observations that triggered escalation.

### INV-V4-019 — Contradiction primacy
Hard TrustEngine contradictions cannot be overridden by the probabilistic layer.

### INV-V4-020 — Safe ambiguity degradation
Failure, timeout, or malformed model output degrades to an unresolved state.

### INV-V4-021 — Model non-authority
Removing, disabling, timing out, or replacing the model must not make the deterministic pipeline less safe, less conservative, or less auditable.

### INV-V4-022 — Explanation non-interference
The explanation layer cannot mutate observations, hypotheses, confidence, verdicts, or intervention state.

### INV-V4-023 — Semantic fidelity
The presentation layer cannot materially strengthen or weaken the epistemic meaning of the underlying result.
