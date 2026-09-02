# VIGIL — Cognitive Firewall & Autonomous Privacy Shield

[![Protocol v5.0.0 Ratified](https://img.shields.io/badge/QA%2FQC%20Standard-Protocol%20v5.0.0-00E5FF.svg)](#governance--qaqc-standard)
[![Tests Passing](https://img.shields.io/badge/Unit%20Tests-23%2F23%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![Browser Acceptance](https://img.shields.io/badge/Playwright%20E2E-3%2F3%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chromium-MV3%20Compliant-FFD600.svg)](#architecture)

> **Vigil** is an open-source, client-side browser extension engineered to neutralize deceptive commerce (dark patterns), prevent stealth browser fingerprinting, strip tracking beacons, and interpret hostile legal terms—without collecting or transmitting your personal browsing data.

---

## Architecture Overview

Vigil operates strictly within the Chromium Manifest V3 sandbox, combining deterministic rule evaluation, prototype interposition, and asynchronous atomic serialization into an integrated privacy pipeline:

```text
                               THE VIGIL ARCHITECTURE PIPELINE
                                              │
      ┌───────────────────────────────────────┼───────────────────────────────────────┐
      ▼                                       ▼                                       ▼
[NETWORK LAYER (DNR)]               [PAGE EXECUTION WORLDS]                 [BACKGROUND WORKER]
├── 100+ Tracker Blocklist          ├── MAIN World: defender.js             ├── Service Worker Event Loop
│   (Disconnect.me Taxonomy)        │   (Canvas 2D, WebGL, AudioBuffer)     ├── AsyncMutex Storage Serializer
├── URL Query Sanitizer             ├── ISOLATED World: content-scripts     ├── Decoupled Reputation Correlator
│   (29 Tracking Params Stripped)   │   (MutationObserver, Dark Patterns)   ├── Local Threat Heuristic Engine
└── HTTPS Upgrade Enforcer          └── Shadow DOM: ambient-shield.ts       └── Badge & Notification Dispatch
```

---

## Core Capabilities

### 1. In-Situ Deceptive Pattern Mitigation (Modules M1, M3–M5)
* **Shadow DOM Traversal:** Recursively inspects live DOM trees, including open shadow roots, evaluating rules across deceptive pricing, hidden cancellation flows, and artificial urgency timers.
* **Resilient Selector Engine:** Hardened against malformed CSS selectors and hostile page mutation loops with explicit try/catch query boundaries.
* **Ambient Warning Layer:** Injects high-contrast, accessible alerts into an isolated shadow root to prevent page style bleed.

### 2. Stealth Anti-Fingerprinting Defender (`defender.js`)
* **MAIN-World Execution:** Injected at `document_start` to wrap HTML5 Canvas (`toDataURL`, `getImageData`), WebGL parameters, and `AudioBuffer` before page scripts can execute.
* **Deterministic Noise Injection:** Offsets offscreen probe pixels deterministically based on origin seeds, ensuring consistent digests within a browsing session while preventing cross-origin tracking.
* **Onscreen Canvas Preservation:** Distinguishes micro-probes from connected, user-facing canvases (games, drawing tools, CAPTCHAs) to maintain 100% visual fidelity.

### 3. Network-Level Privacy (Declarative Net Request)
* **Pre-Consent Network Blocking:** Blocks outbound network connections to over 100 known tracking and advertising domains across subresources (scripts, beacons, iframes).
* **URL Hygiene Engine:** Strips 29 tracking parameters (`fbclid`, `gclid`, `utm_*`, `_ga`, `mc_eid`) on main-frame navigations via regex-free declarative transforms.
* **Global Privacy Control (GPC):** Injects `Sec-GPC: 1` headers on outbound network requests and exposes `navigator.globalPrivacyControl = true`.

### 4. Zero-Leakage Threat Intelligence
* **100% Offline Heuristics:** Replaces cloud API dependencies with deterministic client-side threat analysis:
  * **IDN / Punycode Homoglyph Attacks:** Flags Cyrillic and Greek characters used to visually clone legitimate URLs.
  * **Typosquatting Detection:** Real-time Levenshtein edit distance matrix against known high-value targets (`paypa1.com`, `g00gle.com`).
  * **Credential Harvesting Stacking:** Detects deceptive keyword combinations on unverified domains.
* **Zero Client-Side Secrets:** Zero mock or production API keys stored in extension bundles.

### 5. Negation-Aware Legal Intelligence (Local SLM)
* **Negation Preservation:** Evaluates privacy policies and terms of service, correctly distinguishing *"We do not sell personal data"* (FAIR) from affirmative data sales (WARNING).
* **Consumer Protection Flags:** Detects mandatory binding arbitration clauses, class-action waivers, and aggressive auto-renewal terms.
* **5-Fold Behavioral ToS;DR Consent:** Zero domain lookups to external legal rating services occur during background browsing. Queries require explicit, on-demand user consent.

---

## Project Structure

```text
Browex/
├── Backend/                 # (Optional) Serverless proxy & brand list sync layer
├── Frontend/                # Complete Chromium Manifest V3 browser extension
│   ├── dist/                # Production distribution bundle (generated)
│   ├── public/              # Icons and static extension assets
│   ├── rules/               # Deterministic JSON detection rulesets
│   │   ├── cookie_consent_rules.json
│   │   ├── https_upgrades.json
│   │   ├── m1_deceptive_commerce.json
│   │   ├── m2_threat_shield.json
│   │   ├── m3_privacy_consent.json
│   │   ├── m4_attention_addiction.json
│   │   ├── m5_social_proof.json
│   │   ├── tracker_blocklist.json
│   │   └── url_sanitizer.json
│   ├── src/
│   │   ├── background/      # Service worker, message router, live scanner
│   │   ├── content-scripts/ # Scanner, ambient shield, cookie consent, defender
│   │   ├── correlation/     # Reputation scoring (grade.ts, correlate.ts)
│   │   ├── legal-auditor/   # Local legal SLM classifier & ToS;DR client
│   │   ├── popup/           # React 18 / Tailwind CSS extension popup UI
│   │   ├── shared/          # Types, storage mutex (AsyncMutex), constants
│   │   └── threat-intel/    # Local heuristic threat engine & canonicalizer
│   ├── manifest.json        # Extension Manifest V3 configuration
│   ├── package.json         # Dependencies and build scripts
│   └── vite.config.ts       # Rollup bundle configuration (defender & popup)
├── files/                   # System Requirement Specifications & Architecture docs
├── tests/
│   ├── adversarial/         # Local HTTP test server and hostile HTML fixtures
│   └── browser/             # Playwright E2E browser acceptance suite
├── LICENSE                  # Apache License 2.0
├── PRIVACY.md               # Zero-telemetry policy & data governance
└── SECURITY.md              # Vulnerability reporting & threat model
```

---

## Developer Setup & Installation

### Prerequisites
* **Node.js**: `v20.x` or `v24.x`
* **NPM**: `v10.x` or `v11.x`
* **Chromium Browser**: Google Chrome, Brave, Chromium, or Microsoft Edge (MV3 compatible)

### 1. Build the Extension
```bash
# Navigate to Frontend directory
cd Frontend

# Install dependencies
npm install

# Compile TypeScript and bundle distribution
npm run build
```
Build output will be generated cleanly into `Frontend/dist/` in under 3 seconds.

### 2. Load into Chromium Browser
1. Open your browser and navigate to `chrome://extensions/` (or `brave://extensions/`).
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `D:\Browex\Frontend\dist` directory.
5. Vigil is now active and protecting your session.

---

## Test Verification & Evidence Ledger

All verification complies with **Vigil Master QA/QC Protocol v5.0.0**:

### Unit Test Suite (Vitest)
Executes 23 automated tests across 7 core suites in under 2 seconds:
```bash
cd Frontend
npm test
```
```text
✓ src/threat-intel/engine.test.ts          (5 tests)  — Typosquatting, Homoglyphs, Malformed URLs
✓ src/legal-auditor/tosdr-consent.test.ts  (5 tests)  — 5-fold behavioral privacy consent
✓ src/legal-auditor/classifier.test.ts     (4 tests)  — Negation preservation & arbitration
✓ src/correlation/grade.test.ts             (3 tests)  — Reputation grade clamping
✓ src/correlation/correlate.test.ts         (2 tests)  — Penalty aggregation & moral hazard
✓ src/content-scripts/resilience.test.ts    (2 tests)  — Non-standard pseudo-selector resilience
✓ src/shared/storage.concurrency.test.ts    (2 tests)  — AsyncMutex 50-worker lost-update elimination
```

### Browser E2E Acceptance Suite (Playwright)
Executes against local hostile test harnesses:
```bash
# Start the local adversarial test server (in a separate terminal)
node tests/adversarial/server.js

# Run the Playwright acceptance suite
cd tests/browser
npx playwright test
```
```text
ok 1 [chromium] STAGE A: Background service worker registers dynamic MAIN-world defender
ok 2 [chromium] STAGE B: Standalone defender mitigates early canvas probes & maintains session consistency
ok 3 [chromium] STAGE B2: Cross-API mitigation covers toDataURL and getImageData simultaneously
```

---

## Governance & QA/QC Standard

Vigil is governed under **`VIGIL MASTER QA/QC PROTOCOL v5.0.0 — FINAL RELEASE-GATE STANDARD`**:
* **Evidence Hierarchy:** Strict separation between Static (`E1`), Unit (`E2`), Integration (`E3`), Browser Runtime (`E4`), and Adversarial (`E5`) verification.
* **The Prime Directive:** Infrastructure availability, code presence, and unit correctness are never counted as equivalent to end-to-end product effectiveness.
* **Hard Release Gates:** Zero hardcoded credentials, zero unconsented data transmissions, and proven hostile-page mitigation required for release.

---

## License & Security

* **License:** Licensed under the [Apache License, Version 2.0](LICENSE).
* **Security:** For vulnerability disclosure guidelines, see [SECURITY.md](SECURITY.md).
* **Privacy:** For details on our zero-telemetry architecture, see [PRIVACY.md](PRIVACY.md).
