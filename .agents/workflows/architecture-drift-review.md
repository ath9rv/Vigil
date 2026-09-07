---
trigger: model_decision
description: Architecture drift review playbook. Triggered by /review architecture.
---

# Vigil Architecture Drift Review

Run this workflow to check for architectural decay. Use deterministic checks (like `grep_search` and AST tools) where possible:

1. **Direct Finding creation**: Search for any `Finding` objects being instantiated directly outside of the `ExplanationEngine` or `performLiveVerification`.
2. **Duplicate state managers**: Ensure no new global state singletons were introduced outside of `navigation-state` and `TrustEngine`.
3. **Duplicate utilities**: Check for duplicate code that should be abstracted to `shared/`.
4. **New bypasses**: Ensure the `message-router` still pipes all observations through `TrustEngine.observe()`.
5. **New permissions**: Review `manifest.json` for scope creep.
6. **Cross-world communication**: Ensure untyped boundaries between Content and Background haven't been added.

## Artifact Generation
Conclude the workflow by outputting a structured report exactly like this:

```text
ARCHITECTURE REVIEW

Blast radius:
[HIGH/MEDIUM/LOW]

Changed boundaries:
[List of trust or execution boundaries modified]

New dependencies:
[List of new npm packages or browser APIs]

TrustEngine bypass:
[NONE or describe bypass]

Architecture drift:
[NONE or describe violations of ADRs]
```
