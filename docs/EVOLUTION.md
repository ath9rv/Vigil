# Vigil Engineering Evolution

## Guiding thesis

> **Vigil first learned how to know what it observed. V4 is about learning how to reason about why it happened.**

## V2.1 — Hardened trust substrate

The baseline removed direct synthetic Finding creation, centralized authority in the TrustEngine, tightened provenance/navigation boundaries, bounded storage, isolated Vigil UI, calibrated heuristic confidence, and established a 15-point security gate.

## V4 Step 2 — Freeze & instrument the substrate

The observation contract became deeply read-only, V4 gained a read-only evidence snapshot boundary, and performance baselines were recorded rather than assumed.

## V4 Step 3 — Deterministic temporal reasoning

Temporal ordering, causal candidates, and competing hypotheses were introduced while preserving the distinction between temporal succession and causality.

## V4 Step 4 — Counterfactual evidence

The engine began testing bounded alternate explanations through observed state differences rather than inventing unconstrained alternate realities.

## V4 Step 4.5 — Ambiguity gate

Probabilistic reasoning was formally restricted to genuine unresolved ambiguity, with grounding and degradation requirements.

## V4 Step 5 — NLI runtime

A local Web Worker model path was integrated under ModelCatalog admission, hard timeout, concurrency limits, provenance requirements, and non-authority constraints.

## Layer 3 — Forensic explanation

ForensicReportBuilder and Explain Mode became a read-only projection layer with semantic fidelity, sensitive-data redaction, repeatable exports, and progressive disclosure.

## Milestone 2 — Real Chromium adversarial validation

The extension was exercised in actual Chromium against hostile fixtures and controlled legitimate scenarios, including mutation storms, drip-pricing flows, countdown evasion, spoofing, navigation races, and false-positive controls.

## Milestone 3 — Chromium performance certification

Performance methodology was upgraded from Node/jsdom microbenchmarks to repeated real-browser profiling with clear measurement terminology and Vigil-specific engineering budgets.

## Milestone 4 — Real ONNX/NLI runtime certification

The actual local model execution path was validated in Chromium, including model loading, warm inference, timeout behavior, memory measurements, concurrency controls, and adversarial input handling.

## Current transition — Product & real-world validation

The next phase deliberately stops adding major reasoning subsystems. The focus is product clarity, wild-web validation, feedback loops, accessibility, release hardening, and public beta readiness.

## Documentation discipline

Future changes should continue to record:

- what changed;
- why it changed;
- security and epistemic impact;
- performance impact;
- tests and runtime verification;
- known limitations;
- documentation updates.
