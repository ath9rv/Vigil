# Vigil Product Transition Plan

## Product thesis

> **Vigil can observe suspicious web behavior, investigate competing explanations, test its own conclusion, and show the evidence behind the result.**

The technical engine is now treated as a stable foundation. The product challenge is to make that reasoning understandable, useful, and trusted by people who do not know how the engine works.

## Phase 1 — Product & UX hardening

### Zero state
The normal experience should be calm rather than alarming. When there is no meaningful finding, the interface should clearly communicate that Vigil is active without manufacturing concern.

### Progressive disclosure
The UI should reveal complexity only when the user asks for it:

1. **Why did Vigil flag this?** — plain-language explanation.
2. **Show receipts** — timeline, evidence, alternatives, uncertainty.
3. **Technical trace** — provenance, IDs, contradictions, model contribution.

### Feedback
Add a clearly labeled misclassification/feedback action that exports sanitized diagnostic information without exposing page secrets or credentials.

### Accessibility
Maintain strong contrast, keyboard usability, readable typography, responsive popup layout, and clear focus states.

## Phase 2 — Wild-web validation

Use representative third-party websites and real complex frontends to find issues that controlled fixtures cannot reveal.

Validation should prioritize false-positive calibration and explanation quality as much as detection coverage.

## Phase 3 — Release readiness

Before public release, complete:

- permission and manifest review;
- privacy documentation;
- reproducible production build process;
- store assets and policy review;
- security disclosure channel;
- beta feedback mechanism.

## Deliberate constraint

No major new detector or reasoning subsystem is planned during this transition unless external validation demonstrates a concrete, high-value gap.
