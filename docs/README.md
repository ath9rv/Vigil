# Vigil Technical Documentation Router

Welcome to the **Vigil** technical documentation suite. Vigil is an open-source, client-side cognitive firewall and autonomous browser trust shield for Chromium (Manifest V3).

Use this navigational guide to find architecture specifications, release milestones, verification reports, security policies, and testing methodologies.

---

## 🧭 Navigational Index: What Do You Need to Know?

```text
                                DOCUMENTATION DIRECTORY
                                          │
       ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
       ▼                  ▼                               ▼                  ▼
[ARCHITECTURE]       [RELEASE]                       [SECURITY]          [TESTING]
Current runtime      Release candidate specs &       Zero-telemetry      Test suites,
and historical       certification records           guarantees and      Playwright E2E,
foundation specs                                     threat model        and fixtures
```

### 1. 🏗️ "I need to understand the architecture and how Vigil works"
👉 Head to [**`docs/architecture/`**](architecture/)

* **Current Architecture (`architecture/current/`)**:
  * [**System Architecture**](architecture/current/system-architecture.md): The 4-layer runtime (Observe, Decide, Act, Real-World Governance), 3-authority invariant (`Detection ≠ Mutation`), and Explain Mode.
  * [**Trust Engine & Evidence Graph**](architecture/current/trust-engine.md): Multi-signal epistemic reasoning, provenance tracking, temporal correlation, and memory lifecycle.
  * [**Browser Runtime & Multi-World Isolation**](architecture/current/browser-runtime.md): MAIN world anti-fingerprinting stealth (`defender.js`), ISOLATED world content scripts, and background service worker event loop.
* **Historical Foundation (`architecture/historical/`)**:
  * [**00-design-convergence.md**](architecture/historical/00-design-convergence.md): Core principles and convergence rationale.
  * [**01-market-and-literature-research.md**](architecture/historical/01-market-and-literature-research.md): Research into deceptive patterns and client-side defensive techniques.
  * [**02-srs.md**](architecture/historical/02-srs.md): Software Requirements Specification (functional & non-functional requirements).
  * [**03-hld.md**](architecture/historical/03-hld.md): High-Level Design document.
  * [**04-lld.md**](architecture/historical/04-lld.md): Low-Level Design document.
  * [**05-technical-build-reference.md**](architecture/historical/05-technical-build-reference.md): Technical build reference and original module specifications.

---

### 2. 🚀 "I need release specifications, certifications, and milestone history"
👉 Head to [**`docs/release/`**](release/)

* **Current Release Candidate 1 (`v2.1.0-rc.1`)**:
  * [**V2.1-RC1-CERTIFICATION.md**](release/V2.1-RC1-CERTIFICATION.md): Official RC1 certification ledger, 17-stage pipeline verification, 11-category real-world compatibility corpus results, hostile page self-protection battery, and invariant proofs.
  * [**V2.1-RELEASE-SPECIFICATION.md**](release/V2.1-RELEASE-SPECIFICATION.md): Complete release specification covering the 4 release planes, Explain Mode schema, and 1-click restore mechanism.
* **Engineering Phase Milestones**:
  * [**V2.1-PHASE1-OBSERVABILITY.md**](release/V2.1-PHASE1-OBSERVABILITY.md): Phase 1 milestone — EvidenceGraph, Observation provenance, temporal correlation.
  * [**V2.1-PHASE2-PERFORMANCE.md**](release/V2.1-PHASE2-PERFORMANCE.md): Phase 2 milestone — Priority task scheduler, performance governor, subtree caching, and bounded memory retention.
  * [**V2.1-PHASE3-INTERVENTION-SAFETY.md**](release/V2.1-PHASE3-INTERVENTION-SAFETY.md): Phase 3 milestone — Blast radius estimation, two-axis authorization, atomic transactions, and rollback monitor.
  * [**V2.1-PHASE4-COMPATIBILITY.md**](release/V2.1-PHASE4-COMPATIBILITY.md): Phase 4 milestone — Differential DOM comparator, stale-context defense, and site governance.
  * [**VIGIL-FINAL-VALIDATION.md**](release/VIGIL-FINAL-VALIDATION.md): Pre-RC1 validation suite and performance benchmarks.
  * [**PHASE_1_2_SUMMARY.md**](release/PHASE_1_2_SUMMARY.md): Consolidated summary of Phases 1 and 2 implementation.

---

### 3. 🔒 "I need to verify privacy guarantees, permissions, and security disclosures"
👉 Head to [**`docs/security/`**](security/)

* [**Zero-Telemetry & Privacy Model**](security/telemetry-privacy.md): In-depth audit of local computation guarantees, absence of external network calls, DNR sanitization, and cryptographic data isolation.
* Root Security Disclosure: [`SECURITY.md`](../SECURITY.md) — Vulnerability reporting guidelines, supported versions, and threat model.

---

### 4. 🧪 "I need to run the automated test suite and understand QA methodology"
👉 Head to [**`docs/testing/`**](testing/)

* [**Testing Methodology**](testing/methodology.md): Architecture of the Vitest unit/integration suite, Playwright Chromium browser tests, adversarial HTTP server, and performance stress fixtures.
* Root Developer Guide: [`HOW_TO_USE.txt`](../HOW_TO_USE.txt) and [`README.md`](../README.md) for quick-start execution commands.
