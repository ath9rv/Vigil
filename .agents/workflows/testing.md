---
trigger: model_decision
description: Testing playbook. Triggered automatically when tasked with testing or writing tests.
---

# Vigil Testing Workflow

1. **Unit Tests**: Ensure individual pure functions (e.g., ClaimExtractor, ConsistencyEngine) are tested with vitest.
2. **Integration Tests**: Test the combination of modules (e.g., `TrustEngine.observe()` through to `finalize()`).
3. **Adversarial Tests**: Write tests that actively try to break the system (e.g., stale navigations, rapid reloads, duplicate IDs, budget exhaustion).
4. **Local HTTP Test Lab**: Use the `Frontend/test-sites/` server to perform end-to-end browser tests.
   - Run the local server.
   - Configure scenarios.
   - Verify extension behavior in a real browser context.
