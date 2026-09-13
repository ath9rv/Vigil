# Vigil V4 Transition Roadmap

## Current position

The core V4 reasoning engine and its browser/runtime validation are complete enough to enter the product and real-world validation phase.

## Milestone 5 — Product & Real-World Validation

### Phase 1 — Product & UX Hardening

**First-run onboarding and zero-state**
- Calm protected state when no finding exists.
- Clear explanation of what Vigil does without forcing technical knowledge.
- Helpful empty/error states.

**Progressive disclosure clarity**
- Level 1 uses plain language only.
- Level 2 exposes evidence and alternatives.
- Level 3 exposes technical provenance for advanced users.
- Preserve `INV-V4-023` semantic fidelity.

**Feedback loop**
- Add a user-visible “Report misclassification” action.
- Generate sanitized diagnostic information without exposing page secrets.
- Preserve report and evidence lineage for reproducibility.

**Accessibility and responsive fit**
- WCAG AA contrast goals.
- Keyboard navigation.
- Clear typography and spacing.
- Robust popup behavior at common scaling and viewport conditions.

### Phase 2 — Wild-Web Acceptance Testing

- Dry runs across representative news, commerce, SaaS, privacy, and consent experiences.
- React/Next.js hydration and client-side routing.
- Shadow DOM and dynamic rendering.
- False-positive calibration for legitimate pricing, promotion, consent, reservation, and layout behavior.

### Phase 3 — Release & Store Hardening

- Minimal permission and manifest audit.
- Privacy documentation and offline-processing proof.
- Chrome Web Store packaging and release workflow.
- Security disclosure/contact process.
- Production landing page and public documentation.

## Deliberate non-work

No new major detector family or reasoning subsystem is planned during Milestone 5 unless real-world validation demonstrates a concrete need.

The next work should optimize **clarity, trust, empirical evidence, and release quality** rather than architectural breadth.
