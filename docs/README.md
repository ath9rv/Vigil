# Vigil — Technical Documentation

Navigational index for the Vigil documentation suite.

---

## Architecture

📂 [`docs/architecture/`](architecture/)

- **Current** (`architecture/current/`):
  - [System Architecture](architecture/current/system-architecture.md) — 4-layer runtime (Observe → Decide → Act → Govern), invariants, and Explain Mode
  - [Trust Engine & Evidence Graph](architecture/current/trust-engine.md) — Multi-signal reasoning, provenance, temporal correlation, memory lifecycle
  - [Browser Runtime & Multi-World Isolation](architecture/current/browser-runtime.md) — MAIN world stealth (`defender.js`), ISOLATED world content scripts, service worker lifecycle

- **Historical** (`architecture/historical/`):
  - [Design Convergence](architecture/historical/00-design-convergence.md) · [Market Research](architecture/historical/01-market-and-literature-research.md) · [SRS](architecture/historical/02-srs.md) · [HLD](architecture/historical/03-hld.md) · [LLD](architecture/historical/04-lld.md) · [Build Reference](architecture/historical/05-technical-build-reference.md)

---

## Release

📂 [`docs/release/`](release/)

- [**RC1 Certification Ledger**](release/V2.1-RC1-CERTIFICATION.md) — 370/370 automated tests, 17-stage pipeline verification, 11-category compatibility corpus, hostile page self-protection battery
- [Release Specification](release/V2.1-RELEASE-SPECIFICATION.md) — 4 release planes, Explain Mode schema, 1-click restore
- Phase milestones: [Phase 1](release/V2.1-PHASE1-OBSERVABILITY.md) · [Phase 2](release/V2.1-PHASE2-PERFORMANCE.md) · [Phase 3](release/V2.1-PHASE3-INTERVENTION-SAFETY.md) · [Phase 4](release/V2.1-PHASE4-COMPATIBILITY.md)
- [Final Validation](release/VIGIL-FINAL-VALIDATION.md) · [Phase 1–2 Summary](release/PHASE_1_2_SUMMARY.md)

---

## Security & Privacy

📂 [`docs/security/`](security/)

- [Zero-Telemetry & Privacy Model](security/telemetry-privacy.md) — Local computation guarantees, DNR sanitization, cryptographic isolation
- [Chrome Web Store Justifications](security/CHROME_WEB_STORE_JUSTIFICATIONS.md) — Per-permission justification text and privacy practices questionnaire guidance
- Root policies: [`PRIVACY.md`](../PRIVACY.md) · [`SECURITY.md`](../SECURITY.md)

---

## Testing

📂 [`docs/testing/`](testing/)

- [Testing Methodology](testing/methodology.md) — Vitest unit/integration architecture, Playwright browser tests, adversarial HTTP server, performance stress fixtures
- Quick start: [`HOW_TO_USE.txt`](../HOW_TO_USE.txt) · [`README.md`](../README.md)
