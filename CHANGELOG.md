# Changelog

All notable changes to **Vigil** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0-rc.1] - 2026-09-08

### Added
* **Four-Plane Architecture**: Formal separation of runtime execution into Observation, Decision, Action (Safety), and Real-World Governance planes.
* **Two-Axis Authorization Gate**: Structural Blast Radius Estimator coupled with Epistemic Detection Confidence, enforcing the invariant that detection authority does not grant mutation authority.
* **Atomic Intervention Transactions**: Context-bound transactions (`InterventionTransaction`) tied to origin, navigation ID, frame ID, and node identity path with automatic pre-mutation snapshotting.
* **Differential DOM Comparator**: Pre/post intervention baseline health verifier checking unhandled script error deltas, broken resource deltas, and clickable element stability.
* **Explain Mode & 1-Click Restore**: Interactive forensic view explaining what Vigil observed, why it acted (or abstained), what alternative inferences were rejected, and offering instantaneous 1-click restoration of modified DOM elements.
* **Resilience & Governance**:
  * Multi-signal manufactured urgency neutralizer with loopback timing detection and server-clock exemptions.
  * Priority task scheduler with P0–P3 time-slicing.
  * Adaptive performance governor with auto-degradation under mutation floods (>500/s).
  * Bounded graph memory retention (`MAX_NODES_PER_NAVIGATION = 500`).
  * Cross-navigation token validation preventing delayed or stale event injection across page transitions.
* **11-Category Real-World Compatibility Corpus**: Standardized fixture test matrix covering E-Commerce, SaaS, News, Social, Banking, Streaming, Government, Travel, Academic, Healthcare, and Portals.
* **Hostile Page Self-Protection Battery**: Verification against mutation storms, P3 queue floods, impostor node replacement, and Shadow DOM depth recursion.

### Changed
* Replaced direct DOM mutation side-effects with transactional plans.
* Preserved historical design and requirements documentation in `docs/architecture/historical/`.
* Established dedicated documentation router in `docs/README.md`.
* Standardized root workspace tooling and developer scripts in root `package.json`.

### Security
* Verified zero-telemetry invariant across all modules: zero remote analytics, zero external logging, zero cloud processing.
* Confirmed strict MV3 least-privilege compliance and MAIN-world prototype stealth (`makeNative`).

---

## [2.0.0] - 2026-09-03

### Added
* Declarative Net Request (DNR) network blocking for over 100 tracking domains.
* Automatic URL tracking parameter stripping (`url_sanitizer.json`).
* Automatic Cookie Consent Management Platform (CMP) rejection.
* Behavioral Cookie DNA engine measuring Shannon entropy and persistence.
* 19-dimensional legal term auditor with negation precision.
* MAIN-world stealth anti-fingerprinting defender (`defender.js`).
