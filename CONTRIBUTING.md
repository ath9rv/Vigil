# Contributing to Vigil

Thank you for your interest in contributing to **Vigil**. This document covers the architectural invariants every contribution must preserve, the development workflow, and testing requirements.

---

## Architectural Invariants

Every contribution must strictly preserve these properties:

1. **Zero-Telemetry** — Never introduce external analytics, tracking beacons, cloud telemetry, or remote logging. All analysis runs 100% locally.
2. **Detection ≠ Mutation** — Detecting a suspicious pattern never grants permission to modify the DOM. All mutations require Safety Plane authorization, atomic transactions, and differential health checks.
3. **Evidence ≠ Intent** — Raw observations and inferences are distinct types. Register rejected counter-hypotheses for all findings.
4. **Manifest V3 Least Privilege** — Do not request unnecessary permissions.
5. **Non-Bypassable Consent** — Any code path that could trigger an external network request must verify stored user consent at the call site, not just at the UI layer.
6. **Fail Closed** — Unknown or unhandled message types, malformed inputs, and unexpected states must produce explicit errors, never silent success.

---

## Development Setup

**Prerequisites:** Node.js v20+ · npm v10+ · Chrome, Brave, Edge, or Chromium

```bash
# Clone
git clone https://github.com/ath9rv/Vigil.git
cd Vigil

# Install extension dependencies
npm install --prefix Frontend

# Install browser test dependencies
npm install --prefix tests/browser
```

## Build & Test Commands

All commands run from the repository root:

```bash
npm run build        # TypeScript compile + Vite production bundle → Frontend/dist
npm run typecheck    # tsc --noEmit (zero errors required)
npm test             # Vitest: 52 suites, 357 tests
npm run test:browser # Playwright: 13 Chromium acceptance tests
npm run test:all     # Full verification battery
```

---

## Change Categories

| Category | Scope | Verification |
|:---|:---|:---|
| **A — Semantic-Neutral** | Docs, comments, test fixtures, tooling | Standard lint + unit tests |
| **B — Release-Affecting** | Manifest, service worker, content scripts, mutation logic, dependencies | Full test battery: Vitest + Playwright + clean build |

---

## Before Opening a PR

1. `npm test` — 100% green
2. `npm run test:browser` — 100% green
3. `npm run build` — zero TypeScript errors, clean Vite bundle
4. No machine-specific absolute paths in code or docs
5. All new external-facing functions have JSDoc comments

---

## Security Vulnerabilities

If you discover a security vulnerability or bypass, see [`SECURITY.md`](SECURITY.md) for confidential reporting guidelines.
