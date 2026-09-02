# Vigil Frontend Extension

This directory contains the complete Chromium Manifest V3 browser extension for **Project Vigil**.

## Directory Structure

```text
Frontend/
├── dist/                # Production distribution output (Vite + Rollup)
├── public/              # Static assets and icons (16x16, 48x48, 128x128)
├── rules/               # Static JSON detection rulesets
│   ├── cookie_consent_rules.json   # CMP selectors (OneTrust, Cookiebot, etc.)
│   ├── https_upgrades.json         # DNR automatic HTTPS upgrade rules
│   ├── m1_deceptive_commerce.json  # Dark pattern rules (drip pricing, hidden cancel)
│   ├── m2_threat_shield.json       # Structural phishing detection rules
│   ├── m3_privacy_consent.json     # Pre-checked consent & tracking indicators
│   ├── m4_attention_addiction.json # Infinite scroll & attention trapping rules
│   ├── m5_social_proof.json        # Fake urgency & fabricated activity rules
│   ├── tracker_blocklist.json      # DeclarativeNetRequest blocklist (100+ domains)
│   └── url_sanitizer.json          # DNR query parameter stripper (29 tracking params)
├── src/
│   ├── background/      # Service worker entry, message routing, live threat verification
│   ├── content-scripts/ # DOM scanner, ambient shield, cookie consent, inject-defender
│   ├── correlation/     # Reputation scoring algorithms (grade.ts, correlate.ts)
│   ├── legal-auditor/   # Negation-aware legal SLM classifier & ToS;DR API client
│   ├── popup/           # React 18 / Tailwind CSS popup user interface
│   ├── shared/          # Types, AsyncMutex storage serialization, constants
│   └── threat-intel/    # Offline heuristic threat engine (typosquatting, homoglyphs)
├── manifest.json        # Manifest V3 configuration
├── package.json         # Build toolchain & dependencies
└── vite.config.ts       # Rollup bundle configuration
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run build` | Runs `tsc` typechecking and bundles the extension into `dist/`. |
| `npm test` | Runs all 23 Vitest unit tests across 7 test suites. |
| `npm run dev` | Runs Vite in development mode with HMR. |

## Build Architecture

Vigil uses Vite with `@crxjs/vite-plugin` and customized Rollup inputs:
1. **`popup` chunk:** React 18 single-page application rendered in the browser toolbar popup.
2. **`defender` chunk (`dist/defender.js`):** Standalone IIFE bundle designed to execute in the Chromium `MAIN` execution world at `document_start` to intercept Canvas and WebGL fingerprinting probes before page scripts load.
3. **`index` content script:** Lightweight observer executing in the `ISOLATED` world at `document_idle`.
4. **`service-worker`:** Background event worker handling IPC messages and atomic state updates via `AsyncMutex`.

## Adding or Modifying Detection Rules

All declarative rules are stored in `Frontend/rules/`:
* Use standard CSS selectors. Do **not** use non-standard jQuery or Playwright pseudo-selectors like `:contains()` or `:has-text()`.
* Every rule requires a unique `id`, `name`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `INFO`), and `match` specification.
* Validate all rule edits by running `npm test` (`resilience.test.ts` will verify syntax validity).
