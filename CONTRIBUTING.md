# Contributing to Vigil

Thank you for your interest in contributing to **Vigil**! As an open-source, client-side cognitive firewall and privacy shield, maintaining high security standards, zero telemetry, and zero page breakage is critical.

---

## 1. Core Invariants & Architecture Constraints

Every contribution must strictly preserve the following invariants:

1. **Zero-Telemetry Invariant**:
   * Never introduce external analytics, tracking beacons, cloud telemetry, or remote logging.
   * All reasoning, threat evaluation, and heuristic classification must happen 100% locally in browser memory.
2. **Detection Authority ≠ Mutation Authority**:
   * Detecting a suspicious pattern never grants permission to mutate the DOM directly.
   * All mutations must be authorized through the Safety Plane (`blastRadiusEstimator`), bound to an atomic `InterventionTransaction`, and reversible via `differentialComparator`.
3. **Evidence ≠ Intent**:
   * Preserve the distinction between raw observations (DOM/network facts) and inferences (hypotheses).
   * Register rejected counter-inferences for all findings.
4. **Manifest V3 Least Privilege**:
   * Do not request broad or unnecessary extension permissions.

---

## 2. Classification of Changes

To maintain release candidate stability, contributions are classified into two categories:

* **Category A (Semantic-Neutral)**:
  * Documentation improvements, test fixtures, tooling scripts, or comments.
  * Subject to standard linting and unit test verification.
* **Category B (Release-Affecting)**:
  * Changes to manifest, background service workers, content script scanners, mutation logic, or dependencies.
  * Must pass the entire automated verification battery: Vitest (all suites), Playwright (all browser scenarios), and build integrity checks.

---

## 3. Development Workflow

### Prerequisites
* **Node.js**: `v20.x` or `v24.x`
* **NPM**: `v10.x` or `v11.x`
* **Chromium**: Google Chrome, Brave, Chromium, or Microsoft Edge

### Setup
```bash
# Clone the repository
git clone https://github.com/ath9rv/Vigil.git
cd Vigil

# Install extension dependencies
npm install --prefix Frontend

# Install browser testing dependencies
npm install --prefix tests/browser
```

### Running Commands from Repository Root
```bash
# Compile TypeScript and bundle production extension (output in Frontend/dist)
npm run build

# Run Vitest unit and integration test suite
npm test

# Run Playwright end-to-end browser suite in real Chromium
npm run test:browser

# Run the complete test battery
npm run test:all
```

---

## 4. Testing Requirements

Before opening a pull request, ensure:
1. `npm test` passes 100% green across all unit and integration test suites.
2. `npm run test:browser` passes 100% green across all Chromium adversarial test scenarios.
3. `npm run build` completes without TypeScript errors or Rollup warnings.
4. No machine-specific absolute file paths are committed in code or documentation.

---

## 5. Security Vulnerability Reporting

If you discover a security vulnerability or bypass in Vigil, please refer to [`SECURITY.md`](SECURITY.md) for confidential reporting guidelines.
