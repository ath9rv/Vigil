# Vigil — Phase 1 & Phase 2 Implementation Summary

## What Already Existed (Pre-Phase 1)

Vigil was a Chromium Manifest V3 browser extension with these working systems:

### 1. Dark Pattern Scanner (`scanner.ts`)
- Rule-based DOM scanning across 5 modules (M1-M5)
- Shadow DOM traversal via local `querySelectorAllDeep()`
- Detection: deceptive commerce, phishing, privacy violations, attention traps, social proof
- Per-rule deduplication to prevent false positives

### 2. Cookie Consent Handler (`cookie-consent-handler.ts`)
- Auto-detected 10 known CMPs: OneTrust, Cookiebot, TrustArc, Quantcast, Didomi, Usercentrics, CookiePro, Complianz, Termly, Generic_A
- Clicked "Reject All" or navigated manage/toggle/save flows
- Canary loop protection against infinite page reloads
- **Limitation**: Only used `document.querySelector()` — could NOT see inside Shadow DOM

### 3. Anti-Fingerprinting Defender (`inject-defender.ts`)
- Injected at `document_start` in MAIN world
- Hardware normalization: 8 CPU, 8GB RAM, 24-bit color
- Canvas 2D: small pixel perturbation via FNV-1a origin seed (static noise)
- WebGL: vendor/renderer masking to generic Intel profile
- Audio: ±0.000005 micro-shifts on OfflineAudioContext/AudioBuffer
- Telemetry: intercepts sendBeacon/fetch/XHR, strips fingerprint tokens
- Native function camouflage (beats CreepJS lie detection)
- **Limitation**: Passive noise — same small perturbation every session

### 4. Legal Auditor (`legal-auditor/`)
- Extracted and segmented ToS clauses
- 13-dimensional **keyword-based** classifier with negation preservation
- ToS;DR integration for community-curated ratings
- **Limitation**: Keyword matching only (`text.includes('arbitration')`)

### 5. Other Systems
- Ambient Shield (Shadow DOM alert system)
- Adversarial Observer (form submit interception, countdown detection)
- Network Layer (100+ tracker blocklist, URL sanitization, HTTPS upgrades, GPC header)
- Threat Intelligence (URL canonicalization, typosquatting detection)
- Background Service Worker (score aggregation, EMA smoothing, WebRTC protection)
- Popup UI (React 18 + Tailwind, trust score gauge, cookie inventory, legal audit view)

### Test Suite
- 27/27 Vitest unit tests passing
- 13/13 Playwright E2E tests passing

---

## What Was Implemented (Phase 1: Auto-Consent & Dark Pattern Auto-Bypass)

### 1.1 Shadow Root Traversal (`dom-utils.ts` — NEW)
- Created shared `querySelectorAllDeep()` that pierces open Shadow DOM boundaries
- BFS traversal: queues shadow roots, queries each, deduplicates results
- Added `querySelectorDeep()`, `safeQuerySelectorAllDeep()`, `safeQuerySelectorDeep()`, `collectButtonsDeep()`, `isInsideShadowRoot()`
- Updated `scanner.ts` to import from shared utility (removed duplicate)
- Updated `cookie-consent-handler.ts` to use shadow-piercing queries for ALL CMP detection

### 1.2 Heuristic DOM Engine (inside `cookie-consent-handler.ts` — REWRITTEN)
- **Phase A**: Known CMP detection (shadow-pierced)
- **Phase B**: Generic text pattern detection (shadow-pierced)
- **Phase C**: NEW heuristic engine for UNKNOWN CMPs:
  - Finds fixed/sticky overlay banners at top/bottom of viewport
  - Analyzes button visual weight: font size, opacity, font weight, color contrast
  - Estimates contrast ratio (WCAG formula) to detect deliberately hidden reject buttons
  - Scores buttons: reject > manage > accept; low-contrast buttons get bonus (dark pattern indicators)
  - Clicks the highest-scoring privacy-preserving option

### 1.3 Urgency Neutralization (`urgency-neutralizer.ts` — NEW)
- **Active** freeze/hide system (not just detection)
- `freezeElement()`: Sets opacity 0.3, pointer-events none, kills CSS animations
- Targets: countdown timers, stock-depletion messages, fake social proof
- `neutralizeScarcity()`: Soft-hides "Only 3 left!" patterns with informational tooltip
- `neutralizeFakeSocialProof()`: Soft-hides "42 people are viewing" patterns
- Persistent MutationObserver (debounced 800ms) catches dynamically injected timers
- Context-gated: only activates inside e-commerce containers (prevents false positives)

### 1.4 Updated M1 Rules (`m1_deceptive_commerce.json`)
- Version bumped to `2026.09.02.0`
- Added `M1-001b` (fake_stock_depletion): targets "only X left", "selling fast", etc.
- Added `M1-001c` (fake_social_proof): targets "X people are viewing", "X sold in last hour"
- Both include `neutralization` directives (action, style_override, description)
- Both include `context_required` with ancestor selectors (prevents false positives)

### 1.5 Updated Adversarial Observer (`adversarial-observer.ts`)
- Now imports shared `querySelectorAllDeep` from `dom-utils.ts`
- Alert messages updated to mention "Vigil is actively neutralizing"
- Countdown detection delegated to urgency-neutralizer

### 1.6 Updated Bootstrap (`index.ts`)
- Added `initUrgencyNeutralizer()` to bootstrap sequence (step 6)

### Phase 1 Tests (38 new test cases)
- `dom-utils.test.ts`: 14 tests — shadow root piercing, deduplication, button collection
- `cookie-consent-heuristic.test.ts`: 15 tests — rule integrity, button classification, canary protection, paywall detection
- `urgency-neutralizer.test.ts`: 9 tests — M1 rule structure, text patterns, context requirements
- `resilience.test.ts`: Updated with 2 new tests for M1 rule validation

---

## What Was Implemented (Phase 2: Local AI Legal Classifier)

### 2.1 ML Classifier Module (`ml-classifier.ts` — NEW)
- Uses `@xenova/transformers` (ONNX + WebAssembly) for zero-shot text classification
- Model: `Xenova/nli-deberta-v3-xsmall` (~22MB quantized, excellent for NLI tasks)
- 14 natural-language category labels for zero-shot classification
- Dynamic import (doesn't block main bundle)
- Non-blocking initialization (15s timeout)
- 5s inference timeout per clause
- IndexedDB model weight caching (zero external calls after first download)
- Per-session classification cache (500 entries max)
- Post-ML negation detection layer (handles "we do NOT sell" patterns)
- Confidence thresholds: HIGH ≥0.70, MEDIUM ≥0.45, LOW ≥0.25

### 2.2 Updated Auditor (`auditor.ts` — MODIFIED)
- Pipeline: ML First → Keyword Fallback
- Added `initializeLegalML()` for service worker startup
- Keyword classifier remains as independent fallback

### 2.3 Updated Service Worker (`service-worker.ts` — MODIFIED)
- Calls `initializeLegalML()` on extension install (non-blocking)

### 2.4 Updated Dependencies (`package.json` — MODIFIED)
- Added `@xenova/transformers` ^2.17.2 (production dependency)
- Added `jsdom` ^25.0.0 (dev dependency for tests)

### Phase 2 Tests (12 new test cases)
- `ml-classifier.test.ts`: Category labels, API exports, fallback behavior, type compatibility

---

## Files Changed/Created Summary

| Status | File | Description |
|--------|------|-------------|
| NEW | `src/content-scripts/dom-utils.ts` | Shared Shadow DOM traversal engine |
| NEW | `src/content-scripts/urgency-neutralizer.ts` | Active urgency/scarcity neutralization |
| NEW | `src/legal-auditor/ml-classifier.ts` | ML zero-shot legal classifier |
| NEW | `src/content-scripts/dom-utils.test.ts` | 14 tests for DOM utilities |
| NEW | `src/content-scripts/urgency-neutralizer.test.ts` | 9 tests for urgency neutralization |
| NEW | `src/content-scripts/cookie-consent-heuristic.test.ts` | 15 tests for cookie consent |
| NEW | `src/legal-auditor/ml-classifier.test.ts` | 12 tests for ML classifier |
| REWRITE | `src/content-scripts/cookie-consent-handler.ts` | Shadow DOM + heuristic engine |
| MODIFIED | `src/content-scripts/scanner.ts` | Import shared DOM utility |
| MODIFIED | `src/content-scripts/adversarial-observer.ts` | Updated alerts, shared imports |
| MODIFIED | `src/content-scripts/index.ts` | Added urgency neutralizer bootstrap |
| MODIFIED | `src/legal-auditor/auditor.ts` | ML → keyword fallback pipeline |
| MODIFIED | `src/background/service-worker.ts` | ML classifier initialization |
| MODIFIED | `rules/m1_deceptive_commerce.json` | New rules + neutralization directives |
| MODIFIED | `src/content-scripts/resilience.test.ts` | New M1 validation tests |
| MODIFIED | `package.json` | New dependencies |

---

## Test Results

**Before Phase 1**: 27 tests passing
**After Phase 1+2**: 67+ tests (27 original + 40 new Phase 1 tests + 12 new Phase 2 tests)

Note: 38 of the new tests require jsdom environment (marked with `@vitest-environment jsdom`).
Run `npm install` to get jsdom, then `npm test` to run all tests.

---

## How to Test

### Unit Tests
```bash
cd Frontend
npm install
npm test
```

### Browser Testing
```bash
npm run build
# Then load Frontend/dist into chrome://extensions/ via "Load unpacked"
```
