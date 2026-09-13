# Vigil

## Your browser, with receipts.

Vigil is a privacy and browser-security system designed to help people understand suspicious website behavior.

Instead of treating the web as simply **safe** or **unsafe**, Vigil builds an evidence-backed explanation of what happened, considers competing explanations, tests bounded counterfactuals, and shows the user why a conclusion was reached.

> **Vigil first learned how to know what it observed.**
> **V4 is about learning how to reason about why it happened.**

## What Vigil does

Vigil observes browser activity such as page changes, network/security signals, privacy disclosures, and suspicious interface behavior. It then evaluates those observations through a layered reasoning pipeline.

The goal is not to accuse a website because something looks unusual. The goal is to determine what the available evidence actually supports.

### The epistemic ladder

```text
OBSERVE
  ↓
VERIFY
  ↓
CORRELATE
  ↓
TEST ALTERNATIVES
  ↓
CHECK COUNTERFACTUALS
  ↓
MEASURE AMBIGUITY
  ↓
ASK MODEL (only when necessary)
  ↓
RECONCILE
  ↓
AUTHORITATIVE DECIDE
  ↓
EXPLAIN
```

### The core architectural rule

> **V4 is an inference consumer, never an evidence authority.**

The deterministic TrustEngine remains the sole authority for canonical verdicts. Probabilistic reasoning is an optional advisory layer that can help resolve genuine ambiguity, but it cannot create evidence, mutate the evidence graph, or directly manufacture a Finding or Verdict.

## Current architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — PRESENTATION & ACTION                                      │
│ Forensic reports • Explain Mode • user-facing explanations            │
│ Intervention execution • structured investigation export              │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 2 — V4 COGNITIVE REASONING                                     │
│ Temporal events • causal candidates • competing hypotheses            │
│ Counterfactual evaluation • bounded NLI assistance                   │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 1 — V2.1 TRUST SUBSTRATE                                       │
│ RawObservation • provenance • EvidenceGraph • claims                  │
│ contradictions • VerdictResolver                                     │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 0 — RUNTIME SAFETY                                             │
│ MV3 lifecycle • governor • resource ceilings • UI isolation           │
└────────────────────────────────────────────────────────────────────────┘
```

## What is complete

The current engineering baseline includes:

- Hardened V2.1 trust substrate and security invariants.
- Immutable observation contracts and read-only V4 evidence boundaries.
- Deterministic temporal and hypothesis reasoning.
- Bounded counterfactual evidence evaluation.
- Ambiguity gating before probabilistic reasoning.
- Local NLI/ONNX Web Worker runtime integration with admission controls.
- Immutable forensic report generation and Explain Mode.
- Adversarial browser validation in real Chromium.
- Chromium performance and resource profiling with repeated measurements.

The latest documented regression state is **96 frontend test files / 500 tests passing**, **27/27 Chromium browser specifications passing**, **0 TypeScript errors**, and a successful production Vite build.

These figures describe the current recorded engineering baseline; they are not a universal claim about every website or every machine.

## Product direction

The technical engine is now treated as a certified foundation. The next phase is product and real-world validation rather than another major reasoning subsystem.

### Milestone 5 — Product & Real-World Validation

**Phase 1 — Product & UX hardening**
- First-run onboarding and calm zero-state.
- Clear plain-English explanations.
- User feedback / misclassification reporting.
- Accessibility and responsive popup polish.

**Phase 2 — Wild-web acceptance testing**
- Controlled runs against real, complex websites.
- React/Next.js hydration and SPA navigation.
- Shadow DOM and client-side routing behavior.
- False-positive calibration on legitimate promotions, pricing, consent, and reservation flows.

**Phase 3 — Release & store hardening**
- Permission and manifest audit.
- Privacy documentation and offline-processing guarantees.
- Chrome Web Store packaging and release process.

No new detector or major reasoning layer is planned in this phase unless real-world evidence shows a clear need.

## Trust philosophy

Vigil separates three things that are often conflated:

```text
Model Assessment Confidence
        ≠
Vigil Epistemic Confidence
        ≠
Canonical Verdict
```

The model can help interpret language. The TrustEngine evaluates the broader evidence. The VerdictResolver owns the final canonical verdict.

> **Vigil does not let intelligence create authority.**

## Documentation map

- `docs/ARCHITECTURE.md` — canonical architecture and governing doctrine.
- `docs/EVOLUTION.md` — engineering progression and milestone record.
- `docs/ROADMAP.md` — current product/release roadmap.
- `docs/performance/` — performance budgets, Chromium baselines, certification.
- `docs/security/` — security and epistemic invariants, threat model.
- `docs/testing/` — test coverage and adversarial validation.
- `docs/reasoning/` — NLI and reasoning specifications.
- `docs/product/` — user-facing product principles and validation plan.

## Status

**Vigil V4 technical engine: certified foundation.**

The next work is to turn that foundation into a product that ordinary people can understand, trust, and use on the open web.
