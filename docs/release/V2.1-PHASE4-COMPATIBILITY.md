# VIGIL V2.1 — PHASE 4: REAL-WORLD COMPATIBILITY, DRY-RUN VALIDATION & CALIBRATION FINAL REPORT

## 1. Executive Summary

Phase 4 establishes Vigil's empirical web-compatibility framework, multi-vector diagnostic scoring, differential baseline comparison, transaction lifecycle expiration guards, and per-site governance. 

### Permanent Vigil Invariants Locked
1. **Invariant A — Detection Authority != Mutation Authority**: A detector may have `HIGH` or `CONFIRMED` confidence while remaining strictly prohibited from mutating the DOM. Detection confidence and intervention safety are independent axes.
2. **Invariant B — Differential Compatibility**: Compatibility measures `POST_INTERVENTION - BASELINE`. If a website or form is already broken before Vigil acts, that failure is never attributed to Vigil.
3. **Invariant C — Strict Transaction Context Binding**: Every transaction is bound to `(origin, navigationId, frameId, nodeIdentity)`. If a node becomes detached, replaced, or moved across navigation boundaries, the transaction transitions to `ABORTED_STALE` and strictly refuses to mutate replacement nodes.
4. **Invariant D — Hard Safety Gates Override Scores**: Numerical diagnostic scores (even 99/100) are advisory only. A hard safety gate breach (payment fields, auth controls, causal script errors) always forces `ROLLBACK` or `BLOCK`.

---

## 2. Architecture: Decision -> Safety -> Transaction -> Verification -> Rollback

```text
                           HOST WEB PAGE
                                 │
                     ┌───────────────────────┐
                     │ Baseline Health Probe │
                     │ (Geometry, Errors, JS)│
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ TrustEngine Detection │
                     │ (Hypothesis & Claim)  │
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ BlastRadiusEstimator  │
                     │ (Structural Evidence) │
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Two-Axis Decision Gate│
                     │ (Confidence x Safety) │
                     └───────────┬───────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            [OBSERVE / DRY-RUN]             [ACTIVE]
                   │                           │
          Simulate Transaction         Execute Transaction
          & Compatibility Check        (With Expiration & Stale Guards)
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Compatibility Scorer  │
                     │ (6 Diagnostic Vectors)│
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Differential Health   │
                     │ & Hard Safety Gate    │
                     └───────────┬───────────┘
                          /             \
                       PASS              FAIL
                        ↓                 ↓
                     COMMIT            ROLLBACK
                        │                 │
                   Audit Log       Advisory Finding
```

---

## 3. Subsystem Specifications

### 3.1 Transaction Lifecycle & Stale State Hardening (`transaction.ts`)
- **Deterministic Node Identity**: Generated via hierarchical DOM traversal:
  ```ts
  `${origin}::${navId}::${frameId}::${path}${id}:${role}`
  ```
  Survives attribute updates, but detects framework component replacement (React / Vue / Angular).
- **5-Second Expiration**: Transactions enforce `maxLifetimeMs = 5000`. Stale transactions automatically abort with `ABORTED_STALE`.
- **Refusal to Mutate Replacement Nodes**: If an element is unmounted or replaced during a transaction, rollback strictly refuses to modify the replacement element.

### 3.2 Multi-Vector Diagnostic Compatibility Scoring (`compatibility-scorer.ts`)
Produces 6 diagnostic vectors (0–100):
1. **Layout Stability (Weight 25%)**: Bounding box collapse check, dimension shifts, and neighbor CLS.
2. **Interaction Continuity (Weight 25%)**: Parent pointer-events and interactive element responsiveness.
3. **Form Integrity (Weight 20%)**: Proximity to inputs, submission triggers, and payment gates.
4. **Accessibility Continuity (Weight 10%)**: ARIA tree and focusability retention.
5. **Runtime Cleanliness (Weight 10%)**: Absence of causally linked JavaScript errors.
6. **Performance Impact (Weight 10%)**: Execution time measured against the 30ms budget.
- **Overall Diagnostic Score**: Weighted aggregate clearly documented as a diagnostic score rather than a probability.

### 3.3 Differential Compatibility Comparator (`differential-comparator.ts`)
- Probes pre-intervention baseline health (error count, clickable elements, geometry).
- Probes post-intervention health after a stabilization window.
- Classifies runtime errors: `PRE_EXISTING`, `UNRELATED`, `POSSIBLY_RELATED`, `INTERVENTION_RELATED`.
- Classifies layout shifts: `NO_SHIFT`, `EXPECTED_SHIFT`, `EXTERNAL_SHIFT`, `UNKNOWN_SHIFT`, `INTERVENTION_CORRELATED_SHIFT`.

### 3.4 Site Governance & Overrides (`site-governance.ts`)
- Configurable per-domain modes: `ACTIVE`, `SAFE_ONLY`, `OBSERVE_ONLY`, `OFF`.
- **Observation Invariant**: Setting a site to `OBSERVE_ONLY` or "never intervene on this site" preserves passive TrustEngine observation and telemetry analysis, suppressing only active DOM mutations.
- Extension-controlled only: Web pages cannot alter their own Vigil policy.

---

## 4. Adversarial Test Results (`adversarial-safety.test.ts`)

| Scenario | Hostile Action | Expected Outcome | Result |
|---|---|---|---|
| **A. Mutation During Verification** | Target dimensions collapsed to 0 by host script during verification sweep | Verification fails, triggers instant rollback | ✅ PASS |
| **B. Node Replacement** | React unmounts target element and mounts a replacement component | Transitions to `ABORTED_STALE`; replacement component untouched | ✅ PASS |
| **C. SPA Navigation Drift** | Route change updates navigation ID while transaction is pending | Transitions to `ABORTED_STALE` with navigation drift reason | ✅ PASS |
| **D. Origin Drift** | Target context navigates to a new origin | Transitions to `ABORTED_STALE` with origin drift reason | ✅ PASS |
| **E. 5-Second Expiration** | Transaction execution delayed beyond 5,000ms | Transitions to `ABORTED_STALE` with lifetime expiration reason | ✅ PASS |
| **F. Keyword Isolation** | Blog article mentioning "checkout", "payment", "cart" without transactional forms | Correctly classified as non-blocked; allows safe reading timer evaluation | ✅ PASS |

---

## 5. Real-World Compatibility Matrix (`compatibility-matrix.test.ts`)

| Category | Representative Scenario | Mode | Diagnostic Score | Invariant Confirmed | Status |
|---|---|---|---|---|---|
| **E-Commerce** | Product detail page with countdown urgency | `DRY_RUN` | 94.2 / 100 | Zero DOM mutation; add-to-cart button clickability preserved | ✅ PASS |
| **SaaS** | Cloud dashboard with pre-existing telemetry error | `ACTIVE` | 100.0 / 100 | Pre-existing error isolated; runtime cleanliness score 100 | ✅ PASS |
| **News / Media** | Article page with reading estimate & subscription link | `ACTIVE` | 98.0 / 100 | SAFE visual badge applied; article links and text flow intact | ✅ PASS |
| **Banking / FinTech** | Login portal with PIN and transfer submit controls | `ACTIVE` | Level 4 `BLOCKED` | Hard safety gate triggered; zero DOM mutation; advisory report only | ✅ PASS |
| **Travel / Ticketing** | Flight booking with per-site `OBSERVE_ONLY` override | `ACTIVE` | Advisory Only | TrustEngine passive observation active; mutations completely suppressed | ✅ PASS |

---

## 6. False-Positive Calibration & Discovered Cases

1. **Blog Articles on E-commerce Architecture**:
   - *Issue Discovered*: Informational articles with class names like `.how-to-checkout` were triggering payment form blast-radius blocks.
   - *Calibration Fix*: Updated `blast-radius.ts` to require structural combinations (`<form>` + submit controls + sensitive inputs) rather than keyword string matches on arbitrary `<div>` containers.
2. **Framework Component Rerenders**:
   - *Issue Discovered*: Modern React/Vue applications unmount DOM nodes on state changes, causing post-intervention rollbacks to attempt mutating orphaned nodes.
   - *Calibration Fix*: Implemented deterministic node identity and `ABORTED_STALE` state in `transaction.ts`, strictly refusing to touch replacement nodes.

---

## 7. Known Limitations

1. **Canvas-Rendered UI**: Vigil currently analyzes DOM and Shadow-DOM trees. Highly dynamic WebGL/Canvas user interfaces (e.g. Figma, Canva) bypass DOM-level dark pattern scanning.
2. **Closed Shadow DOM**: Elements enclosed within `mode: 'closed'` Shadow DOM roots cannot be inspected or traversed by standard extension content scripts per W3C specification boundaries.
3. **Cross-Origin Iframes**: Interventions inside cross-origin payment iframes (Stripe Elements, PayPal) are intentionally forbidden and classified as `RESTRICTED` or `BLOCKED` for user security.

---

## 8. Release Verification Summary

- **Vitest Unit & Integration**: **47 / 47 test files passed, 310 / 310 tests passed** (100% green)
- **Playwright Adversarial E2E**: **10 / 10 test files passed, 13 / 13 tests passed** (100% green)
- **Production Rollup Build**: **110 modules transformed, 0 errors, 0 warnings**
- **Performance Regression**: Zero regression; task scheduler caps and latency bounds verified.
- **Privacy Regression**: Zero regression; sensitive inputs redacted, DJB2 32-bit one-way hashes enforced.
