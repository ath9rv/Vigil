# Vigil V2.1 System Architecture

This document describes the production architecture of **Vigil V2.1 RC1** (`v2.1.0-rc.1`), an open-source, client-side cognitive firewall and autonomous browser trust shield.

---

## 1. Core Architectural Axioms

Vigil is governed by three non-negotiable architectural axioms:

```text
                  THE THREE CORE AXIOMS
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
Detection Authority      Evidence ≠ Intent     Transactions Are
        ≠                                          Bound To
Mutation Authority                             Identity Context
```

1. **Detection Authority ≠ Mutation Authority**:
   Detecting an adversarial pattern or deceptive element grants *zero* intrinsic authority to mutate the live DOM. Every intervention must be authorized independently through a dedicated Safety Plane that estimates blast radius and assesses structural risk.
2. **Evidence ≠ Intent**:
   Raw observations are immutable facts (e.g. countdown text decremented). Interpretations are hypotheses (e.g. manufactured urgency). The system explicitly models the gap between observation and inference, registering rejected counter-inferences to prevent false accusations.
3. **Transactions are Context-Bound**:
   DOM mutations cannot execute as loose side-effects. Every mutation executes within an atomic `InterventionTransaction` tied to `origin`, `navigationId`, `frameId`, and `nodeIdentity`. If navigation advances or the DOM node is replaced, the transaction aborts cleanly.

---

## 2. Four-Plane Architecture Pipeline

```text
                    VIGIL V2.1 RUNTIME PIPELINE
                               │
 ┌─────────────────────────────┼─────────────────────────────┐
 ▼                             ▼                             ▼
PLANE 1: OBSERVE             PLANE 2: DECIDE               PLANE 3: ACT
- Raw Observations           - EvidenceGraph               - Blast Radius Estimator
- Collector Metadata         - Epistemic Confidence        - Two-Axis Decision Gate
- Immutable Provenance Hash  - Temporal Correlation        - Atomic Transaction
- Event Bus                  - Stale Navigation Reject     - Scoped Mutation Plan
                                                           - Baseline Snapshot
                                                           - 1-Click Rollback
                               │
                               ▼
               PLANE 4: REAL-WORLD GOVERNANCE
               - Differential DOM Comparator
               - Hard Invariant Gates (Forms, Errors)
               - Diagnostic Compatibility Score
               - Per-Site Policy & Domain Permits
               - Explain Mode User Forensics
```

---

## 3. The 3-Plane Subsystems in Detail

### Plane 1: Observation Subsystem (`Frontend/src/evidence/observation.ts`)
* Scanners in content scripts and network monitors produce structured `RawObservation` instances.
* Each observation carries cryptographic provenance (`collectorId`, `version`, `timestamp`, `hash`), ensuring complete traceability.
* Scanners NEVER construct verdicts or mutate DOM directly.

### Plane 2: Decision Subsystem (`Frontend/src/evidence/trust-engine.ts`, `graph.ts`)
* Observations are ingested by `TrustEngine` and indexed into the active `EvidenceGraph`.
* Ingestion enforces strict memory lifecycle budgets (`MAX_NODES_PER_NAVIGATION = 500`).
* Cross-navigation isolation ensures stale events from previous page loads are instantly discarded.
* Verdicts are synthesized with explicit confidence ratings (`HIGH`, `MODERATE`, `LOW`).

### Plane 3: Safety & Action Subsystem (`Frontend/src/intervention/`)
* **Blast Radius Estimator (`blast-radius.ts`)**: Evaluates candidate targets for interactive density, forms, buttons, layout centrality, and subtree complexity, assigning a safety class (`SAFE`, `CAUTIOUS`, `RESTRICTED`).
* **Decision Gate (`manager.ts`)**: Implements two-axis authorization. Only pairings where detection confidence and structural safety align are permitted to mutate.
* **Transaction Engine (`transaction.ts`)**: Enforces atomic pre-mutation snapshots, verifies post-mutation stability, and registers causal rollback listeners.
* **Differential Comparator (`differential-comparator.ts`)**: Measures before/after health (unhandled error deltas, broken image deltas, clickable element stability) to ensure the host page was not materially damaged.

---

## 4. Operational Modes

Vigil supports four user-selectable protection postures:

| Mode | Observation | Reasoning & Graph | DOM Mutation | Differential Check |
| :--- | :---: | :---: | :---: | :---: |
| **`ACTIVE`** | Enabled | Enabled | Authorized `SAFE` + `CAUTIOUS` | Enforced with rollback |
| **`SAFE_ONLY`** | Enabled | Enabled | Only `SAFE` (score $<0.2$) | Enforced with rollback |
| **`OBSERVE_ONLY`** | Enabled | Enabled | **Disabled** (Dry Run) | Simulated diagnostics |
| **`OFF`** | Disabled | Disabled | **Disabled** | Disabled |

---

## 5. Explain Mode

Implemented in `Frontend/src/certification/field-validation.ts` and `Frontend/src/popup/components/ExplainModeView.tsx`, Explain Mode provides non-technical users with clear forensic answers:
1. **What Vigil Observed**: Concrete, verified DOM or network facts.
2. **Why Vigil Acted (or Abstained)**: Epistemic justification and blast radius rating.
3. **What Vigil Did NOT Conclude**: Rejected inferences and alternative hypotheses.
4. **1-Click Restore**: Instant reversibility that reverts all applied modifications to original page state.
