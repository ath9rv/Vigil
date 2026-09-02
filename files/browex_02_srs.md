# VIGIL — Software Requirements Specification (SRS)
### Document 2 of 4 — formal requirements baseline for development. Structured against IEEE 830 conventions, scoped to what Document 1's research actually supports building first.

---

## 1. Introduction

### 1.1 Purpose
This SRS defines what is being built for Vigil's MVP and near-term roadmap, at a level precise enough to hand to a development team without re-litigating decisions already made in the design rounds. It does not repeat the reasoning behind each decision — that lives in the earlier design documents and in Document 1's research — it states the requirement.

### 1.2 Scope
Vigil is a free, client-side-first browser extension that scans web pages for six categories of manipulation and risk (deceptive commerce patterns, security/phishing threats, privacy/consent violations, addictive design, fake social proof, and — internally — its own integrity), scores what it finds, and offers the user a path to report a finding, share it, or dispute it. This SRS covers the MVP (Modules 1–2 fully, Module 6 minimally) and names Modules 3–5 and the public accountability features as scoped-but-deferred, per Section 8 of the design roadmap.

### 1.3 Definitions, Acronyms
- **DOM** — Document Object Model, the browser's live representation of a page's structure.
- **MV3** — Manifest V3, the current Chrome extension platform.
- **SRS / HLD / LLD** — Software Requirements Specification / High-Level Design / Low-Level Design.
- **Finding** — a single detected instance of a pattern, tied to one page, one module, one rule.
- **Confidence state** — a finding's status: `Under Review`, `Confirmed`, or `Disputed` (Design Doc, Section 2.2).
- **CCPA** — in this document, India's Central Consumer Protection Authority (not the California Consumer Privacy Act).
- **DPDP** — India's Digital Personal Data Protection Act, 2023, and its 2025 Rules.

### 1.4 References
- Design convergence document (Sections 1–15): the product's architecture, legal grounding, business model, self-critique, and readiness plan.
- Document 1 (this set): Market & Literature Research.
- Documents 3–4 (this set): HLD, LLD.

### 1.5 Overview
Section 2 describes the product at a high level; Section 3 is the actual requirements (functional, non-functional, interface, use cases); Section 4 prioritizes them; Section 5 covers data/regulatory requirements; Section 6 covers the full Terms & Policy stack as checkable requirements, not just design context; the appendix traces requirements back to modules for auditability.

---

## 2. Overall Description

### 2.1 Product Perspective
Vigil is a new, standalone product — a browser extension plus a minimal backend for MVP (report ingestion only; no public dashboard, no Wall of Shame, no badge registry at MVP, per the phased roadmap). It is not a replacement for existing ad/tracker blockers (Ghostery, uBlock Origin) and can run alongside them; it does not depend on any of them.

### 2.2 Product Functions (summary — detailed in Section 3.1)
1. Scan the active page for Module 1 (deceptive commerce) and Module 2 (phishing/tracker) patterns.
2. Surface findings to the user via on-page highlighting and a popup summary.
3. Let the user report a finding, routed to Jagriti (per Document 1, Section 5) for Module 1/3-eligible findings.
4. Let the user dispute a finding they believe is wrong (Module 6, minimal — local/manual at MVP, not a public workflow yet).
5. Compute and display a per-page, per-module confidence-stated score.

### 2.3 User Classes
| Class | Description | Primary needs |
|---|---|---|
| End user (consumer) | Anyone who installs the extension | Fast, accurate, non-intrusive flags; easy opt-out; plain-language explanations (accessibility mission) |
| Reporting user | An end user who submits a flag | Confidence the report goes somewhere real (Jagriti routing) |
| Business (flagged) | A site the extension flags | A defined way to see why, and to dispute it (even if MVP's dispute path is manual/email-based, it must exist per Section 10) |
| Internal team | Developers/moderators | Clear rule-authoring format, a working local dev loop, minimal ops burden |

### 2.4 Operating Environment
Chrome/Chromium-based browsers (Manifest V3) for MVP; Firefox/Safari explicitly out of scope for MVP (different extension APIs, added later per roadmap). No native mobile app at MVP.

### 2.5 Constraints
- Manifest V3's non-persistent background worker (Design Doc, Section 13.1.2) — no reliance on in-memory state surviving beyond a few seconds of idle time.
- Client-side-only detection for MVP — no backend dependency for Modules 1–2 to function (Design Doc, Section 5/12).
- Free/open-source tooling preference throughout (Section 6 of this document, and HLD Section 6) — no paid service is a hard MVP dependency.

### 2.6 Assumptions & Dependencies
- Chrome Web Store review process is a hard external dependency for distribution; store policy compliance (Design Doc, Section 7) is a launch blocker, not a nice-to-have.
- Jagriti's reporting endpoint/app is a third-party dependency Vigil does not control; the MVP report action can deep-link to the Jagriti app/site rather than requiring a formal API integration, since none is confirmed to exist publicly — this needs verification as a first development-week task, not assumed.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

*Format: ID — Requirement — Priority (MoSCoW). Grouped by module, mapped back to the Design Doc's numbering.*

**Module 1 — Deceptive Commerce**
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | The extension shall scan the active page's DOM for the 9 MVP-scoped Module 1 rule types (false urgency, basket sneaking, confirm-shaming, forced action, subscription traps, drip pricing, interface interference, trick questions, bait-and-switch) on page load and on significant DOM mutation. | Must |
| FR-1.2 | Each Module 1 rule shall be defined in an external, versioned JSON file, not hard-coded in the scanner logic (Design Doc, Section 6). | Must |
| FR-1.3 | Each finding shall carry the specific statute/guideline it maps to (CCPA-India 2023 Guidelines, named category), per the defamation-safe language standard. | Must |
| FR-1.4 | The extension shall highlight the specific flagged DOM element on the live page when the user requests it from the popup. | Should |

**Module 2 — Threat & Security Shield**
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | The extension shall compute a domain-similarity score (Levenshtein distance plus homograph/Unicode-lookalike check) against a versioned, integrity-verified list of high-value brand domains, per Design Doc Section 11.6. | Must |
| FR-2.2 | The extension shall detect tracking scripts firing before user interaction with a consent banner (timing check). | Must |
| FR-2.3 | A Module 2 finding above the "severe" threshold (active credential-harvesting clone) shall trigger the fast-lane path from Design Doc Section 11.4 — immediate private warning, no corroboration wait — rather than the standard flow. | Must |
| FR-2.4 | Visual-similarity checking (page layout/logo comparison) is named as a Should-have for the 3-month roadmap, not MVP, per Document 1 Section 6's literature finding that URL-only heuristics under-perform alone. | Should (post-MVP) |

**Reporting & Routing**
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | The user shall be able to report a Module 1 or 2 finding from the popup in one action. | Must |
| FR-3.2 | Module 1/3-eligible reports shall route to the Jagriti app/portal (Document 1, Section 5) rather than an independent Vigil-only channel, once the integration path is confirmed feasible. | Must (pending FR-dependency check in Section 2.6) |
| FR-3.3 | If Jagriti integration is not feasible by MVP freeze, the fallback is a deep-link to the Jagriti app/site with the flagged URL pre-filled where the platform allows it, not a silent no-op. | Must (fallback) |

**Module 6 — Integrity & Accountability (MVP-minimal)**
| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Every finding shall carry a confidence state (`Under Review` / `Confirmed` / `Disputed`) per Design Doc Section 2.2, even though the public corroboration workflow is deferred. | Must |
| FR-6.2 | A "this seems wrong" action shall exist on every finding at MVP, routing to a manual/email-based dispute channel — the workflow does not need to be automated at MVP, but the entry point must exist per Section 10's fairness commitment. | Must |
| FR-6.3 | The Sybil-resistance mechanism (Design Doc Section 11.1) shall use a locally generated random per-install identifier, never a device/browser fingerprint. | Must |
| FR-6.4 | No feature shall ship without passing the Self-Audit Reflexivity Gate (Design Doc, Section 14.2) — an internal, documented checklist run against Modules 1–6's own rules before release. | Must (process requirement) |

**Self-Consistency (Vigil auditing itself)**
| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | The extension's own onboarding/consent flow shall contain no pre-ticked boxes, no bundled unrelated consent, and no confirm-shaming language. | Must |
| FR-7.2 | The extension shall not use loss-framed engagement mechanics (streaks, "don't lose your X") anywhere in its own UI, per Design Doc Section 14.1. | Must |
| FR-7.3 | Uninstalling the extension or clearing its data shall require no more steps than installing it did. | Must |

**Always-On / Zero-Touch Operation**
*This exists because the closest comparable shipped tool's single most damaging user complaint (Document 1, §3) was the extension silently going unresponsive and needing a manual restart — the requirement below is written specifically to make that failure mode structurally impossible, not just less likely.*
| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Once installed and enabled, the extension shall scan every subsequent matching page load automatically, with no per-site or per-session activation step required from the user. | Must |
| FR-8.2 | The enabled/disabled state shall live in `chrome.storage.local` as the single source of truth, read directly by the content script at injection time — it shall never depend on a live round-trip to the background service worker to determine whether to scan. | Must |
| FR-8.3 | If the background service worker has been terminated by the browser (MV3's normal idle-timeout behavior) and has not yet restarted when a page loads, the content script shall scan using its last locally cached rule set rather than waiting on the worker or failing silently. | Must |
| FR-8.4 | The popup shall be a review/report surface only — it shall never be the mechanism that turns scanning on. A user who never opens the popup after install shall still be fully protected on every page. | Must |
| FR-8.5 | The extension's active/inactive indicator (toolbar icon state) shall always reflect the *current* enabled state read from storage, not a cached in-memory value that can drift out of sync after a worker restart — this is the specific bug shape reported against the closest comparable tool. | Must |
| FR-8.6 | Per-site opt-out (Document 1, §3's most-requested control) is implemented as a persisted deny-list, not a global switch — the default is always-on for every site, with the user able to turn it off for specific sites only, and that choice must also survive worker restarts (same storage-first pattern as FR-8.2). | Must |

### 3.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Combined Module 1+2 scan shall complete within a hard per-page compute budget (target: under 150ms on a mid-range device for a typical e-commerce page) — Design Doc Section 13.5's performance-budget requirement, made measurable. |
| **Reliability** | All stateful data (findings, dedup state) shall be written to `chrome.storage` immediately, never held only in background-worker memory, per MV3's non-persistence constraint. |
| **Availability** | Scanning shall be continuously active from the moment the extension is enabled until the user explicitly disables it or uninstalls — no session, browser restart, OS reboot, or MV3 worker-recycle event shall require the user to re-enable it (FR-8.1–FR-8.6). |
| **Security** | Domain-similarity list fetches shall be integrity-verified (signed or checksummed) before use, per Design Doc Section 11.6. No remote code execution from a fetched rule file — rules are declarative JSON, never executable script. |
| **Accessibility** | The popup and on-page highlighting shall target **WCAG 2.1 Level AA**, named explicitly per Design Doc Section 15 — reduced-motion support, screen-reader labeling, and colorblind-safe status indicators (not color alone). |
| **Privacy** | No behavioral profiling of the user. No fingerprinting (device, canvas, or otherwise) for any purpose, including anti-abuse (Section 11.1). Telemetry is opt-in and anonymized by design, not by policy alone. |
| **Compliance** | Every Module 1 finding maps to the CCPA-India 2023 Guidelines; every Module 3 finding (post-MVP) maps to the DPDP Act, 2023 and its 2025 Rules specifically — the Rules were notified 13 November 2025 with phased implementation through November 2026, so Module 3's rule set should be built against the Rules' actual text, not just the Act, once Module 3 development starts. |
| **Usability** | A first-time user shall be able to understand what a finding means without leaving the popup — the "food-nutrition label" standard from the design doc's closing line is a literal usability bar, not just a slogan. |
| **Maintainability** | Rule definitions (JSON) shall be separable from scanner logic (JS) so a rule change never requires a code review of the scanning engine itself. |

### 3.3 External Interface Requirements
- **UI:** Browser popup (React + Tailwind, per HLD), on-page highlight overlay injected via content script.
- **Software interfaces:** Chrome Extension APIs (`chrome.storage`, `chrome.scripting`, `chrome.runtime`), MV3-compliant. Optional third-party interface: Jagriti (pending confirmation of any programmatic access; deep-link fallback assumed).
- **Communication interfaces:** HTTPS only, for the (minimal, MVP-optional) domain-similarity list fetch and any opt-in telemetry.

### 3.4 Key Use Cases

**UC-1: Scan and flag a deceptive checkout page**
- *Actor:* End user
- *Precondition:* Extension installed and enabled
- *Flow:* User navigates to a checkout page → content script scans DOM against Module 1 rules → finding(s) surface as a badge count on the extension icon → user opens popup → sees finding(s) with statute mapping and "why" explanation → optionally highlights the flagged element on-page
- *Postcondition:* Finding stored locally with `Under Review` confidence state

**UC-2: Report a finding**
- *Actor:* Reporting user
- *Precondition:* At least one finding exists for the current page
- *Flow:* User taps "Report" in the popup → extension routes to Jagriti (or deep-links, per FR-3.3) with the URL and pattern type pre-filled where possible
- *Postcondition:* Report handed off to Jagriti; Vigil does not independently publish anything at MVP

**UC-3: Dispute a finding (MVP-minimal)**
- *Actor:* A business, or a user on the business's behalf
- *Precondition:* A finding exists that the business believes is incorrect
- *Flow:* Business follows the "this seems wrong" link → reaches a documented manual-review contact (email or form) → team resolves per Design Doc Section 13.4's rubric-based process
- *Postcondition:* Finding's confidence state updated if the dispute is upheld

**UC-4: Phishing fast-lane (severe Module 2 finding)**
- *Actor:* End user
- *Precondition:* Domain-similarity score exceeds the severe threshold
- *Flow:* Immediate, private, high-visibility warning shown to the user before any further page interaction, independent of the standard report/review flow
- *Postcondition:* No public listing implied or created; this is a protective act, not an accountability act (Design Doc, Section 11.4)

---

## 4. System Features — Prioritization (MoSCoW, mapped to phases)

| Phase | Must-have | Should-have | Won't-have (this phase) |
|---|---|---|---|
| MVP | FR-1.1–1.3, FR-2.1–2.3, FR-3.1/3.3, FR-6.1/6.3/6.4, FR-7.1–7.3 | FR-1.4, FR-3.2 (if feasible) | Modules 3–5, public dashboard, badge registry, automated dispute workflow |
| 3-month | Module 3 (DPDP-Rules-aligned), FR-3.2 fully | FR-2.4 (visual-similarity) | Public Wall of Shame |
| 12-month | Modules 4–5, public dashboard with corroboration | Badge registry, B2B audit API | — |

---

## 5. Other Requirements

- **Data retention:** Findings and locally stored per-install IDs are retained per the (still lawyer-pending, per Design Doc Section 13.2) Privacy Policy; this SRS assumes a default retention ceiling of 12 months for local finding history, deletable on demand, pending legal sign-off.
- **Legal/regulatory:** Module 1 rules must be re-validated against any update to the CCPA-India Guidelines or the June 2025 Advisory (in force through December 31, 2026, per Document 1) before each rule-set release. Module 3, when built, must cite the DPDP Rules 2025 specifically, not only the 2023 Act.
- **Free/appropriate tooling for the requirements process itself:** this SRS was authored in plain Markdown (versionable in the same Git repository as the code, diffable in pull requests, zero cost) rather than a proprietary requirements-management tool; issue-level traceability (Appendix A below) can be mirrored into free GitHub Issues/Projects boards as development starts, avoiding a separate paid requirements tool for a team at this stage.

---

## 6. Legal, Policy & Terms Requirements

These were fully reasoned through in the earlier design rounds (Design Doc §10, §11.5, §13.2, §15) but never turned into checkable requirements alongside the functional ones — which meant they were easy to treat as "context" rather than things a launch is actually blocked on. This section fixes that, and adds a handful of items that are implied by everything already decided but were never stated outright.

| ID | Requirement | Blocks | Priority |
|---|---|---|---|
| LR-1 | An End-User Terms of Service shall exist, presented as **clickwrap** (explicit "I agree" action) at first run, never browsewrap. It shall state plainly that findings are informational, not a legal determination of wrongdoing. | Any public release | Must |
| LR-2 | A Privacy Policy shall exist, DPDP-Act-and-2025-Rules-compliant, published and reviewable *before* any telemetry — even opt-in — is collected from a single real user, including pilot users. | Any data collection, including piloting | Must |
| LR-3 | An **age gate** shall be presented at first run. Self-declared age is the realistic MVP mechanism; if the user indicates they are under 18, a Children's Data Addendum applies automatically — no behavioral tracking or targeted processing of that install's data, full stop, regardless of what else is enabled. A verifiable (not just self-declared) age-check is named as a compliance upgrade once the user base and legal budget justify it — stated honestly as a gap, not silently assumed solved. | Any release reachable by minors (i.e., all of them) | Must |
| LR-4 | Community/Reporting Guidelines shall exist before the reporting feature (FR-3.1) ships, covering bad-faith-report consequences and who owns a submitted screenshot. | FR-3.x | Must |
| LR-5 | The Wall of Shame Listing Policy shall be drafted — corroboration threshold, dispute process, inclusion/removal criteria — well before the 12-month public-dashboard feature, since legal review (Design Doc §13.2) takes real calendar time and shouldn't be the last thing started before that feature is due. | 12-month public dashboard | Must (drafted early, not blocking MVP) |
| LR-6 | A Badge License Agreement, including a revocation clause for a badge holder that later fails a scan, shall exist before any badge is issued. | Badge registry | Must |
| LR-7 | B2B Audit Terms shall include a contractual confidentiality firewall — a paying business's private pre-launch audit results must never appear in or feed the public Wall of Shame. | B2B audit product | Must |
| LR-8 | The Chrome Web Store's mandatory declared-data-use disclosure shall match the Privacy Policy line for line before submission. | Store listing | Must |
| LR-9 | Vigil's own extension and rule-engine source code shall be released under a **permissive open-source license (MIT recommended)**. This wasn't in the original design and needed naming outright: the closest credible comparable tool (Ghostery, per Document 1 §2) is itself open-source, and for a product whose entire premise is "trust us to audit other people's transparency," being closed-source is a real, avoidable credibility gap — a user can't verify a trust tool they can't inspect. | Public launch (not MVP-internal development) | Should |
| LR-10 | Any change to the Terms of Service or Privacy Policy shall be dated, changelogged, and — for material changes — actively notified to existing users, never silently updated. This is Module 1's own no-dark-pattern standard applied to Vigil's own legal documents as they evolve, not just at first publication. | Any ToS/Privacy Policy revision | Must |
| LR-11 | Once Module 6's public layer exists, a periodic (recommended: quarterly) public transparency report shall be published — dispute counts, resolution time against the published SLA, and the tracked false-positive-rate trend from Design Doc §15. This turns the KPI framework from a design intention into an actual publishing commitment, and directly answers Design Doc §11.7's concern about the product overclaiming its own completeness. | 12-month, Module 6 public layer | Should |
| LR-12 | The Privacy Policy shall name every third-party subprocessor the backend actually uses (e.g., the hosting/database providers named in the HLD) — standard data-protection practice, and specifically relevant under DPDP's data-sharing disclosure expectations. | Any backend deployment beyond local dev | Must |
| LR-13 | Refund/cancellation terms for any paid tier (badge license, B2B audit) shall be plain, one-screen, and contain no confirm-shaming or hidden-renewal language — Vigil's own commercial terms are held to the same bar as Module 1 holds everyone else's checkout flow. | Any paid tier launch | Must |
| LR-14 | Media/errors-and-omissions liability insurance and a written incident-response/breach-notification plan shall be in place before Module 6 holds any real reporter or business data — not assumed, not deferred until after a real incident forces the question (Design Doc §15). | Module 6 handling real data | Must |

---

## Appendix A — Requirements Traceability

| Module | FRs | Design Doc source |
|---|---|---|
| Module 1 | FR-1.1–1.4 | Design Doc §2.1, §3 |
| Module 2 | FR-2.1–2.4 | Design Doc §2.1, §11.4, §11.6 |
| Reporting/Jagriti | FR-3.1–3.3 | Document 1 §5, §6 |
| Module 6 | FR-6.1–6.4 | Design Doc §2.2, §2.3, §11.1, §14.2 |
| Self-consistency | FR-7.1–7.3 | Design Doc §10.2(c), §14.1 |
| Always-on operation | FR-8.1–FR-8.6 | Document 1 §3 (real-world failure precedent), Design Doc §13.1 (MV3 constraints) |
| Legal, Policy & Terms | LR-1–LR-14 | Design Doc §10, §11.5, §13.2, §15 |
