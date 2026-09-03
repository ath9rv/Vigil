# VIGIL — Cognitive Firewall & Autonomous Privacy Shield

[![Protocol v5.0.0 Ratified](https://img.shields.io/badge/QA%2FQC%20Standard-Protocol%20v5.0.0-00E5FF.svg)](#governance--qaqc-standard)
[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-113%2F113%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![Browser Acceptance](https://img.shields.io/badge/Playwright%20E2E-13%2F13%20Passing-00E676.svg)](#test-verification--evidence-ledger)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chromium-MV3%20Compliant-FFD600.svg)](#architecture)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero--Telemetry-purple.svg)](PRIVACY.md)

> **Vigil** is an advanced open-source, client-side browser extension engineered to neutralize deceptive commerce (dark patterns), reverse-engineer cookie behavioral DNA, parse complex legal terms with zero false-positives, and sanitize stealth browser fingerprinting—without ever collecting or transmitting your personal browsing data.

📘 **New to Vigil?** Open [`HOW_TO_USE.txt`](HOW_TO_USE.txt) in Windows Notepad for a simple, 30-second quick-start walkthrough!

---

## 🚀 The Three Core Pillars of Vigil

Vigil abandons the traditional "static blocklist" approach to privacy. Instead, it operates using three highly advanced local engines:

### 1. 🧬 Behavioral Cookie DNA Engine
Unlike basic tools that rely on lists of known cookie names, Vigil treats browser storage like genetic material.
* **Structural Forensics:** Extracts the Shannon Entropy of cookie values to differentiate between benign preference flags and unique tracker IDs.
* **Lifespan & Persistence:** Calculates cross-site recurrence and long-term persistence tracking.
* **Security & Access Flags:** Detects dangerous network transmissions, heavily penalizing `SameSite=None` cookies that lack the `Secure` flag.
* **Auth Safeguards:** Identifies cryptographic JWT signatures and HTTP-only protections to guarantee zero false positives on legitimate login sessions.

### 2. ⚖️ 19-Dimensional Legal Auditor
Vigil acts as your personal, automated paralegal. It actively discovers Terms of Service and Privacy Policies in page footers and scans them for predatory clauses.
* **Precision Negation Engine:** Understands context. It knows the difference between *"We reserve the right to sell your data"* (WARNING) and *"We do not sell your data"* (FAIR).
* **The "Nitpicker" Upgrade:** Scans for 19 specific legal traps, including:
  * Extreme **Indemnification** (forcing you to pay their legal fees).
  * **Unilateral Price Changes** and **Auto-Renewal** traps.
  * **Forced Arbitration**, **Class Action Waivers**, and offshore **Governing Law**.
  * **AI / LLM Training** on your private messages.
* **"Locate on Page":** Automatically scrolls the window and physically highlights the offending legal clause in bright yellow directly on the screen.

### 3. 🛡️ DOM & Dark Pattern Scanner
Websites use psychological tricks to manipulate your behavior. Vigil's scanner pierces through complex web architecture (including Shadow DOMs) to expose these traps.
* **Deceptive Commerce (M1):** Detects fake countdown timers (False Urgency), pre-checked insurance boxes (Basket Sneaking), hidden post-selection fees (Drip Pricing), and subscription traps.
* **Privacy Consent (M3):** Warns you when "Reject All" buttons are visually suppressed (opacity lowered) to force you into accepting tracking cookies.
* **Social Proof (M5):** Identifies fake herd-mentality metrics ("15 people are looking at this room") and hidden "Sponsored" ad labels.
* **Threat Shield (M2):** Detects domain typosquatting (e.g., `amozon.com`) and flags credential-stealing phishing forms.

---

## 🏗️ Architecture Overview

Vigil operates strictly within the Chromium Manifest V3 sandbox, ensuring high performance without memory leaks or page slowdowns.

```text
                               THE VIGIL ARCHITECTURE PIPELINE
                                              │
      ┌───────────────────────────────────────┼───────────────────────────────────────┐
      ▼                                       ▼                                       ▼
[NETWORK LAYER (DNR)]               [PAGE EXECUTION WORLDS]                 [BACKGROUND WORKER]
├── Multi-Channel Telemetry         ├── MAIN World: defender.js             ├── Service Worker Event Loop
│   Sanitizer (Stripping IDs)       │   (Hardware Persona, Canvas, WebGL)   ├── AsyncMutex Storage Serializer
├── Cookie & Network Observer       ├── ISOLATED World: content-scripts     ├── Reputation & Correlation Engine
│   (Behavioral DNA Engine)         │   (Dark Patterns, Threat Shield)      ├── Local Threat Heuristic Engine
└── HTTPS Upgrade Enforcer          └── Shadow DOM: ambient-shield.ts       └── Legal SLM Classifier
```

### The Moral Hazard Cap
Vigil features a dual-grading system (**Reputation Grade** and **Protected Grade**). However, it operates under a strict Moral Hazard Cap. If a site is actively phishing or hosting severe deceptive forms, Vigil will *never* give it a good grade, even if it successfully blocked the trackers. Phishing sites are hard-capped at an **F**.

---

## 🛠️ Developer Setup & Installation

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

## 🧪 Test Verification & Evidence Ledger

All verification complies with **Vigil Master QA/QC Protocol v5.0.0**. Vigil is built on a strict **zero false-positive** philosophy.

### Unit Test Suite (Vitest) — 113 / 113 Passing (0.92s)
```bash
cd Frontend
npm test
```
```text
✓ src/legal-auditor/classifier.test.ts     (20 tests) — 19-Dimensional Legal Traps & Negation Precision
✓ src/network/cookie-classifier.test.ts    (9 tests)  — Google, Meta, Cloudflare, Session classification
✓ src/network/behavioral-dna.test.ts       (10 tests) — Entropy, cross-site, transmission flag scoring
✓ src/correlation/grade.test.ts            (7 tests)  — Reputation grade clamping and moral hazard
✓ src/content-scripts/scanner-rules.test.ts(8 tests)  — DOM manipulation & dark pattern heuristics
✓ src/legal-auditor/tosdr-consent.test.ts  (5 tests)  — 5-fold behavioral privacy consent
✓ src/threat-intel/engine.test.ts          (5 tests)  — Typosquatting, Homoglyphs, Malformed URLs
✓ src/shared/storage.concurrency.test.ts   (2 tests)  — AsyncMutex 50-worker lost-update elimination
... and more (19 suites total)
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

## ⚖️ License & Security

* **License:** Licensed under the [Apache License, Version 2.0](LICENSE).
* **Security:** For vulnerability disclosure guidelines, see [SECURITY.md](SECURITY.md).
* **Privacy:** For details on our zero-telemetry architecture, see [PRIVACY.md](PRIVACY.md).

---

## 📬 Maintainer & Contact

* **Lead Developer:** Atharv ([@ath9rv](https://github.com/ath9rv))
* **Contact & Inquiries:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com)
* **GitHub Repository:** [https://github.com/ath9rv/Vigil.git](https://github.com/ath9rv/Vigil.git)
