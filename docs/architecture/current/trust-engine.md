# Trust Engine & Evidence Graph

This document details the reasoning core of Vigil: the **Trust Engine**, **Evidence Graph**, and **Temporal Correlator**.

---

## 1. Trust Engine Responsibilities

The `TrustEngine` (`Frontend/src/evidence/trust-engine.ts`) is the background reasoning orchestrator:
1. **Observation Ingestion**: Ingests observations from content scripts and background monitors.
2. **Memory Lifecycle Enforcement**: Caps graph nodes to `MAX_NODES_PER_NAVIGATION = 500` per tab context.
3. **Cross-Navigation Isolation**: When a tab navigates to a new URL, previous navigation nodes are pruned and subsequent late events referencing stale navigation IDs are safely rejected.
4. **Epistemic Verdict Synthesis**: Resolves conflicting evidence, evaluates negation patterns, and produces final structured findings.

---

## 2. Evidence Graph Topology

The `EvidenceGraph` (`Frontend/src/evidence/graph.ts`) maintains an in-memory directed acyclic graph (DAG) representing the state of the active page:

```text
[RawObservation 1] ───┐
                      ├──► [Hypothesis Node] ───► [Final Verdict]
[RawObservation 2] ───┘           │
                                  ▼
                       [Counter-Evidence Node]
```

* **Nodes**: Represent raw observations, synthesized hypotheses, or corroborating facts.
* **Edges**: Represent provenance links, temporal sequence, or contradiction relationships.
* **Bounded Retention**: To prevent runaway memory usage on infinite-scroll single page apps (SPAs), the graph employs LRU-based pruning when approaching node budgets.

---

## 3. Epistemic Confidence vs. Structural Safety

Vigil rigorously differentiates between two independent vectors:

1. **Detection Confidence (Epistemic Axis)**:
   * How certain are we that the observed behavior is genuinely deceptive or predatory?
   * Evaluated through multi-signal corroboration, repetition, and negation checking.
   * Outputs: `LOW`, `MODERATE`, `HIGH`.

2. **Structural Blast Radius (Safety Axis)**:
   * If Vigil intervenes on this DOM subtree, what is the probability of breaking page layout, checkout flows, or interactive components?
   * Evaluated by measuring button count, input count, text density, and ancestor depth.
   * Outputs: `SAFE` ($<0.2$), `CAUTIOUS` ($0.2 - 0.5$), `RESTRICTED` ($>0.5$).

### The Two-Axis Mutation Gate

| Epistemic Confidence | Safety: `SAFE` | Safety: `CAUTIOUS` | Safety: `RESTRICTED` |
| :--- | :---: | :---: | :---: |
| **`HIGH`** | ✅ **Authorized** | ✅ **Authorized** | ❌ **Blocked** (Audit Only) |
| **`MODERATE`** | ✅ **Authorized** | ❌ **Blocked** (Audit Only) | ❌ **Blocked** (Audit Only) |
| **`LOW`** | ❌ **Blocked** (Audit Only) | ❌ **Blocked** (Audit Only) | ❌ **Blocked** (Audit Only) |

A finding with `HIGH` confidence on a `RESTRICTED` element (e.g. inside an active payment form) will **never** mutate the DOM; it is reported as an observation in the UI without risking page breakage.
