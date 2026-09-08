<div align="center">

# 🛡️ VIGIL

### Your browser, with receipts.

[![Release](https://img.shields.io/badge/Release-v2.1.0--rc.1-00E5FF.svg)](docs/release/V2.1-RC1-CERTIFICATION.md)
[![Tests](https://img.shields.io/badge/Tests-370%2F370%20Passing-00E676.svg)](#automated-testing)
[![Manifest V3](https://img.shields.io/badge/Chromium-Manifest%20V3-FFD600.svg)](Frontend/manifest.json)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-Zero-purple.svg)](PRIVACY.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**An open-source cognitive firewall for Chromium that detects dark patterns, neutralizes fingerprinting, reverse-engineers cookie DNA, and audits predatory legal terms — 100% on-device, zero cloud telemetry.**

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Privacy Model](#privacy-model) · [Contributing](CONTRIBUTING.md)

</div>

---

## The Problem

The modern web is an adversarial environment:

- **Dark patterns** manufacture fake urgency, hide fees inside checkout flows, and pre-tick subscription traps.
- **Fingerprinting scripts** track you across sessions without cookies using Canvas, WebGL, AudioContext, and hardware enumeration.
- **Predatory legal terms** bury forced arbitration clauses, class-action waivers, and blanket AI training rights inside 40-page ToS contracts nobody reads.
- **Tracker networks** disguise themselves via CNAME cloaking and first-party subdomain tricks to evade traditional blocklists.

Traditional extensions either rely on static blocklists (easily bypassed) or naively delete page elements (breaking checkouts and layouts). Vigil was built to do better.

---

## What Vigil Does

| Layer | Capability | How |
|:---:|:---|:---|
| 🧬 | **Behavioral Cookie DNA** | Measures Shannon entropy, JWT structure, cross-site recurrence, and security flags to distinguish auth sessions from tracking IDs |
| 🛡️ | **5-Module Dark Pattern Scanner** | Detects deceptive commerce (M1), typosquatting & credential theft (M2), suppressed consent (M3), attention addiction (M4), and manufactured social proof (M5) across DOM and Shadow DOM |
| ⚖️ | **19-Dimension Legal Auditor** | Offline NLP engine parsing arbitration, data sale, liability, AI training, and 15 more risk vectors with negation precision — then highlights the exact clause on the page |
| 🕶️ | **Stealth Anti-Fingerprinting** | MAIN-world `defender.js` perturbs Canvas/WebGL/Audio readbacks while passing CreepJS native-code lie detection checks |
| ⚡ | **Declarative Network Shield** | 100+ tracker domains blocked, URL tracking params stripped (`utm_*`, `fbclid`, `gclid`), HTTP→HTTPS upgrades — all via Chrome's native DNR engine |
| 🔒 | **WebRTC IP Leak Protection** | Forces `default_public_interface_only` policy to prevent STUN/ICE local IP discovery through VPN tunnels |

---

## How It Works

Vigil separates **observation** from **action** through two locked architectural invariants:

```
  Detection Authority ≠ Mutation Authority
  Evidence ≠ Intent
```

Finding a suspicious element grants zero right to modify it. Every intervention must independently pass a structural safety gate.

```
  OBSERVE              DECIDE               ACT                GOVERN
┌──────────┐        ┌──────────┐        ┌──────────┐       ┌───────────┐
│ Scanners │──────► │ Trust    │──────► │ Two-Axis │─────► │ Differen- │
│ & Moni-  │        │ Engine & │        │ Gate &   │       │ tial DOM  │
│ tors     │        │ Evidence │        │ Atomic   │       │ Health    │
│          │        │ Graph    │        │ Transact │       │ Check     │
└──────────┘        └──────────┘        └──────────┘       └───────────┘
     ▲                                       │                   │
     │                                       ▼                   ▼
     │                                  1-Click Restore    Auto-Rollback
     └──────────────── Raw facts only, never conclusions ─────────┘
```

Every action is atomic, snapshotted, and reversible. If a post-intervention health check detects breakage, Vigil rolls back automatically.

---

## Quick Start

### Option A: Load Pre-Built Extension (30 seconds)

1. Clone this repository
2. Open `chrome://extensions/` in Chrome, Brave, or Edge
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select `Frontend/dist`
5. Pin Vigil to your toolbar

> 📘 See [`HOW_TO_USE.txt`](HOW_TO_USE.txt) for a detailed walkthrough with screenshots.

### Option B: Build From Source

```bash
# Install dependencies
npm install --prefix Frontend
npm install --prefix tests/browser

# Build production extension
npm run build

# Load Frontend/dist as unpacked in chrome://extensions/
```

**Requirements:** Node.js v20+ · npm v10+

---

## Protection Modes

| Mode | Scans | Intervenes | Rollback | Use Case |
|:---|:---:|:---:|:---:|:---|
| **Active** (default) | ✅ | ✅ Safe + Cautious | ✅ | Full autonomous defense |
| **Safe Only** | ✅ | ✅ Safe only | ✅ | Conservative browsing |
| **Observe Only** | ✅ | ❌ Dry run | ℹ️ Diagnostic | Audit without changes |
| **Off** | ❌ | ❌ | ❌ | Bypassed |

---

## Privacy Model

**Vigil is 100% on-device by default.** No browsing history, keystrokes, form inputs, or credentials ever leave your machine.

- **Zero analytics SDKs** — no Google Analytics, Mixpanel, Sentry, or PostHog
- **Zero tracking IDs** — no cross-device fingerprints or advertising identifiers
- **Zero background egress** — the extension makes no network requests during normal browsing
- **Explicit consent for optional features** — the ToS;DR crowdsourced legal lookup is off by default and gated by a non-bypassable call-site consent check before any network socket opens

Full details: [`PRIVACY.md`](PRIVACY.md) · Permission justifications: [`docs/security/CHROME_WEB_STORE_JUSTIFICATIONS.md`](docs/security/CHROME_WEB_STORE_JUSTIFICATIONS.md)

---

## Automated Testing

```bash
# 357 Vitest unit & integration tests (52 suites)
npm test

# 13 Playwright browser acceptance tests in live Chromium
npm run test:browser

# Full verification battery
npm run test:all
```

Test coverage includes adversarial mutation storms (10,000 mutations/s), cross-navigation evidence isolation, CreepJS lie detection bypass, CNAME cloaking resistance, and an 11-category real-world site compatibility corpus.

---

## Project Structure

```
Vigil/
├── Frontend/                    # Chromium extension (Manifest V3)
│   ├── src/
│   │   ├── background/          # Service worker, message router, fast-lane alerts
│   │   ├── content-scripts/     # DOM scanners, urgency neutralizer, defender
│   │   ├── evidence/            # TrustEngine, EvidenceGraph, temporal correlator
│   │   ├── intervention/        # Blast radius, transactions, auto-rollback
│   │   ├── legal-auditor/       # NLP classifier, ToS;DR client, ML pipeline
│   │   ├── network/             # Cookie DNA, behavioral scorer, tracker stats
│   │   ├── observability/       # Performance governor, scheduler, metrics
│   │   ├── popup/               # React 18 UI, onboarding, explain mode
│   │   └── shared/              # Types, constants, storage, URL security
│   ├── rules/                   # Declarative Net Request JSON rulesets
│   ├── dist/                    # Production build output
│   └── manifest.json
├── tests/
│   ├── browser/                 # Playwright E2E test scenarios
│   └── adversarial/             # Local HTTP fixture server
├── docs/                        # Architecture, release, security, testing docs
├── PRIVACY.md                   # Zero-telemetry privacy policy
├── SECURITY.md                  # Vulnerability disclosure policy
├── CONTRIBUTING.md              # Contributor guidelines
├── CHANGELOG.md                 # Release history
├── HOW_TO_USE.txt               # Plain-text quick start guide
└── LICENSE                      # Apache 2.0
```

---

## Known Limitations

- **Closed Shadow DOMs** — browsers restrict content script access to closed shadow roots by design
- **Canvas-rendered UIs** — non-DOM applications (e.g. WebGL games) cannot have text elements inspected
- **Offline-first** — Vigil avoids external reputation APIs for privacy; novel zero-day domains rely on local heuristic detection

---

## Security & Disclosure

We treat security vulnerabilities with utmost priority. See [`SECURITY.md`](SECURITY.md) for confidential reporting guidelines, response SLAs, and supported versions.

---

## License

Apache License 2.0 — see [`LICENSE`](LICENSE) for terms.

---

<div align="center">
<sub>Built with conviction that privacy tools should never become surveillance tools.</sub>
</div>
