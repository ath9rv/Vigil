# Vigil Documentation

This documentation set describes the current Vigil V4 architecture, verification state, performance evidence, security invariants, and product transition roadmap.

## Source of truth

`docs/ARCHITECTURE.md` is the canonical architectural specification.

The implementation history is captured in `docs/EVOLUTION.md`.

Performance claims belong in `docs/performance/`, security claims in `docs/security/`, testing evidence in `docs/testing/`, and reasoning/model contracts in `docs/reasoning/`.

## Current state

Vigil has completed the core V4 reasoning and verification milestones:

1. V2.1 trust substrate hardening.
2. Immutable trust-contract freeze and instrumentation.
3. Deterministic temporal causal graph.
4. Counterfactual evidence evaluation.
5. Ambiguity gate.
6. Gated probabilistic/NLI framework.
7. Forensic explanation and report generation.
8. Explain Mode product surface.
9. Adversarial browser validation.
10. Chromium performance profiling.
11. Real ONNX/NLI Worker runtime integration.

The project is now in the **Product & Real-World Validation** phase.

## Documentation rule

Vigil documentation distinguishes:

- **Implemented and measured capability** — backed by tests or runtime measurements.
- **Architecture contract** — required behavior that implementation must preserve.
- **Planned capability** — intentionally not described as implemented until the runtime has been validated.

Performance budgets are **Vigil engineering targets**, not browser or web standards.

Legal/regulatory language is intentionally conservative. Structured reports are described as being **for independent review and auditability**, not as automatically legally admissible evidence.
