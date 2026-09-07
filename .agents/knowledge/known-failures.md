# Vigil Known Failures & Lessons Learned

This document is project memory for recurring failure patterns. If you encounter similar symptoms, refer to this memory before reinventing the wheel.

## 1. Stale Findings from SPA Navigations

**Symptom**: 
On single-page applications (SPAs), findings would sometimes attribute to the wrong URL after a rapid client-side navigation.

**Cause**: 
Scanners (like M1) were running async checks that completed *after* the navigation state had changed, but they reported the finding against the context they were launched in.

**Resolution**: 
Enforced the `navigationId` guard. `navigation-state.ts` tracks the current active navigation per tab. The `message-router.ts` drops any incoming observation where the `navigationId` does not match the active navigation.

**Regression Test**: 
`trust-engine.test.ts` → "Navigation A events → B starts → late A events: A events discarded"

## 2. Confidence Inflation from Duplicate DOM Events

**Symptom**:
A single tracking element on the page caused the trust score to plummet disproportionately.

**Cause**:
React hydration or minor DOM shuffling caused the `dom-observer` to see the "same" element multiple times (e.g., node removed and re-inserted). Each time, it fired an event, leading to multiple identical `RawObservation`s.

**Resolution**:
Idempotent deduplication in the `TrustEngine`. It hashes the observation payload and ignores identical consecutive evidence within the same navigation budget.

## 3. Cross-Site Requests Flagged as Data Sales

**Symptom**:
A standard cross-origin script tag (e.g., loading React from a CDN) triggered a `DATA_SALE` or `THIRD_PARTY_DATA_SHARING` verdict.

**Cause**:
The engine previously equated "request to third party" with "sharing user data".

**Resolution**:
Split the `shares_personal_information` claim into a base `cross_site_transmission` claim. To escalate to `shares_personal_information`, the network interceptor MUST find explicit evidence of an identifier or PII in the payload, query string, or cookies.

## 4. ES Module Export Leak in MAIN-World Defender Script

**Symptom**:
`defender.js` fails silently or throws `SyntaxError: Unexpected token 'export'` when injected via `chrome.scripting.registerContentScripts` or `page.addInitScript`.

**Cause**:
`inject-defender.ts` exported runtime variables (e.g. `export let DefenderInternals = ...`), causing Rollup/Vite to output ES module `export` statements in a classic non-module content script.

**Resolution**:
Removed runtime exports from `inject-defender.ts`. The script is bundled as a pure IIFE that publishes internals to `window.__VIGIL_DEFENDER_INTERNALS__` for test inspection without emitting module syntax.

## 5. Prototype vs Instance Property Definition in Browser Fingerprint Defense

**Symptom**:
`navigator.hardwareConcurrency` returns actual hardware core count instead of normalized persona value (8), failing CreepJS prototype lie checks.

**Cause**:
Properties defined directly on `targetNav` instance shadow but do not replace prototype getters, which are inspected directly via `Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), ...)`.

**Resolution**:
Defined hardware getters (`hardwareConcurrency`, `deviceMemory`, `colorDepth`, `pixelDepth`) on `Object.getPrototypeOf(target)` first, falling back to instance properties if prototype definition is restricted.
