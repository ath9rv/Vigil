# Testing Methodology & QA Framework

Vigil uses a multi-tiered verification framework: fast unit tests for correctness, browser-level acceptance tests for real-world behavior, and adversarial stress tests for resilience.

---

## Test Architecture

```
                         VERIFICATION HIERARCHY
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      ▼                          ▼                          ▼
  UNIT & INTEGRATION       BROWSER E2E              ADVERSARIAL STRESS
  Vitest + JSDOM           Playwright + Chromium    Hostile page fixtures
  52 suites, 357 tests     13 real-browser tests    Mutation storms,
  Fast feedback (<15s)     Local fixture server     queue floods, spoofing
```

---

## 1. Unit & Integration (Vitest)

All tests located across `Frontend/src/**/*.test.ts`:

| Area | What's Verified |
|:---|:---|
| Evidence & Trust | `EvidenceGraph`, observation provenance, verdict resolution, memory clamping |
| Intervention Safety | Blast radius calculation, two-axis authorization, atomic transactions, auto-rollback |
| Cookie DNA | Shannon entropy, JWT detection, tracker domain classification |
| Legal Auditor | 19-dimension trap parsing, negation precision, clause categorization |
| SSRF Protection | Loopback, RFC 1918, cloud metadata, non-HTTPS, obfuscated IPs (18 attack vectors) |
| Consent Enforcement | ToS;DR opt-in consent gate, cache purge on revocation, concurrent bypass immunity |
| RC1 Certification | 17-stage pipeline lifecycle, 11-category compatibility corpus, self-protection battery, Explain Mode |

---

## 2. Browser E2E (Playwright)

Runs against a local adversarial HTTP fixture server (`tests/adversarial/server.js`):

| Test File | Coverage |
|:---|:---|
| `defender.audio.spec.ts` | OfflineAudioContext & AudioBuffer perturbation consistency |
| `defender.canvas.spec.ts` | Offscreen probe mitigation, visible canvas non-interference |
| `defender.cname.spec.ts` | CNAME cloaking detection vs. first-party traffic |
| `defender.evasion.spec.ts` | Opaque endpoints, nested/mixed-case payloads |
| `defender.hardware.spec.ts` | 8C/8GB/24b normalization, CreepJS lie detection bypass |
| `defender.race.spec.ts` | Dynamic iframes, inline eval, SPA navigation |
| `defender.regression.spec.ts` | Canvas paths, WebGL shaders, forms, standard fetch |
| `defender.telemetry.spec.ts` | sendBeacon, fetch, XHR across payload formats |
| `defender.webgl.spec.ts` | WebGL 1 & 2 masking with 3D limit preservation |
| `fingerprint.spec.ts` | 4-stage: MAIN-world registration, early probes, cross-API mitigation, hardware stealth |

---

## 3. Running Tests

All commands from repository root:

```bash
# Unit & Integration (52 suites, 357 tests)
npm test

# Browser E2E (13 Chromium scenarios)
npm run test:browser

# Complete battery
npm run test:all

# TypeScript typecheck (zero errors required)
npm run typecheck

# Production build
npm run build
```

---

## 4. Test Results (v2.1.0-rc.1)

| Layer | Count | Status |
|:---|:---:|:---:|
| Vitest unit & integration | 357 | ✅ All passing |
| Playwright browser E2E | 13 | ✅ All passing |
| TypeScript typecheck | 0 errors | ✅ Clean |
| Production build | 111 modules | ✅ Clean |
| **Total** | **370** | **✅ 370/370** |
