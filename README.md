# VIGIL — Cognitive Firewall & Autonomous Privacy Shield

[![Release](https://img.shields.io/badge/Release-v2.1.0--rc.1-00E5FF.svg)](docs/release/V2.1-RC1-CERTIFICATION.md)
[![Certification](https://img.shields.io/badge/QA%20Certification-Passed-00E676.svg)](docs/release/V2.1-RC1-CERTIFICATION.md)
[![Manifest V3](https://img.shields.io/badge/Chromium-MV3%20Compliant-FFD600.svg)](Frontend/manifest.json)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero--Telemetry-purple.svg)](PRIVACY.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> **Vigil** is an open-source, client-side cognitive firewall and autonomous browser trust shield for Chromium (Manifest V3). It neutralizes deceptive commerce (dark patterns), stops browser fingerprinting, reverse-engineers cookie behavioral DNA, audits predatory legal terms, and sanitizes tracking telemetry—**100% locally with zero cloud telemetry or personal data leakage**.

📘 **Quick Start in 30 Seconds:** Open [`HOW_TO_USE.txt`](HOW_TO_USE.txt) in any text editor for simple, step-by-step setup instructions!

---

## 1. What Vigil Is

Vigil is an active defensive layer embedded directly into the browser runtime. Rather than functioning as a passive, static list of blocked domains, Vigil monitors DOM structures, network telemetry, cookie lifecycles, and legal policies dynamically. It protects users from subtle cognitive manipulation, manipulative checkout urgency, and intrusive fingerprinting while rigorously ensuring the underlying website remains functional and visually intact.

---

## 2. Why It Exists

The modern web is fraught with covert cognitive traps:
* **Deceptive Commerce:** Artificial scarcity, looping countdown clocks, hidden subscription opt-ins, and drip pricing designed to induce panic purchases.
* **Stealth Fingerprinting:** Advanced canvas perturbation probes, WebGL shader compilation timing, and hardware inspection scripts tracking users across sessions without cookies.
* **Predatory Legal Contracts:** Multi-page Terms of Service contracts concealing forced binding arbitration, class action waivers, unilateral price change clauses, and AI training rights over user data.
* **Aggressive Tracking Networks:** Third-party ad beacons disguised via first-party subdomains (CNAME cloaking) and ubiquitous tracking parameters appended to shared URLs.

Traditional extensions either rely on easily bypassed static blocklists or naively delete page elements—breaking checkouts and causing broken layouts. Vigil was built to provide **verifiable, safe, and autonomous client-side defense**.

---

## 3. Core Capabilities

* **🧬 Behavioral Cookie DNA Engine:** Evaluates the Shannon entropy, cross-site recurrence, security flags (`Secure`, `HttpOnly`, `SameSite`), and cryptographic JWT signatures of active cookies to distinguish genuine auth sessions from tracking IDs.
* **🛡️ DOM & Deceptive Pattern Scanner:** Inspects Shadow DOMs and standard DOM subtrees across 5 specialized modules:
  * *M1: Deceptive Commerce* (False urgency, drip pricing, hidden fees)
  * *M2: Threat Shield* (Typosquatting, credential harvesting on unverified domains)
  * *M3: Privacy Consent* (Hidden or suppressed "Reject All" buttons)
  * *M4: Attention Addiction* (Infinite scroll traps, notification hijacking)
  * *M5: Social Proof* (Manufactured viewer counts, deceptive activity tickers)
* **⚖️ 19-Dimensional Legal Auditor:** Offline NLP/heuristic parser that categorizes clauses across 19 critical risk vectors (arbitration, data sale, liability caps) with negation precision, featuring a 1-click "Locate on Page" yellow highlighter.
* **🕶️ MAIN-World Stealth Camouflage (`defender.js`):** Perturbs Canvas and WebGL parameters while cloaking prototype methods using `makeNative`, ensuring third-party anti-fingerprint detectors (e.g. CreepJS) observe standard `[native code]` representations without raising "Lie Detected" flags.
* **⚡ Declarative Network Shield (DNR):** Built-in rulesets blocking over 100 tracking networks, stripping URL tracking parameters (`utm_source`, `fbclid`, `gclid`), and upgrading HTTP connections to HTTPS.

---

## 4. Architecture: The Two Locked Invariants

Vigil separates detection from intervention via two foundational invariants:

```text
       INVARIANT 1                                 INVARIANT 2
┌─────────────────────────┐                 ┌─────────────────────────┐
│ Detection Authority     │                 │ Evidence                │
│           ≠             │                 │    ≠                    │
│ Mutation Authority      │                 │ Intent                  │
└─────────────────────────┘                 └─────────────────────────┘
```

1. **Detection Authority ≠ Mutation Authority:**
   Identifying a suspicious pattern grants *zero* intrinsic right to modify the DOM. Every action must be independently authorized by a Safety Plane that evaluates the element's structural **Blast Radius** (form presence, clickable density, layout centrality).
2. **Evidence ≠ Intent:**
   Raw DOM changes are registered as immutable facts (`RawObservation`). Interpretations are treated as hypotheses. Vigil explicitly logs rejected counter-inferences, preventing false accusations on legitimate timers (e.g., banking timeouts or live ticket sales).

### Pipeline Flow

```text
  OBSERVE                  DECIDE                   ACT                  GOVERN
┌──────────────┐         ┌──────────────┐         ┌──────────────┐     ┌────────────────┐
│ Scanners     │         │ TrustEngine  │         │ Two-Axis Gate│     │ Differential   │
│ & Monitors   ├──►-►-►──│ Ingestion &  ├──►-►-►──│ & Atomic     ├──►──│ Health Check   │
│ (Raw Facts)  │         │ Graph Index  │         │ Transaction  │     │ & Explain Mode │
└──────────────┘         └──────────────┘         └──────────────┘     └────────────────┘
```

---

## 5. Protection Modes

Users can tailor Vigil's posture to their browsing preferences:

| Mode | Observation & Graph | DOM Mutation | Differential Check | Intended Use |
| :--- | :---: | :---: | :---: | :--- |
| **`ACTIVE`** (Default) | ✅ Enabled | ✅ Authorized `SAFE` + `CAUTIOUS` | ✅ Enforced with rollback | Full autonomous defense |
| **`SAFE_ONLY`** | ✅ Enabled | ✅ Only `SAFE` (Blast Radius $<0.2$) | ✅ Enforced with rollback | Conservative browsing |
| **`OBSERVE_ONLY`** | ✅ Enabled | ❌ **Disabled** (Dry Run) | ℹ️ Diagnostic only | Auditing without changes |
| **`OFF`** | ❌ Disabled | ❌ **Disabled** | ❌ Disabled | Bypassed globally |

---

## 6. Explain Mode & 1-Click Restore

Vigil makes every decision fully explainable. Through the **Explain Mode** interface:
* **Why Vigil Acted:** Plain-English breakdown showing exact observed facts and the evaluated blast radius score.
* **What Vigil Did NOT Conclude:** Transparent ledger of rejected counter-hypotheses.
* **1-Click Restore:** If an intervention disrupts a user workflow, clicking "Restore Original" immediately rolls back all applied DOM changes to their pre-intervention snapshot.

---

## 7. How Detection Works

Detection runs asynchronously within bounded CPU budgets ($<30$ms per scan):
1. Content script scanners monitor the page using a throttled `MutationObserver` event bus.
2. Elements matching declarative rule patterns are evaluated against contextual exemptions (e.g. `data-auction-end`, security session attributes).
3. Findings are enriched with cryptographic provenance hashes and pushed to the background `TrustEngine`.
4. Ingestion is bounded to `MAX_NODES_PER_NAVIGATION = 500` nodes to guarantee zero memory leaks on single-page applications.

---

## 8. How Intervention Works

When an element is flagged for potential intervention:
1. **Blast Radius Estimation:** Evaluates form tags, button counts, input fields, and layout criticality.
2. **Two-Axis Authorization Gate:** Both Detection Confidence (`HIGH` or `MODERATE`) and Structural Safety (`SAFE` or `CAUTIOUS`) must permit mutation.
3. **Atomic Transaction (`InterventionTransaction`):** Captures a baseline snapshot of styles and attributes.
4. **Differential Comparator:** Checks post-mutation health ($\Delta \text{Errors} = 0$, clickable element stability). If an anomaly is detected, the transaction triggers an **immediate causal rollback**.

---

## 9. Privacy Model

* **100% Local Execution:** All heuristic classification, legal analysis, and threat parsing occur inside the user's browser memory.
* **Zero Telemetry:** No remote analytics, tracking beacons, error reporters (e.g. Sentry), or external logging endpoints.
* **Zero Secret Storage:** The extension requires no cloud API keys or user accounts.
* For full policy details, see [`PRIVACY.md`](PRIVACY.md) and [`docs/security/telemetry-privacy.md`](docs/security/telemetry-privacy.md).

---

## 10. Installation

### From Pre-Built Package
1. Clone or download this repository.
2. Open Chromium (Chrome, Brave, Edge, or Opera) and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** (top-left button).
5. Select the `Frontend/dist` folder inside the cloned repository.

---

## 11. Development Workflow

### Prerequisites
* **Node.js**: `v20.x` or `v24.x`
* **NPM**: `v10.x` or `v11.x`

### Setup & Build Commands (from Repository Root)
```bash
# Install extension dependencies
npm install --prefix Frontend

# Install browser testing dependencies
npm install --prefix tests/browser

# Compile TypeScript and bundle production extension (output: Frontend/dist)
npm run build

# Run TypeScript typecheck across all modules
npm run typecheck
```

---

## 12. Automated Testing

All verification is automated and reproducible directly from the repository root:

```bash
# Run Vitest unit & integration test suites (51 suites, 337+ tests)
npm test

# Run Playwright browser acceptance suite (13 tests in live Chromium)
npm run test:browser

# Run the complete test battery
npm run test:all
```

For detailed methodologies and scenario breakdowns, see [`docs/testing/methodology.md`](docs/testing/methodology.md) and [`docs/release/V2.1-RC1-CERTIFICATION.md`](docs/release/V2.1-RC1-CERTIFICATION.md).

---

## 13. Project Structure

```text
Vigil/
├── docs/                           # Documentation suite
│   ├── README.md                   # Navigational documentation router
│   ├── architecture/
│   │   ├── current/                # Production architecture & runtime specs
│   │   └── historical/             # Foundational requirements & design specs
│   ├── release/                    # RC1 certification & phase milestone ledgers
│   ├── security/                   # Zero-telemetry & privacy audit documentation
│   └── testing/                    # Test architecture & QA methodology
├── Frontend/                       # Chromium extension package (Manifest V3)
│   ├── calibration/                # Empirical calibration test corpus
│   ├── dist/                       # Compiled production bundle
│   ├── public/                     # Static icons and assets
│   ├── rules/                      # Declarative Net Request (DNR) JSON rulesets
│   ├── src/
│   │   ├── background/             # MV3 background service worker & message router
│   │   ├── certification/          # RC1 lifecycle, self-protection & corpus suites
│   │   ├── content-scripts/        # DOM scanners, CMP handler, urgency neutralizer
│   │   ├── evidence/               # TrustEngine, EvidenceGraph, temporal correlator
│   │   ├── intervention/           # Blast radius, transaction engine, comparator
│   │   ├── legal-auditor/          # 19-dimensional legal parser & negation engine
│   │   ├── network/                # Behavioral Cookie DNA & tracker statistics
│   │   ├── observability/          # Performance governor & priority task scheduler
│   │   ├── popup/                  # React 18 popup UI & Explain Mode components
│   │   ├── shared/                 # Shared types, constants, and AsyncMutex storage
│   │   └── threat-intel/           # Local typosquatting & homoglyph heuristic engine
│   ├── manifest.json               # Chromium extension manifest
│   ├── package.json                # Extension package configuration
│   └── vite.config.ts              # Vite + CRXJS build configuration
├── tests/
│   ├── adversarial/                # Local fixture server for live E2E scenarios
│   └── browser/                    # Playwright Chromium test scenarios
├── CHANGELOG.md                    # Keep-a-Changelog release log
├── CONTRIBUTING.md                 # Contributor guidelines and architecture rules
├── HOW_TO_USE.txt                  # Quick-start walkthrough for text editors
├── LICENSE                         # Apache 2.0 License
├── package.json                    # Root workspace developer scripts
├── PRIVACY.md                      # Zero-telemetry privacy policy
├── SECURITY.md                     # Vulnerability disclosure policy
└── .gitignore                      # Git ignore patterns
```

---

## 14. Known Limitations

* **Closed Shadow DOMs:** Browsers restrict content script access to closed shadow roots by design. Vigil inspects all open shadow roots and fallback DOM trees.
* **Canvas-Rendered UIs:** Non-DOM applications (e.g. web games rendered on a single canvas element) cannot have text elements inspected via standard DOM queries.
* **Offline First:** Vigil avoids querying external cloud reputation APIs for privacy; novel zero-day domains rely on local heuristic detection.

---

## 15. Security & Responsible Disclosure

We treat security and privacy vulnerabilities with utmost priority. For confidential vulnerability reporting, response SLAs, and supported versions, refer to [`SECURITY.md`](SECURITY.md).

---

## 16. License

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) for terms.
