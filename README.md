# VIGIL — Cognitive Firewall & Autonomous Privacy Shield

[![Protocol v5.0.0 Ratified](https://img.shields.io/badge/QA%2FQC%20Standard-Protocol%20v5.0.0-00E5FF.svg)](#governance--qaqc-standard)
[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-27%2F27%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![Browser Acceptance](https://img.shields.io/badge/Playwright%20E2E-13%2F13%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chromium-MV3%20Compliant-FFD600.svg)](#architecture)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero--Telemetry-purple.svg)](PRIVACY.md)

> **Vigil** is an open-source, client-side browser extension engineered to neutralize deceptive commerce (dark patterns), prevent stealth browser fingerprinting, inspect live cookies, analyze legal terms in detail, and sanitize tracking telemetry—without collecting or transmitting your personal browsing data.

📘 **New to Vigil?** Open [`HOW_TO_USE.txt`](HOW_TO_USE.txt) in Windows Notepad for a simple, 30-second quick-start walkthrough!

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
│   (Disconnect.me Taxonomy)        │   (Hardware Persona, Canvas, WebGL)   ├── AsyncMutex Storage Serializer
├── URL Query Sanitizer             ├── ISOLATED World: content-scripts     ├── Decoupled Reputation Correlator
│   (29 Tracking Params Stripped)   │   (Cookie Forensics, Dark Patterns)   ├── Local Threat Heuristic Engine
└── HTTPS Upgrade Enforcer          └── Shadow DOM: ambient-shield.ts       └── Multi-Channel Telemetry Sanitizer
```

---

## Core Capabilities

### 1. In-Situ Deceptive Pattern Mitigation (Modules M1, M3–M5)
* **Shadow DOM Traversal:** Recursively inspects live DOM trees, including open shadow roots, evaluating rules across deceptive pricing, hidden cancellation flows, and artificial urgency timers.
* **Resilient Selector Engine:** Hardened against malformed CSS selectors and hostile page mutation loops with explicit try/catch query boundaries.
* **Ambient Warning Layer:** Injects high-contrast, accessible alerts into an isolated shadow root to prevent page style bleed.

### 2. Policy-Driven Controlled Active Deception (`defender.js`)
* **MAIN-World Execution:** Injected at `document_start` before page scripts can execute. Governed by a central `DeceptionPolicy` interface.
* **Hardware Fleet Normalization:** Normalizes `navigator.hardwareConcurrency` to `8`, `navigator.deviceMemory` to `8`, and screen `colorDepth`/`pixelDepth` to `24`-bit. Generates a stable baseline persona that blends seamlessly into the standard modern desktop fleet.
* **Idempotent Canvas 2D Protection:** Protects offscreen, hidden, micro-dimension, or coordinate-displaced canvases (`left: -9999px`) via deterministic FNV-1a origin seeds. Employs `WeakSet` tracking to guarantee 100% session stability across repeated calls, while leaving legitimate user-facing canvases (charts, games, drawing apps) completely untouched.
* **WebGL & WebGL2 Herd Blending:** Masks unmasked vendor (`Google Inc.`) and renderer (`ANGLE Intel UHD`) parameters while preserving native 3D texture limits.
* **Audio Fingerprint Protection:** Applies bounded micro-shifts ($\pm 0.000005$) to `OfflineAudioContext.prototype.startRendering`, `AudioBuffer.prototype.getChannelData`, and `copyFromChannel` across early and full buffer slices. Ordinary real-time speaker playback is unmodified.
* **Native Camouflage (`makeNative`):** Preserves `Function.prototype.toString.name`, length, and `[native code]` representations, neutralizing CreepJS and BrowserLeaks prototype lie detectors.

### 3. Multi-Channel Telemetry Sanitizer
* **Transport Agnostic:** Intercepts `navigator.sendBeacon`, `window.fetch`, and `XMLHttpRequest` across JSON payloads, `URLSearchParams`, `FormData`, `Request` objects, and URL query strings.
* **Separation of Classification & Payload:** Inspects outgoing telemetry requests for high-entropy fingerprint tokens (`canvas`, `fingerprint`, `fp`, `webgl`, `audio`, `device_id`, `visitorId`) and neutralizes them to `[SANITIZED_BY_VIGIL]`, even when sent to opaque or CNAME-cloaked endpoints, while allowing legitimate business requests (orders, profiles, carts) to pass through intact.

### 4. Live Cookie & Tracker Forensics (Cookies Tab)
* **Itemized Cookie Inventory:** Actively discovers and lists every cookie stored on the site, including secure `HttpOnly` cookies.
* **Plain-English Knowledge Base:** Powered by a built-in dictionary of 100+ known web cookie patterns to explain what each cookie does (Google Analytics, Facebook Pixel, Cloudflare Bot Shield, session tokens).
* **Category Breakdown & Security Flags:** Sorts cookies into **Safe/Essential**, **Analytics**, **Marketing (Ads)**, and **Functional**, displaying `🔒 HTTPS Secure`, `🛡️ HttpOnly`, and expiration flags.
* **Third-Party Embedded Trackers:** Lists external tracking scripts, iframes, and beacons loaded by the page.

### 5. Deep Terms & Conditions Audit (Terms Tab)
* **Automated Footer Policy Discovery:** Automatically discovers legal documents linked across page footers (*Terms of Service*, *Privacy Policy*, *Cookie Policy*, *Website Policies*, *Disclaimers*).
* **13-Dimensional Legal Classifier:**
  1. Data Collection & Personal Information
  2. Data Sharing & Third-Party Disclosure
  3. Commercial Data Sale (with Negation Defense: *"We do not sell"*)
  4. Disclosed Cookies & Tracking Pixels
  5. Mandatory Binding Arbitration & Court Waivers
  6. Class Action Lawsuit Waivers
  7. AI / Machine Learning Model Training on User Data
  8. Data Retention & Indefinite Storage Terms
  9. Children's Privacy Policies (COPPA / DPDP)
  10. Government & Law Enforcement Disclosure Terms
  11. Unilateral Terms Modification & Termination
  12. Broad Warranty & Liability Disclaimers
  13. User Data Access & Deletion Rights
* **Exact Excerpts & "Locate on Page":** Displays exact verbatim source passages with one-click page highlighting.

---

## Project Structure

```text
Browex/
├── HOW_TO_USE.txt           # Windows Notepad quick-start guide for non-developers
├── Backend/                 # (Optional) High-concurrency Go / serverless proxy layer
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
│   │   ├── network/         # Cookie classifier, tracker statistics
│   │   ├── popup/           # React 18 / Tailwind CSS extension popup UI
│   │   │   ├── components/  # CookieInventoryView, LegalAuditView, TrustScoreGauge
│   │   │   └── hooks/       # usePermissionState, useStorageState
│   │   ├── shared/          # Types, storage mutex (AsyncMutex), constants
│   │   └── threat-intel/    # Local heuristic threat engine & canonicalizer
│   ├── manifest.json        # Extension Manifest V3 configuration
│   ├── package.json         # Dependencies and build scripts
│   └── vite.config.ts       # Rollup bundle configuration (defender & popup)
├── tests/
│   ├── adversarial/         # Local HTTP test server and hostile HTML fixtures
│   │   └── server.js        # Node test server with telemetry sink endpoints
│   └── browser/             # Playwright E2E browser acceptance & adversarial suite
│       ├── defender.audio.spec.ts
│       ├── defender.canvas.spec.ts
│       ├── defender.cname.spec.ts
│       ├── defender.evasion.spec.ts
│       ├── defender.hardware.spec.ts
│       ├── defender.race.spec.ts
│       ├── defender.regression.spec.ts
│       ├── defender.telemetry.spec.ts
│       ├── defender.webgl.spec.ts
│       └── fingerprint.spec.ts
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
Build output is generated cleanly into `Frontend/dist/` in under 3 seconds.

### 2. Load into Chromium Browser
1. Open your browser and navigate to `chrome://extensions/` (or `brave://extensions/`).
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `D:\Browex\Frontend\dist` directory.
5. Vigil is now active and protecting your browser!

---

## Test Verification & Evidence Ledger

All verification complies with **Vigil Master QA/QC Protocol v5.0.0**:

### Unit Test Suite (Vitest) — 27 / 27 Passing (1.95s)
```bash
cd Frontend
npm test
```
```text
✓ src/network/cookie-classifier.test.ts    (4 tests) — Google, Meta, Cloudflare, Session classification
✓ src/legal-auditor/tosdr-consent.test.ts  (5 tests) — 5-fold behavioral privacy consent
✓ src/legal-auditor/classifier.test.ts     (4 tests) — Negation preservation, arbitration, data sale
✓ src/correlation/grade.test.ts            (3 tests) — Reputation grade clamping
✓ src/correlation/correlate.test.ts        (2 tests) — Penalty aggregation & moral hazard
✓ src/content-scripts/resilience.test.ts   (2 tests) — Non-standard pseudo-selector resilience
✓ src/threat-intel/engine.test.ts          (5 tests) — Typosquatting, Homoglyphs, Malformed URLs
✓ src/shared/storage.concurrency.test.ts   (2 tests) — AsyncMutex 50-worker lost-update elimination
```

### Browser E2E Adversarial Suite (Playwright) — 13 / 13 Passing (7.70s)
Executes directly against local adversarial test harnesses in real Chromium:
```bash
# Terminal 1: Start the local adversarial test server
cd D:\Browex
node tests/adversarial/server.js

# Terminal 2: Run the Playwright adversarial suite
cd D:\Browex\tests\browser
npx playwright test
```
```text
ok  1 [chromium] defender.audio.spec.ts       — OfflineAudioContext & AudioBuffer perturbation consistency
ok  2 [chromium] defender.canvas.spec.ts      — Offscreen probe mitigation & visible canvas non-interference
ok  3 [chromium] defender.cname.spec.ts       — Subdomain cloaking detection vs first-party traffic
ok  4 [chromium] defender.evasion.spec.ts     — Opaque endpoint paths and nested/mixed-case payloads
ok  5 [chromium] defender.hardware.spec.ts    — 8C/8GB/24b normalization, descriptor & CreepJS lie checks
ok  6 [chromium] defender.race.spec.ts        — Dynamic iframes, inline evaluation, and SPA navigation
ok  7 [chromium] defender.regression.spec.ts  — Canvas paths, WebGL shader compilation, forms, standard fetch
ok  8 [chromium] defender.telemetry.spec.ts   — sendBeacon, fetch, and XHR across JSON, URLSearchParams, queries
ok  9 [chromium] defender.webgl.spec.ts       — WebGL 1 & 2 vendor/renderer masking while preserving 3D limits
ok 10 [chromium] fingerprint.spec.ts: STAGE A — Dynamic MAIN-world defender registration
ok 11 [chromium] fingerprint.spec.ts: STAGE B — Standalone defender mitigates early canvas probes
ok 12 [chromium] fingerprint.spec.ts: STAGE B2— Cross-API mitigation covers toDataURL and getImageData
ok 13 [chromium] fingerprint.spec.ts: STAGE B3— Hardware persona stealth & native prototype lie checks
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

---

## Maintainer & Contact

* **Lead Developer:** Atharv ([@ath9rv](https://github.com/ath9rv))
* **Contact & Inquiries:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com)
* **GitHub Repository:** [https://github.com/ath9rv/Vigil.git](https://github.com/ath9rv/Vigil.git)
