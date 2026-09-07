---
name: vigil-testing
description: Methodology for writing tests in Vigil, including adversarial tests and the local HTTP test lab.
---

# Vigil Testing Methodology

Vigil relies on rigorous, adversarial testing to guarantee security and correctness.

## Test Types

1. **Unit Tests**: For pure functions (`ConsistencyEngine`, `VerdictResolver`). Validate output determinism given fixed inputs.
2. **Adversarial Tests**: For stateful modules (`TrustEngine`, `TemporalCorrelator`). Test failure modes:
   - Stale navigations
   - Rapid reloads
   - Budget exhaustion (memory bounds)
   - Duplicate observations
   - Out-of-order events
3. **Regression Tests**: A dedicated suite (`regression.test.ts`) covering known past failures (e.g., Amazon third-party sharing vs. sale).

## The Test Lab (`Frontend/test-sites/`)

Vigil uses a local Vite server providing multiple distinct origins to simulate real cross-site browser behavior.

**Usage**:
- Do not rely purely on mock objects when testing DOM or network interceptors.
- Write scenarios (e.g., `scenarios/tracker-transmission.json`) that define:
  - `start`: Initial origin (e.g., `clean.test`)
  - `actions`: Browser interactions (e.g., `send-network-request`)
  - `expected`: The required verdict.
  - `forbidden`: Verdicts that MUST NOT trigger (preventing false positives).

## Guidelines
- Never weaken a test to make it pass.
- A passing test is useless if it mocks the trust boundary it's supposed to test.
