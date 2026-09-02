# VIGIL — Design Convergence Document
### Referenced throughout the SRS, HLD, and LLD as "Design Doc §X" — this is the document those citations point to. Two parts: the original five-module version (unrenumbered sections 0–7, cited as e.g. §2.1, §3), and the "2.0" pass that closed the accountability, legal, and self-consistency gaps (sections restart at 0, cited as e.g. §11.1, §13.2, §15). Both numbering layers are preserved exactly as the other documents already cite them.

---

# PART ONE — VIGIL v1
### A Universal Web Trust & Safety Shield — built by putting a security researcher, a behavioral economist, a privacy lawyer, a misinformation analyst, an accessibility expert, an ML engineer, and one relentless 16-year-old in the same room

## 0. Why the original idea was too narrow

A dark-pattern detector that only catches 13 CCPA categories on e-commerce checkout pages is a **feature**, not a **platform**. It's real, it's useful, but it's one lens on a much bigger problem: the modern web is adversarial by design. Manipulation isn't limited to checkout flows — it's in the reviews you read, the "5 people are viewing this" banner, the tracker silently building your profile, the fake countdown, the phishing clone of your bank's login page, and the infinite scroll engineered to keep a 14-year-old on the app past midnight.

The fix isn't a bigger dark-pattern ruleset. It's **treating "manipulation" as a category that spans cybersecurity, UX psychology, data privacy, misinformation, and accessibility** — and building one extension that watches for all of it, because a user browsing the web doesn't experience these as separate threats. They experience one thing: *not knowing if they can trust the page in front of them.*

That's the product. Not a dark-pattern scanner. A **trust layer for the web.**

## 1. The Room

**The UX researcher (where we started).** Opens with the original scope: dark patterns, CCPA's 13 categories, checkout-flow manipulation. Solid, but immediately flags the limitation herself — this only fires on commerce pages, and most of browsing is manipulation about attention or trust, not money.

**The threat-intel / cybersecurity researcher.** Dark patterns are the *soft* end of a spectrum. The same DOM-analysis + rule-engine architecture that flags a fake countdown timer can flag: phishing clones (typosquatting, Unicode homograph attacks against bank/payment-gateway logins); malicious/excessive trackers (a recipe blog loading 40 trackers, far beyond stated purpose); fake urgency backed by fake infrastructure (a "127 people booking this" widget that only changes on reload, never in real time); and consent-manager manipulation at the technical level (tracking scripts firing before consent is given — a straightforward DOM-timing check, not a judgment call). This is where the product stops being "UX critique" and becomes genuinely a security tool.

**The behavioral economist / psychologist.** CCPA's 13 categories cover *transactional* manipulation only. There's a whole layer of *attentional and habitual* manipulation that never touches checkout: infinite scroll with no stopping cue, autoplay with a shrinking skip window, variable-reward notification patterns (the slot-machine mechanism), and loss-framed "streaks." This pushes the product toward flagging **addictive design**, not just deceptive design.

**The privacy / data-protection lawyer.** India's Digital Personal Data Protection (DPDP) Act, 2023 governs consent validity, purpose limitation, and data-sharing disclosures — most Indian consent flows are already non-compliant (pre-ticked boxes, bundled unrelated consent, no easy withdrawal). This gives the product a second, independent legal backbone beyond CCPA: "this consent flow would likely fail a DPDP compliance check" is a sharper, more defensible claim than "manipulative UI."

**The misinformation / trust researcher.** Fake social proof is untouched by the dark-pattern conversation: bulk-posted reviews in suspicious time clusters, "X bought this today" counters that never decrease, undisclosed paid testimonials. Detectable via DOM/behavioral signals (timing clustering, monotonic counters, missing disclosure labels) without needing to read review content.

**The accessibility expert.** The most important reframing: manipulation isn't evenly distributed. Elderly users, low-literacy users, and second-language readers are disproportionately targeted by confirm-shaming and trick questions, precisely because those patterns exploit reading speed and comprehension gaps. This makes the product protective infrastructure for the users who need it most, not a tool for tech-savvy users who'd catch it anyway — the strongest social-impact line in the pitch, and the real justification for multi-language support.

**The ML / data engineer.** Everything above is detectable with rule-based, explainable, client-side logic for MVP — no trained model needed. The real long-term differentiation is the dataset a crowdsourced flagging pipeline eventually produces: Indian-market, real-site, real-user-judgment manipulation examples nobody else has. That dataset only exists if the rule-based MVP ships first.

**The 16-year-old.** Asks the question nobody else asked: will anyone actually install this and check it? A tool that's silently correct in the background is invisible. His additions: make flagging feel like winning, not homework (a "caught you" moment, not a clinical warning); let people show off — a one-tap shareable "catch" card; a public "Wall of Shame" (sites, not users) for real accountability pressure; and a "Verified Clean" badge sites can display, which doubles as a business model. This is the single highest-leverage addition in the room — every other contribution deepens detection; this one makes the product actually get used.

## 2. The Converged Product: Vigil

**One sentence:** Vigil is a browser extension that scans every page you visit for manipulation across five dimensions — deceptive design, security threats, privacy overreach, attention exploitation, and fake social proof — scores the page and the site, and turns every flag into something shareable, reportable, and trackable over time.

### 2.1 The five modules

**Module 1 — Deceptive Commerce Patterns** *(the original core)* — false urgency, basket sneaking, confirm-shaming, forced action, subscription traps, drip pricing, interface interference, trick questions, bait-and-switch. Mapped directly to CCPA's 13 named categories.

**Module 2 — Threat & Security Shield** — phishing-clone detection (domain-similarity scoring via Levenshtein/homograph checks against known brands), excessive third-party tracker auditing, pre-consent tracking-script timing detection.

**Module 3 — Privacy & Consent Integrity** — DPDP-aligned consent-flow analysis: pre-ticked boxes, bundled unrelated-purpose consent, absent withdrawal path, suppressed "reject" buttons in cookie banners.

**Module 4 — Attention & Addictive Design Audit** — infinite scroll with no stopping cue, autoplay with a shrinking/hidden skip control, variable-reward notifications, loss-framed streak mechanics. Framed for users as "designed to be hard to leave," not just "deceptive."

**Module 5 — Social Proof Integrity** — review-timing cluster detection, monotonically-increasing "X people bought/viewing this" counters, undisclosed sponsored content styled as organic.

### 2.2 The Unified Trust Score

Every module contributes a weighted sub-score; these combine into one number (0–100) per page, rolled up into a per-site score via exponential moving average across visits. The score is broken down by module in the popup — a user sees not just "62/100" but *why* ("strong on privacy, weak on attention design"), which is more useful and more honest than a single flattened number.

## 3. Legal & Regulatory Grounding

- **CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023** — Module 1's basis, 13 named categories.
- **Digital Personal Data Protection Act, 2023** — Module 3's basis: consent validity, purpose limitation, withdrawal mechanisms.
- **IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021** — disclosure requirements for sponsored/promotional content, supporting Module 5.
- **Consumer Protection Act, 2019** — the umbrella statute CCPA's guidelines were issued under.

Every flag traces to a named standard, not a vibe — a level of precision almost no comparable team matches.

## 4. System Architecture (v1)

```
┌───────────────────────────────────────────────────────────────────┐
│                         BROWSER EXTENSION                          │
│  Content Script (DOM scanner, 5 module rule engines, MutationObs,  │
│  tracker audit, domain-similarity check)                           │
│         → Background Worker (dedup, score aggregation, local       │
│           persistence, opt-in sync)                                │
│         → Popup UI — React (module scores, live highlight toggle,  │
│           share card gen, report action, trust history)            │
│  chrome.storage.local / chrome.storage.sync (opt-in)                │
└───────────────────────────────────────────────────────────────────┘
                                    │  opt-in, anonymized findings
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                              BACKEND                                 │
│  Ingestion API → Aggregation Service (per-domain, per-module trust  │
│  scores) → Moderation & Signature Review Pipeline (crowdsourced      │
│  flags → candidate new rules)                                        │
│  Postgres (findings, scores, site history) / Redis (dashboard cache) │
│  / Review queue (human-in-the-loop)                                  │
└───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                  Public Dashboard (Next.js) — Wall of Shame,
                  "Verified Clean" badge registry, per-site history
```

All five detection modules run entirely client-side; the backend is purely additive (cross-device sync, crowdsourced signature pipeline, public Wall of Shame/badge registry). A judge should be able to disconnect from Wi-Fi and still watch Vigil catch a phishing clone, a pre-ticked consent box, and a fake countdown timer live.

## 5. Tech Stack (v1)

| Layer | Recommended | Why |
|---|---|---|
| Extension core | Manifest V3, vanilla JS content script | No framework runtime injected into every page browsed |
| Rule engine format | JSON per module, one interpreter | Legible as category count grows; a reviewer approves one JSON rule, not a code change |
| Domain-similarity check | Levenshtein distance + curated brand-domain list (~50 high-target Indian brands) | No live threat-intel feed needed for MVP; keeps Module 2 backend-optional |
| Popup / share-card UI | React + Tailwind | Component reuse across module cards, canvas-rendered share card, trust-history sparkline |
| Local storage | `chrome.storage.local` + `chrome.storage.sync` (opt-in) | Offline-first, no backend dependency for the core loop |
| Backend API | Node/Express or Python FastAPI | Either handles ingestion; FastAPI edges ahead if NLP-assisted moderation triage is added later |
| Database | Postgres | Relational across 5 modules × domain × time; window functions make trend queries cheap |
| Hot cache | Redis | Wall of Shame / badge reads must never hit Postgres directly |
| Public dashboard | Next.js, SSR | Public, shareable, should rank in search for a site's name |
| Share-card generation | Client-side canvas (no server round-trip) | Keeps the growth-critical action fast, no server dependency |
| Hosting | Vercel + Supabase/Neon | Minimal ops overhead, generous free tiers |

Detection cost stays client-side and O(page) — adding modules adds browser-side evaluation, not server load. The moderation pipeline is human-rate-limited by design, an honest constraint worth naming. The domain-similarity list is the one component needing deliberate curation over time.

## 6. MVP Scope vs. Full Vision (v1)

| Must have (hackathon MVP) | Nice to have | Explicitly out of scope |
|---|---|---|
| Module 1 — full, 9 rule types | Module 4 (Attention/Addictive Design) | Live threat-intel feed for phishing domains |
| Module 2 — domain-similarity + pre-consent timing only | Module 5 (Social Proof) | NLP-based review-content analysis |
| Unified Trust Score (2 modules is enough to demo aggregation) | Crowdsourced flagging pipeline | Public Wall of Shame at real scale |
| Live element highlighting on real pages | Share-card generation | Multi-language popup UI |
| Consumer Rights report action | Badge registry | Cross-device sync |

Naming five modules and building two-and-a-half well beats building five shallowly.

## 7. How to Present the Depth Without Overpromising

1. Open on the reframe: dark patterns are one symptom of a bigger problem — the modern web is adversarial by design.
2. Show the five-module trust score as the core visual — communicates "platform," not "feature."
3. Demo Module 1 fully working, Module 2's phishing/tracker check working, and *name* Modules 3–5 as the funded roadmap with legal backing already researched.
4. Close on the growth loop (Wall of Shame + share cards + badge) as the answer to "how does this actually get adopted."

---

# PART TWO — VIGIL 2.0
### Closing the gaps — a bigger room: more world-class specialists, and two kids instead of one

## 0. Where v1 left exposure

V1 (five modules, legal grounding, a growth loop) is genuinely strong, but the room was mostly *detection*-minded. Nobody was responsible for the questions that show up **after** the product works and starts accusing real websites, in public, at scale: What happens the first time Vigil is wrong? What stops a competitor from mass-flagging a rival onto the Wall of Shame? Who is legally exposed when a "caught you" card about a real business goes viral? What does Vigil run on once the hackathon is over? Does a tool built to protect people from fine print have accessible fine print of its own? Does a browser extension that fingerprints tracker behavior have a privacy policy that would pass its own Module 3 audit?

That's the standard second-order failure mode of every "gotcha" product: the detection engine gets built, the accountability layer doesn't.

## 1. The Expanded Room

**The game theorist / mechanism designer.** The crowdsourcing pipeline is a Sybil attack waiting to happen — nothing stops one person or one competitor's marketing intern from mass-flagging a rival. Fix has to be structural: no site enters a public list from a single reporter, ever — require corroboration from a minimum number of *independent* installs across a minimum time window before a flag counts toward a public score. Design it in from day one rather than retrofit after the first abuse case.

**The media & defamation law scholar.** "Wall of Shame" is a name that invites a lawsuit. Publicly naming a business needs to be phrased as "detected pattern, on this date, matching this named legal category, with this evidence trail" — never "this site is a scam." Every public listing needs three things: a reproducible, timestamped evidence artifact; a named rule/statute it maps to; a visible, working right-of-reply. Truth is a defense against defamation only if the specific claim can be proven — the evidence trail matters more than the score.

**The red-team / adversarial security researcher.** The moment Vigil has traction, sites will detect it and serve different content — the same arms race ad-blockers have fought for a decade. Detect common extension-fingerprinting techniques sites use and randomize Vigil's own footprint where feasible; treat "this site behaves differently when Vigil is active" as itself a flaggable signal. The domain-similarity list is itself an attack surface — a compromised fetch pipeline becomes a way to falsely accuse legitimate small businesses of being phishing clones, so it needs integrity verification.

**The platform / browser-extension engineer.** Manifest V3's background workers are **not persistent** — killed after ~30 seconds idle, losing in-memory state. Anything stateful (aggregation, dedup) must write to `chrome.storage` immediately. Five rule engines running MutationObservers per page load is a real CPU/battery cost — budget a hard per-page compute ceiling and lazy-load Modules 3–5 only after a relevance check. Chrome Web Store review scrutinizes extensions that name-and-shame third-party sites — a published moderation/appeals policy needs to exist *before* submission, or the listing risks removal.

**The social entrepreneur / sustainability strategist.** What does this run on in month seven, with a real server bill and no prize money left? Three legitimate, non-exclusive paths: consumer stays free forever (client-side detection, near-zero marginal cost); a B2B "compliance readiness" API sold to businesses who want to check their own flow before shipping it (a cooperative, non-adversarial relationship); and grant/civic-tech funding, since DPDP-compliance tooling for small businesses is a plausible grant category. The badge program bridges the first two: a paid display license funds the free consumer side.

**The children's digital-rights advocate.** The growth loop is built around a 16-year-old's instincts, and Module 4 specifically targets attention-exploitation patterns that hit minors hardest — Vigil is, in part, a product for minors, monitoring platforms that target minors. The extension's own telemetry needs a stricter-than-default policy for under-18 users: no behavioral profiling of the user themselves, full stop, regardless of what's being audited on the page. A plain-language "for parents and teachers" explainer is worth building too.

**The second kid — eleven years old, allergic to unfairness.** Where the sixteen-year-old asked "will anyone open this," the eleven-year-old asks the question that actually breaks the product if unanswered: "What if it's wrong about somebody?" Her follow-ups are basically the entire accountability layer in plain English: *"Does the website get to say that's not fair?"* → an appeals button, not just a flag button. *"What stops someone from flagging a site they just don't like?"* → the corroboration threshold. *"Do I have to pay for it?"* → no, and that has to stay true. *"What if the bad website learns how Vigil checks and hides from it?"* → cloaking detection. *"Can you explain it in one sentence I could say to my mom?"* → **"It's like a food-nutrition label, but for whether a website is trying to trick you."** The single best one-sentence pitch either kid produced — concrete, not scary, and correctly implying "informational, not accusatory."

## 2. Converged Product v2

### 2.1 Six modules, not five
Modules 1–5 are unchanged from v1. They add:

**Module 6 — Integrity & Accountability Layer** *(the room's actual headline addition).* Doesn't run on third-party pages — it runs on Vigil's own pipeline. Owns: corroboration-threshold enforcement before any finding becomes public, the appeals/right-of-reply workflow, evidence-artifact storage, and rate-limiting on the crowdsourced report path. If Modules 1–5 are the eyes, Module 6 is the conscience — the module that turns "browser extension" into "publisher," legally speaking, which is why it must exist before the Wall of Shame goes live, not after the first complaint.

### 2.2 Trust Score v2 — a confidence state, not just a number
v1's score was a bare 0–100 number per module. v2 adds a status flag: `Confirmed` (corroborated, evidence-backed, past appeal window) / `Under Review` (single-source, not yet public) / `Disputed` (site has filed a right-of-reply, shown alongside the finding until resolved). A number with no provenance is an accusation; a number with a visible confidence state and an evidence link is a report.

### 2.3 The Anti-Gaming / Sybil-Resistance Layer
No public listing from fewer than *N* independent reporters across a minimum time window. Anomaly detection on the reporting pipeline: a burst of reports from newly-installed extensions is a red flag for brigading, not a sign the site got worse. Reporters build a reputation score over time — chronically inaccurate reporters are down-weighted, not banned outright.

### 2.4 The Appeals & Right-of-Reply Process
Every public finding ships with a "Dispute this finding" action on the same dashboard entry, not buried in a support email. Disputed findings show both sides until a human moderator resolves it. A published SLA for moderator response so "appeal" isn't decorative.

### 2.5 A Defamation-Safe Language Standard
Every user-facing string follows one template: **[pattern name] detected on [date], matching [named rule/statute], evidence: [link].** Never a bare adjective ("scammy," "shady") attached to a business name — a cheap, one-time UX-writing pass that's the difference between "consumer-protection tool" and "defamation lawsuit."

## 3. Legal Risk Mitigation for Vigil Itself

| Risk | Mitigation |
|---|---|
| Defamation from a wrong or unfair public finding | Evidence-artifact requirement + confidence states + right-of-reply, all in Module 6 |
| Brigading / competitor sabotage via mass-flagging | Corroboration threshold + reporter-reputation scoring |
| Extension-store removal for "shaming" third parties | Published moderation policy submitted alongside the store listing |
| Vigil's own telemetry violating the privacy standard it enforces | Opt-in only, anonymized, no minor profiling, own privacy policy audited against Module 3's ruleset before launch |
| Compromised/stale phishing list causing false accusations | Integrity-verified fetch, versioned, human-reviewed before any update ships |
| Trademark/name collision | Basic name-collision check before any public launch |

## 4. Business Model & Sustainability

Consumer extension: **free, permanently** — detection is client-side, marginal cost per user near zero, which pre-empts the "how will you monetize user data" question before it's asked.

Two non-adversarial revenue paths that don't monetize the accountability layer: **B2B pre-launch compliance audit** (the same rule engine sold as a pre-launch SaaS audit tool, a cooperative relationship, not adversarial); **"Verified Clean" badge licensing** (a small fee for sites that pass consistently, funding the free tier and Module 6's moderation staffing). A third, non-revenue path: grant/civic-tech funding, since DPDP-compliance tooling and manipulation-literacy tooling are both plausible grant categories.

## 5. Updated Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           BROWSER EXTENSION                            │
│  Content Script → 5 detection modules (lazy-loaded, relevance-gated)   │
│  Background Worker → dedup, aggregation, writes to storage IMMEDIATELY │
│      (Manifest V3: worker is not persistent — no in-memory-only state) │
│  Popup UI → module scores + confidence state + dispute action          │
└───────────────────────────────────────────────────────────────────────┘
                                    │  opt-in, anonymized, corroboration-gated
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                                BACKEND                                  │
│  Ingestion API → Sybil / reporter-reputation filter → rate limiter     │
│  Aggregation Service → per-domain, per-module trust scores             │
│  Module 6: Integrity & Accountability                                  │
│     • Evidence-artifact store (timestamped DOM snapshots)              │
│     • Corroboration-threshold gate before anything goes public         │
│     • Appeals / right-of-reply workflow + moderator queue              │
│  Domain-similarity list → integrity-verified, versioned, human-reviewed│
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                  Public Dashboard — every listing shows:
                  finding + evidence + confidence state + dispute link
```

Detection stays client-side and free; everything that costs money or carries legal risk (public listing, appeals, corroboration) lives behind Module 6's gate, not in front of it.

## 6. Updated Tech Stack (additions only)

| Layer | Addition | Why |
|---|---|---|
| Reporter identity | Lightweight device/session fingerprint diversity check (not account-based) | Sybil resistance without requiring accounts |
| Evidence storage | Timestamped snapshot store (S3-compatible) | A finding without a reproducible artifact isn't defensible in a dispute |
| Moderation | Simple internal review queue (a shared spreadsheet is fine at MVP scale) | The appeals SLA needs to be real from day one |
| List integrity | Signed/versioned fetch for the domain-similarity list | Prevents a compromised feed becoming a false-accusation vector |
| Performance budget | Per-page compute ceiling + relevance gating before modules 3–5 run | MV3 battery/CPU discipline |

*(Superseded in the LLD/critique pass below — reporter identity moves from device fingerprinting to a locally-generated random ID; see §11.1.)*

## 7. Extension Store & Platform Compliance Checklist
- Published moderation and appeals policy, submitted *with* the listing, not added after a complaint.
- Minimal permission scope requested incrementally per module, not all-at-once.
- Reduced-motion and screen-reader support on the popup and any "caught you" animation.
- Colorblind-safe score visualization (not red/green alone).

## 8. MVP vs. Roadmap v2

| Hackathon MVP | 3-month | 12-month |
|---|---|---|
| Module 1 full, Module 2 (domain-similarity + pre-consent timing) | Module 3 (DPDP consent audit), Module 6 basic (single-reporter dispute button, no public wall yet) | Modules 4–5 full, public Wall of Shame with corroboration threshold live, badge registry, B2B audit API |
| Trust score with confidence state, even at MVP | Reporter-reputation scoring, evidence-artifact store | Grant/B2B revenue live, multi-language popup, i18n beyond Hindi/English |

*(Superseded by §13.4 below: badge/B2B revenue must exist, or be committed, before the Wall of Shame ships — not in the same window.)*

## 9. The Final No-Gaps Matrix (as of v2)

| Domain | Covered in v1? | Covered now |
|---|---|---|
| Detection breadth | Yes | Unchanged, still the strong core |
| Legal grounding for detection claims | Yes (CCPA/DPDP/IT Rules/CPA) | Unchanged |
| Legal exposure from publishing findings | No | Module 6, defamation-safe language, evidence artifacts |
| Gaming / brigading resistance | No | Corroboration threshold, reporter reputation |
| Right of reply for flagged sites | No | Appeals workflow, disputed-state visibility |
| Sustainability beyond hackathon prize | No | B2B audit API, badge licensing, grant path |
| Manifest V3 technical realism | Partially | Persistent-storage discipline, compute budget, relevance gating |
| Adversarial evasion (cloaking) | No | Cloaking-detection as its own signal, integrity-verified rule feeds |
| Extension-store approval risk | No | Pre-submission moderation policy, minimal permission scoping |
| Vigil's own data practices vs. its own standard | No | Opt-in only, no minor profiling, self-audit against Module 3 |
| Accessibility of the tool itself | Partially | Reduced-motion, screen-reader, colorblind-safe display |
| One-sentence pitch a non-technical adult understands | Implicit | *"It's like a food-nutrition label, but for whether a website is trying to trick you."* |
| Vigil's own contracts, consent, and fine print | No | §10 — the Terms & Policy Stack |

## 10. The Terms & Policy Stack

Everything above assumes Vigil has the *legal standing* to scan pages, publish findings, and take payment for a badge — it doesn't, automatically.

**New voice: the terms-and-consumer-contracts lawyer**, distinct from the defamation scholar (§1) — that scholar covers what Vigil is legally allowed to *say about a site*; this one covers what Vigil legally *promises its own users, reporters, and paying customers*.

### 10.1 The documents Vigil actually needs

| Document | Who it's for | Core job |
|---|---|---|
| End-User Terms of Service | Everyone who installs | Governs use, disclaims findings as informational (not a legal determination), sets liability limits |
| Privacy Policy | Same | Telemetry scope, opt-in, retention — DPDP-compliant, must pass Module 3's own audit |
| Children's Data Addendum | Users under 18 | Verifiable guardian consent for a child's data; bars behavioral tracking of minors |
| Community / Reporting Guidelines | Anyone submitting a flag | Bad-faith-report consequences, screenshot ownership |
| Wall of Shame Listing Policy | Businesses that get flagged | Published inclusion criteria — corroboration threshold, dispute process |
| Badge License Agreement | Businesses using "Verified Clean" | Usage rules + revocation clause if a later scan finds a violation |
| B2B Audit Terms | Paying compliance-audit customers | SLA + a contractual confidentiality firewall — private audit results must never leak into the public Wall of Shame |
| Extension-Store Privacy Disclosure | Chrome Web Store / platform review | Must match the real Privacy Policy line for line |

### 10.2 Three terms-specific issues

**a) "Unauthorized automated access."** Many sites' terms prohibit bots/scrapers. In the US, *hiQ Labs v. LinkedIn* pushed courts toward distinguishing server-level scraping from a human using their own browser to view content they can already see; India's IT Act has its own separately-worded provisions, untested against a product like Vigil. Practical position for Vigil's own terms: *the content script observes what the user's own browser already renders, on pages the user themselves navigated to — it does not access any system on the user's behalf.* Needs an actual lawyer's sign-off before any public, at-scale launch.

**b) Evidence artifacts and copyright.** A stored DOM snapshot is technically a reproduction of copyrighted content. A strong fair-use/fair-dealing argument exists (the same one review sites rely on), strengthened by two habits: crop to the specific flagged element, and always pair with commentary rather than a bare reproduction.

**c) Enforceability.** A terms document nobody agreed to isn't worth much — **clickwrap** (explicit "I agree" at first run), never browsewrap. Applying Module 1's own rules to Vigil itself: the agreement checkbox can't be pre-ticked, and uninstalling can't be harder than installing.

### 10.3 The plain-language requirement
Every document in §10.1 ships with a three-sentence, plain-language summary above the legal text, not instead of it — the same standard [ToS;DR](https://tosdr.org) already applies to other companies' terms. *(None of §10 is legal advice — a real lawyer needs to draft and review the binding version of every document listed before Vigil scans a real site in public.)*

## 11. The Critique Pass — where 2.0 still contradicts itself

Every round so far has been additive. An additive process never catches its own contradictions — only an adversarial read does.

### 11.1 An anti-fingerprinting product proposes fingerprinting as its own integrity mechanism
Module 2 flags sites that fingerprint users beyond stated purpose. §2.3's Sybil-resistance layer proposed doing exactly that — device/session fingerprint diversity checks. **Fix:** a random per-install ID generated locally (never derived from hardware/browser signals), rate-limited reporting, and light friction (proof-of-work or CAPTCHA-style) on freshly-installed extensions. Weaker Sybil resistance — worth stating that trade-off out loud rather than solving it by quietly becoming a tracker.

### 11.2 "Backend-optional" is true of detection and false of accountability
The proudest pitch line — unplug the laptop, Vigil still works — describes Modules 1–5, not Module 6, which needs a server, persistent reporter identity, and a moderation queue. **Fix:** split the claim explicitly — detection is client-side and free forever; publication is backend-mediated on purpose, because public claims about a business shouldn't ship without a human-reviewable trail.

### 11.3 The paid badge is the unnamed ratings-agency conflict of interest
§4's badge licensing means Vigil is paid by the businesses it evaluates — structurally the same conflict as paid credit ratings. **Fix, as a firewall, not a footnote:** the Modules 1–5 rule engine determining badge eligibility is identical, versioned, and public regardless of payment; a fee only ever buys the *display license* for a score already earned for free, never the score itself.

### 11.4 One evidentiary bar for six modules is wrong
Corroboration thresholds correctly stop brigading of Modules 1, 3, 4, 5. Module 2 sometimes needs to flag an active credential-harvesting clone *right now* — waiting for corroboration means real financial harm in the gap window. **Fix:** Module 2's most severe findings get a fast lane — an immediate private warning plus an automated report to the relevant hosting provider/registrar, without waiting for public corroboration. Stopping harm and shaming a business shouldn't share one clock.

### 11.5 India-grounded law, globally-distributed product
Every legal anchor in §3 is Indian law; the Chrome Web Store has no country gate. A US/EU site flagged under DPDP-style language is being evaluated against a law that never applied to it. **Fix at MVP:** geofence the *public* accountability features (Wall of Shame, DPDP-specific language, badge registry) to sites with an India-facing presence. Private, on-page detection can stay global — only the public legal claims need a border.

### 11.6 Evidence artifacts expose bystanders, not just the business
§10.2(b) covers the business's copyright interest. It misses a real person's name or photo incidentally captured in a "Priya just bought this" widget. **Fix:** an automated redaction pass — blur names, photos, anything PII-shaped — on every evidence artifact before storage or display.

### 11.7 The No-Gaps Matrix oversold its own completeness
Several "Covered now" rows in §9 mean "a policy now says this must exist" — commitments, not solved problems. A matrix that doesn't separate *designed* from *done* overstates itself exactly the way the product exists to catch other people doing.

## 12. Vigil 3.0 — The Final Convergence

**One sentence, final:** Vigil is a free, client-side browser extension that scores every page you visit across six dimensions of manipulation and risk, backed by a deliberately slower, evidence-based, appealable public accountability layer — built to survive the same scrutiny it applies to everyone else.

### The seven fixes, at a glance

| Contradiction found | Resolution |
|---|---|
| Sybil-resistance via device fingerprinting | Local random per-install ID + rate limits + friction, not fingerprinting |
| "Backend-optional" claimed for the whole system | Detection client-side/free; publication backend-mediated by design, and the pitch says so |
| Paid badge = unacknowledged ratings-agency conflict | Scoring engine free/public/identical regardless of payment; a fee buys display rights only |
| One evidentiary bar for six modules | Module 2's severe findings get a private, fast-response lane separate from public corroboration |
| India-grounded legal claims, globally distributed extension | Public accountability features geofenced to India-facing sites at launch |
| Evidence snapshots expose bystanders' data | Automated redaction pass before any artifact is stored or shown |
| Matrix conflated "designed" with "done" | Status split three ways: Designed / In Progress / Shipped |

### What's genuinely, honestly still open
- Real legal sign-off on every §10 document, from an actual lawyer, not this room.
- Real funding and staffing for Module 6's moderation queue before the Wall of Shame goes live.
- Trademark clearance on the name.
- A separate legal read on the Module 2 fast-lane — reporting to a registrar/hosting provider carries different exposure than publishing to the public dashboard.

## 13. The Path to Industry-Ready

### 13.1 Build and pilot Modules 1–2 first, nothing else
- **Build order:** DOM scanner + Module 1's 9 rule types first (1–2 weeks for a small team), then Module 2's checks, then the popup UI last — the popup is the least risky part and shouldn't be built first.
- **The pilot needs its own honest consent flow** — if the sign-up screen has a pre-ticked "share my browsing data" box, the team has failed its own Module 1 audit before scanning a single site.
- **Measure precision/recall before trusting a single public claim** — a labeled test set of known-pattern and known-clean sites, run before any real user's browsing is touched.
- **Success gate before expanding scope:** don't touch Module 3 or Module 6 until the false-positive rate is low enough to defend a specific flagged example to the business that got flagged.

### 13.2 Real legal review — structured to be affordable
Four distinct reviews, not one generalist conversation: **data protection counsel** (Privacy Policy + Children's Data Addendum against the DPDP Act and the 2025 Rules — phased in through November 2026, penalty enforcement expected around May 2027); **media/defamation counsel** (Listing Policy, §2.5's language standard); **commercial/contracts counsel** (ToS, Badge License, B2B Audit Terms); **IT Act/cyber counsel** (the narrow, genuinely unsettled §10.2(a) question). Make it cheap by bringing resolved decisions, not open questions — a lawyer reviewing an already-decided policy is fast; one designing it from scratch is expensive. Budget-conscious paths: university legal-aid tech-law clinics, Indian digital-rights orgs' pro-bono guidance, and DPIIT's Startup India legal-support scheme. **Sequencing:** Privacy Policy/ToS review before any pilot user's data is collected; defamation/Listing Policy review before Module 6 or the Wall of Shame — not before the hackathon demo.

### 13.3 Trademark and name clearance — cheap, fast, do it this week
Search India's IP Registry (ipindiaonline.gov.in) under Class 9/42, plus USPTO TESS and WIPO's Global Brand Database (the Chrome Web Store is globally distributed regardless of initial market). Check domain/handle availability alongside. Keep two or three backup names loosely vetted.

### 13.4 Fund and staff moderation before Module 6 goes public — not after
One accountable person, defined hours, a published SLA (even "disputes reviewed within 5 business days, by [named role]"); a written decision rubric, not case-by-case judgment calls. **Corrected sequencing from §8:** badge/B2B revenue needs to exist, or be committed, *before* the Wall of Shame ships — an unfunded public accountability feature is a liability, not a milestone. Community moderation (Wikipedia/Reddit-style) is a legitimate later-stage model, not a launch one.

### 13.5 A security review scoped to what's actually feasible now
Permission audit (narrowest scope MV3 allows, be ready to justify it to store reviewers); dependency/static-code review (`npm audit`, minimal third-party libraries); integrity-checked domain-similarity list fetch; a DOM-injection review of Vigil's *own* UI injected into untrusted pages (the reverse direction — a malicious page attacking Vigil); backend rate-limiting; a responsible-disclosure policy (even a one-line `SECURITY.md`). Realistic review sources pre-revenue: a university security club or local OWASP chapter session before a paid pen test.

### 13.6 How the five actually sequence

| Item | Can start now, in parallel | What it gates |
|---|---|---|
| Trademark/name check | Yes — self-serve, this week | Any public branding or store listing |
| Basic security review | Yes — alongside the build | Any pilot touching real user data |
| Build + pilot (§13.1) | Yes — the core work | The precision/recall claim; the input the consent-flow lawyer needs |
| Legal review (§13.2) | Partially — Privacy Policy/ToS can start once §13.1's data flow is defined | Public pilot launch; Module 6/Wall of Shame |
| Moderation funding & staffing (§13.4) | No — needs the Listing Policy as its job description | The Wall of Shame going public, full stop |

Not a single yes/no on "industry ready?" — a small number of specific gates, each with a specific owner, each unblockable in a specific order.

## 14. The Self-Audit Reflexivity Gate

### 14.1 The miss: Vigil's own growth loop is shaped like Module 4
Module 4 flags loss-framed engagement hooks, variable-reward mechanics, manufactured urgency. §1's growth loop — leaderboards, a "caught you" animation, shareable cards, a public wall — is structurally the same toolkit aimed at Vigil's own users. **Fixes:** no streaks or loss-framed "don't lose your X" messaging anywhere in Vigil's own UI, ever; a hard notification-frequency cap with one-tap opt-out; the Wall of Shame stays about sites, never gamifies users against each other (no personal leaderboard, no "top reporter" rank-chasing); any self-reported stat (badge counts, "X sites scanned") must be real-time-accurate, never a rounded vanity number.

### 14.2 The actual fix: a standing process, not a one-time patch
The reason this took a second adversarial pass to find is that nobody owned catching it before ship. **The Self-Audit Reflexivity Gate:** before any new user-facing feature ships, a specific, named, rotating owner runs it against all six modules' own rules — does this feature use dark-commerce patterns on our own users (M1), fingerprint or over-collect (M2/3), use addictive engagement mechanics (M4), inflate social proof (M5), or make an unreviewable public claim (M6)? This is the mechanism that would have caught §14.1 and §11.1 automatically, at design time, instead of needing an outside critique pass.

## 15. The Final Sweep

**Share-card authenticity.** A shareable "caught you" card is also a template for a forged one. **Fix:** every genuine card carries a verification ID/link back to the live finding, so a forged or stale card can be checked in one tap.

**Proportionality and redemption.** Nothing said how long a Wall of Shame listing lasts — a permanent record with no path off it is disproportionate and undermines the badge incentive. **Fix:** a defined re-review window; a remediated business's old finding is marked resolved and time-limited, visible in history but not in the active ranking — the same way a credit report ages a resolved item.

**A success-metrics framework.** At minimum: a tracked, ongoing false-positive rate (a live metric, not just a pre-launch gate), dispute resolution time against the published SLA, badge adoption, and a periodic user-trust measure — an install-count growth metric says nothing about accuracy, and accuracy is the entire value proposition.

**Operational maturity, in one pass:**
- **Insurance** — media liability / errors-and-omissions coverage, a real standard cost for a product that publicly evaluates real businesses.
- **Breach response plan** — a written incident-response and DPDP-compliant breach-notification plan before Module 6 holds any real data, not after an incident forces one.
- **Evidence integrity, both ways** — if the evidence store is ever lost or unverifiable, the finding it supports must automatically downgrade out of `Confirmed`, per §2.2's own logic.
- **Internal recusal** — no staff member can push a listing, override a dispute, or fast-track a finding for a business they have a conflict with, without the same standard applied to anyone else.
- **Vendor contingency** — a basic data-export/portability plan so a pricing change or outage at Vercel/Supabase/R2 isn't existential.

**Accessibility, named specifically.** **WCAG 2.1 Level AA** as the actual target, with a lightweight conformance check before public launch — turning "we thought about accessibility" into a verifiable claim.

**Localization depth.** Hindi-first alongside English, then the next languages by user-base share, each with real human translation review — a mistranslated warning is its own kind of failure for a tool protecting people who struggle with fine print.

**Onboarding and ordinary user support.** A lightweight help/support contact for bug reports and questions, separate from the business-dispute moderation queue.

**Freedom to operate.** A brief patent/prior-art check — low probability for rule-based DOM analysis, cheap to confirm once before scaling past a demo.

---

Between Parts One and Two, the product logic, its own accountability layer, the contracts around it, its internal contradictions, the path to actually shipping it, and its own operating discipline have all been run through — including, finally, pointing its own rules at itself. The eleven-year-old's line still holds as the whole pitch in one sentence: *"It's like a food-nutrition label, but for whether a website is trying to trick you."*
