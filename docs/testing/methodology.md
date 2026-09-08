# Testing Methodology & Quality Assurance

This document details the multi-tiered verification framework used by Vigil.

---

## 1. Testing Framework Overview

Vigil employs a three-layer automated testing hierarchy:

```text
                           TESTING HIERARCHY
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
[UNIT & INTEGRATION]      [BROWSER ACCEPTANCE]       [STRESS & HOSTILE]
- Vitest Runner           - Playwright in Chromium   - 10,000 Mutation Flood
- JSDOM DOM Environment   - Real Extension Context   - P3 Queue Starvation
- 51 Test Suites          - Local Adversarial Server - Impostor Node Hijack
- Fast feedback (<15s)    - 13 E2E Test Scenarios    - Depth Bomb Traversal
```

---

## 2. Unit & Integration Battery (`vitest`)

Located across `Frontend/src/**/*.test.ts`:
* **Evidence & Trust Reasoning**: Verifies `EvidenceGraph`, observation provenance, verdict resolution, and memory retention clamping.
* **Intervention Safety**: Verifies blast radius calculation, two-axis authorization gates, atomic transaction commits, and automatic rollbacks.
* **Network & Cookie Analysis**: Verifies cookie entropy, JWT token detection, and tracker domain classification.
* **Legal Auditor**: Verifies 19-dimensional legal traps and negation parsing.
* **RC1 Certification Suites (`src/certification/`)**:
  * `rc1-lifecycle.test.ts`: Executes complete 17-stage pipeline.
  * `compatibility-corpus.test.ts`: Evaluates 11 real-world web archetypes across all 4 operational modes.
  * `self-protection.test.ts`: Verifies runtime resilience against hostile host pages.
  * `field-validation.test.ts`: Verifies Explain Mode forensic justifications and 1-click restore logic.

---

## 3. Browser E2E Adversarial Suite (`playwright`)

Located in `tests/browser/` and executed against the local adversarial fixture server (`tests/adversarial/server.js`):
1. `defender.audio.spec.ts`: OfflineAudioContext & AudioBuffer perturbation consistency.
2. `defender.canvas.spec.ts`: Offscreen canvas probe mitigation and visible canvas non-interference.
3. `defender.cname.spec.ts`: Subdomain cloaking detection vs. first-party traffic.
4. `defender.evasion.spec.ts`: Opaque endpoint paths and nested/mixed-case payloads.
5. `defender.hardware.spec.ts`: 8C/8GB/24b normalization, descriptor & CreepJS lie checks.
6. `defender.race.spec.ts`: Dynamic iframes, inline evaluation, and SPA navigation.
7. `defender.regression.spec.ts`: Canvas paths, WebGL shader compilation, forms, and standard fetch.
8. `defender.telemetry.spec.ts`: sendBeacon, fetch, and XHR across JSON, URLSearchParams, and queries.
9. `defender.webgl.spec.ts`: WebGL 1 & 2 vendor/renderer masking while preserving 3D limits.
10. `fingerprint.spec.ts` (Stages A, B, B2, B3): Dynamic MAIN-world registration, early canvas probes, cross-API mitigation, and hardware persona stealth.

---

## 4. Running the Test Battery

All test commands can be executed from the repository root:

```bash
# Run Vitest unit and integration suite
npm test

# Run Playwright browser suite in Chromium
npm run test:browser

# Run complete verification battery
npm run test:all
```
