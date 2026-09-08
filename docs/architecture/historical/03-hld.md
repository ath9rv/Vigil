# VIGIL — High-Level Design (HLD)
### Document 3 of 4 — system architecture and technology choices, optimized for free/open-source tooling at every layer per the SRS's constraints

---

## 1. Purpose & Scope
Translates the SRS (Document 2) into a system architecture: what runs where, what talks to what, and what it's built with. Covers the MVP architecture in full detail and names the 3-month/12-month additions without over-designing them yet.

## 2. Architectural Goals & Constraints
1. **Client-side-first.** Detection must work with the backend fully unreachable (SRS §2.5).
2. **MV3-native.** No architecture choice may assume persistent background-worker state.
3. **Free/open-source by default.** Every layer below names a free option first; a paid alternative is only listed where the free tier is genuinely insufficient, with the limit stated.
4. **Self-consistent.** The architecture itself must pass the Self-Audit Reflexivity Gate — e.g., no analytics SDK that fingerprints, no dark-pattern-shaped onboarding flow shipped from a growth-hacking template.

## 3. System Architecture — MVP

```
┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION (MV3)                          │
│                                                                        │
│  Content Script                Background Service Worker             │
│  ─ DOM scanner (M1, M2)   ──▶  ─ Dedup + score aggregation           │
│  ─ MutationObserver             ─ Writes to chrome.storage           │
│  ─ Domain-similarity check      IMMEDIATELY (no in-memory-only       │
│  ─ Highlight-on-request           state — MV3 worker is not          │
│                                    persistent)                        │
│                                 ─ Rate-limits local report actions    │
│                                                                        │
│  Popup UI (React + Tailwind)                                          │
│  ─ Finding list + confidence state + statute mapping                  │
│  ─ "Report" → Jagriti deep-link/integration                           │
│  ─ "This seems wrong" → manual dispute contact                        │
│  ─ Settings: per-site opt-out (the #1 requested feature per           │
│    Document 1 §3's review research)                                   │
└──────────────────────────────────────────────────────────────────┘
                        │  optional, opt-in only
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│              MINIMAL BACKEND (MVP — optional, not load-bearing)     │
│  ─ Domain-similarity list host (static JSON, signed)                 │
│  ─ Opt-in anonymized telemetry endpoint (rate-limited)                │
│  No findings database, no public dashboard, no moderation queue       │
│  at MVP — these are 3-/12-month additions (SRS §4)                    │
└──────────────────────────────────────────────────────────────────┘
```

A judge, reviewer, or early user should be able to disconnect from the network entirely and still see Modules 1–2 work end to end. The backend box above exists only to host a signed static file and an optional opt-in telemetry endpoint — it is infrastructure, not a dependency.

## 4. Component Overview

| Component | Responsibility | Notes |
|---|---|---|
| Content script | Runs Module 1/2 rule engines against the live DOM | Lazy-loads Module 2 checks only after a Module 1 relevance gate passes, per Design Doc §13.5's performance budget |
| Background service worker | Dedup, score aggregation, storage writes | Must assume it can be killed and restarted at any time (MV3) |
| Popup UI | User-facing findings, reporting, disputes, settings | React + Tailwind; no framework runtime injected into the page itself — only the popup, which is its own isolated context |
| Rule files | JSON, one per module, versioned | Never executable — declarative only, reviewed like data, not code (SRS NFR, Security) |
| Static list host | Domain-similarity brand list | A single signed JSON file is sufficient at MVP scale; no database needed yet |

## 5. Data Flow — MVP

**Scan flow:** page loads → content script fires → Module 1 rules evaluate against DOM → if any match, Module 2's relevance gate checks (e.g., is there a login form / payment field) → matching findings written to `chrome.storage.local` immediately → background worker aggregates a per-page score → popup badge updates.

**Report flow:** user taps Report → extension either calls a confirmed Jagriti integration point, or opens a deep-link with the URL/pattern pre-filled → no data leaves the browser beyond that user-initiated action.

**Dispute flow (MVP-minimal):** business follows a static contact link → resolved manually against the documented rubric (SRS UC-3) → no automated backend workflow yet.

## 6. Technology Stack — Free/Open-Source First

| Layer | Recommended (free) | Why this one | If the free tier runs out |
|---|---|---|---|
| Extension core | Manifest V3, vanilla JS/TypeScript content script | No framework runtime injected into every page the user visits; free, no license, smallest possible footprint | N/A — no scaling cost here, it runs in the user's own browser |
| Popup UI | React + Tailwind CSS | Both fully open-source (MIT), zero cost regardless of scale, huge free documentation/community base | N/A |
| Rule engine format | Plain JSON, hand-rolled interpreter | No dependency at all — a rule-matching interpreter this size doesn't need a paid or even third-party rules-engine library | N/A |
| Version control / CI | **GitHub** (free for public repos, generous free tier for private) + **GitHub Actions** (2,000 free CI minutes/month on free tier) | Standard, zero-cost, and doubles as the issue tracker for requirements traceability (SRS Appendix A) | GitHub Actions minutes — unlikely to be hit before real scale; GitLab CI is a free fallback |
| Static list hosting | **GitHub Pages** or **Cloudflare Pages** (both free) | A single signed JSON file needs no more than static hosting | N/A at this scale |
| Backend (when needed, 3-month+) | **Supabase** or **Neon** (both have a genuinely usable free Postgres tier) via **Vercel** (free tier for the API/dashboard) | Matches the original design doc's stack choice; both free tiers are usable for a real MVP-to-early-growth user base | Supabase free tier pauses an inactive project after a period, and has row/storage caps — worth noting explicitly rather than discovering it live; Neon's free tier has a similar storage ceiling. Either is fine to start; a small paid tier (a few dollars/month) is the realistic first real cost once Module 6's backend goes live |
| Diagramming (for HLD/LLD diagrams beyond ASCII) | **draw.io / diagrams.net** or **Excalidraw** (both free, no account required) | Zero cost, exports to PNG/SVG for slides, no vendor lock-in |
| API documentation | **OpenAPI/Swagger** spec + **Swagger UI** (both open-source) | Free, standard, and doubles as a contract test source later |
| Design/mockups | **Figma** (free tier is sufficient for a small team) | Free tier covers a small project's popup/dashboard mockups |
| Testing | **Vitest** or **Jest** (both free, open-source) for unit tests; **Playwright** (free, open-source) for extension end-to-end testing | All zero-cost, all actively maintained |
| Linting/formatting | **ESLint + Prettier** (free, open-source) | Standard, zero cost, catches real bugs before review |
| Project management | **GitHub Projects** (free, built into the same repo) | No reason to pay for Jira/Linear at this stage — GitHub Projects covers the SRS's MoSCoW board directly |

## 7. Deployment View (MVP)
- Extension: submitted to the Chrome Web Store (developer account is a one-time $5 fee — the one genuinely unavoidable small cost in the entire stack).
- Static list + any opt-in telemetry endpoint: GitHub Pages/Cloudflare Pages (list) + a minimal serverless function on Vercel's free tier (telemetry), both at zero recurring cost at MVP traffic levels.
- No database is deployed at MVP — deliberately, per the client-side-first principle in Section 2.

## 8. Security Architecture Overview (summary — see LLD for implementation detail)
- Signed/checksummed fetch for the domain-similarity list (Design Doc §11.6).
- No `eval` or remote-script execution anywhere in the extension — rule files are parsed as data, never executed as code.
- Minimal permission manifest — request only what each shipped module actually needs, incrementally, per Design Doc §7 and §13.5.
- Dependency audit (`npm audit`, free, built into npm) run in CI on every change.

## 9. Third-Party Library / License Notes
Every library named in Section 6 is MIT, Apache-2.0, or BSD-licensed — all permissive, all safe for a commercial product later without a licensing review blocking launch. This was a deliberate filter: nothing GPL-licensed is included in the recommended stack, since GPL's copyleft terms would need a real legal read before shipping a closed or dual-licensed product, and that's exactly the kind of avoidable legal-review item Design Doc §13.2 already flagged as a cost to minimize.
