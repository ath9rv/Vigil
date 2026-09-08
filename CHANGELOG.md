# Changelog

All notable changes to **Vigil** are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.1.0-rc.1] — 2026-09-08

### Added
- **Four-Plane Architecture:** Formal separation into Observe → Decide → Act → Govern execution planes.
- **Two-Axis Authorization Gate:** Structural Blast Radius × Epistemic Detection Confidence, enforcing `Detection Authority ≠ Mutation Authority`.
- **Atomic Intervention Transactions:** Context-bound to origin, navigation ID, frame ID, and node identity path with pre-mutation snapshotting and automatic rollback.
- **Differential DOM Comparator:** Post-intervention health verifier checking script error deltas, broken resource counts, and clickable element stability.
- **Explain Mode & 1-Click Restore:** Forensic UI showing exact observations, rejected counter-hypotheses, and instant DOM rollback.
- **Multi-Signal Urgency Neutralizer:** Loopback timing detection, server-clock exemptions, and banking session timeout exclusions.
- **Priority Task Scheduler:** P0–P3 time-slicing with budget enforcement.
- **Adaptive Performance Governor:** Auto-degradation under mutation storms (>500/s) with bounded graph memory (500 nodes/navigation).
- **Cross-Navigation Token Validation:** Prevents stale/delayed event injection across page transitions.
- **11-Category Compatibility Corpus:** E-Commerce, SaaS, News, Social, Banking, Streaming, Government, Travel, Academic, Healthcare, Portals.
- **Hostile Page Self-Protection Battery:** Mutation storms, P3 queue floods, impostor node replacement, Shadow DOM depth recursion.

### Security
- **SSRF Protection Engine** (`url-security.ts`): Blocks loopback, RFC 1918, link-local, cloud metadata (`169.254.169.254`), non-HTTPS, non-standard ports, and obfuscated IP formats. 18 unit tests.
- **Cross-Context Message Authentication:** `sender.id === chrome.runtime.id` verification on all message handlers. Cross-tab `tabId` spoofing checks.
- **innerHTML XSS Elimination:** `ambient-shield.ts` refactored from regex escaping to pure `document.createElement()` + `textContent`.
- **Strict CSP:** Explicit `script-src 'self'; object-src 'self'` in manifest.
- **Non-Bypassable ToS;DR Consent:** Removed optional bypass parameter from `fetchTosDrService()`. Pre-flight consent re-verification before fetch dispatch. Instant cache purge on revocation.
- **WebRTC IP Leak Protection:** `chrome.privacy.network.webRTCIPHandlingPolicy` → `default_public_interface_only`.
- **Dead Telemetry Code Eliminated:** Orphaned `evidence/telemetry.ts` deleted from repository.
- **Fail-Closed Default:** Unknown message types return `{ success: false }` instead of `{ success: true }`.

### Changed
- Replaced direct DOM mutation side-effects with transactional plans.
- Updated `PRIVACY.md` with exact permission justifications, call-site consent documentation, and WebRTC protection scope.
- Created Chrome Web Store permission justification guide (`docs/security/CHROME_WEB_STORE_JUSTIFICATIONS.md`).

---

## [2.0.0] — 2026-09-03

### Added
- Declarative Net Request (DNR) network blocking for 100+ tracking domains.
- Automatic URL tracking parameter stripping (`url_sanitizer.json`).
- Automatic Cookie Consent Management Platform (CMP) rejection.
- Behavioral Cookie DNA engine measuring Shannon entropy and persistence.
- 19-dimensional legal term auditor with negation precision.
- MAIN-world stealth anti-fingerprinting defender (`defender.js`).
