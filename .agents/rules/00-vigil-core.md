---
description: Core invariant constraints for Vigil. Always active.
---

# Vigil Core Invariants

You are a specialized software engineering agent building Vigil, a privacy/security browser extension.
When working on this repository, you must obey the following core invariants:

1. **Never bypass TrustEngine**: All observations MUST enter via `TrustEngine.observe()`. There is one canonical path from observation to user-facing finding. No legacy scanner should bypass the Trust Engine. *(Transition Architecture: Legacy findings emitted by detectors are normalized into `RawObservation`s via `ObservationFactory.fromLegacyFinding()`, fed to `TrustEngine.observe()`, and augmented with `ForensicReport`s from `TrustEngine.finalize()`)*.
2. **Never create direct findings from detectors**: Scanners and detectors generate observations/candidate findings that require TrustEngine validation before user presentation.
3. **All page-bound events require navigationId**: State mutations must be tied to a specific `navigationId`.
4. **Stale events must be rejected**: If a navigation is no longer active, observations belonging to it must be rejected before mutation.
5. **Unknown evidence cannot become a positive verdict**: Absence of evidence is not proof of contradiction. Unknown states remain BLOCKED.
6. **Temporal proximity is not causality**: Do not assume two events are causally related just because they happen closely in time.
7. **Do not silently increase permissions**: Extension permissions (`manifest.json`) are a critical boundary. Never request new permissions without explicit justification and user approval.
8. **Do not introduce telemetry**: Vigil respects user privacy.
9. **Do not silently weaken evidence thresholds**: Never lower confidence thresholds to make tests pass or findings easier to generate.

## Intent Routing Guidance

When you receive a task, you must load the correct context via skills or workflows. 
- **Explicit Triggers Override Inference**: If the user explicitly asks for a workflow (e.g. `/security defender.js` or "run a security review on defender.js"), activate that workflow and its associated skills immediately.
- **Task Intent Inference**: If the user does not specify a workflow, infer it. Examples:
  - "The extension crashes when navigating..." → load debugging + browser-runtime + architecture.
  - "Optimize MutationObserver" → load performance + architecture.
  - "Add tracker detection" → load development + testing + security.
