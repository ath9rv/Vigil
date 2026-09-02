# VIGIL — Technical Build Reference
### Document 5 — frontend structure, backend structure, database schema, framework decisions, API/networking contracts, and pipelines. This is the "open an editor and start" document; it makes firm choices rather than presenting options, and states plainly what's needed now vs. deferred, per SRS §2.5 and §4.

---

## 0. One honest framing before the structure

SRS §2.5 already settled this: **there is no database and no load-bearing backend at MVP.** Modules 1–2 run entirely in the browser. So "give me the database structure" has two correct answers, not one — what exists at MVP (nothing relational, a signed static file), and what the LLD already specified for Module 6 once it's actually funded and staffed (SRS §13.4, §4 — 3-month/12-month phase). Both are below, clearly separated, so this document doesn't quietly imply the DB is needed sooner than it is.

Every framework choice below is a single decision, not a menu — where the HLD (Document 3) offered "Node/Express or FastAPI," this document picks one and says why, because a build-ready spec shouldn't leave the person coding an either/or.

---

## 1. Frontend Structure — The Extension (MVP, needed now)

The extension *is* the frontend at MVP — there is no separate web app yet. Three isolated JS contexts, per Chrome's architecture, each with a distinct job:

```
/extension
  manifest.json                    — MV3 manifest, declarative content-script injection (LLD §2.3)
  /src
    /content-scripts
      scanner.ts                   — scanPage(), orchestrates rule evaluation (LLD §2.2)
      rules-loader.ts               — fetches/validates JSON rule files, rejects any eval-shaped field
      highlighter.ts                 — on-page element outline, triggered only on popup request
      dom-observer.ts                 — MutationObserver wiring, 500ms debounce (SRS NFR-Performance)
      relevance-gate.ts                — cheap pre-checks before Module 2 rules run (payment/login form present?)
    /background
      service-worker.ts             — dedup, score aggregation, storage writes (MV3-safe, LLD §2.3)
      fast-lane.ts                    — Module 2 severe-finding path, zero network dependency (FR-2.3)
      message-router.ts                — typed chrome.runtime message dispatch (see §5.2 below)
    /popup
      App.tsx                       — root popup component
      main.tsx                       — Vite/React entry point
      /components
        FindingList.tsx             — grouped-by-module finding cards
        ConfidenceBadge.tsx          — Under Review / Confirmed / Disputed — WCAG-AA, never color-only (NFR-Accessibility)
        ReportAction.tsx              — routes to Jagriti (FR-3.1–3.3)
        DisputeAction.tsx              — "this seems wrong" entry point (FR-6.2)
        SettingsPerSite.tsx            — per-site opt-out deny-list (FR-8.6)
        OnboardingConsent.tsx           — first-run clickwrap, no pre-ticked boxes (FR-7.1, LR-1)
      /hooks
        useStorageState.ts           — thin wrapper reading chrome.storage.local reactively
    /shared
      types.ts                     — Finding, Rule, ConfidenceState, Message — the single type source shared with the backend (see §3)
      storage.ts                    — single write path, wraps chrome.storage (no in-memory-only state anywhere, per FR-8.2)
      constants.ts
  /rules
    m1_deceptive_commerce.json      — versioned, statute_ref mandatory on every rule (LLD §2.1)
    m2_threat_shield.json
  /public
    icons/
  vite.config.ts                   — see §4, uses @crxjs/vite-plugin
  package.json
  tsconfig.json
```

**Why this shape, specifically:**
- `rules-loader.ts` is its own file, separate from `scanner.ts`, because rule *loading and validation* (schema check, integrity check, cache fallback — FR-8.3) is a different concern from rule *evaluation*, and keeping them apart is what makes FR-8.3's "scan with last cached rule set if the worker hasn't woken up" actually simple to implement and test in isolation.
- `relevance-gate.ts` exists as its own module, not inlined into `scanner.ts`, because it's the thing that keeps the NFR-Performance budget (150ms/page) honest as more modules get added later — it's the one file that grows in scope every time a new module ships, so it deserves to be easy to find and extend on its own.
- The popup never imports anything from `/background` directly — it only ever talks to `chrome.storage` or sends a typed message (§5.2). This is what makes FR-8.4 ("popup is a review surface, never an activation switch") true by construction rather than by convention.

### 1.1 State management
No Redux, no Zustand, no external state library. The extension's real state lives in `chrome.storage.local` (single source of truth, per FR-8.2) — `useStorageState.ts` is a ~30-line hook that reads on mount and subscribes to `chrome.storage.onChanged`. Adding a state-management library here would be solving a problem the platform's own storage API already solves, and it would reintroduce exactly the in-memory-state risk FR-8.2 and FR-8.5 exist to rule out.

### 1.2 Phase 2/3 frontend — the public dashboard (deferred, not MVP)
Next.js 14 (App Router) + Tailwind, SSR, deployed to Vercel — unchanged from the HLD's original call. Not scaffolded until Module 6's public layer is funded (SRS §13.4). Route shape when it's built:
```
/app
  /site/[domain]/page.tsx     — public trust score + confidence-stated findings (GET /v1/sites/{domain})
  /badge/[domain]/page.tsx    — badge eligibility display
  /transparency/page.tsx      — LR-11's quarterly transparency report
```

---

## 2. Backend Structure

### 2.1 MVP backend — deliberately thin (needed now)
Per HLD §3 and SRS §2.5, the MVP backend is **not an application** — it's two static/serverless things:

```
/mvp-backend
  /static-list
    brand-domains.v2026.09.01.json   — signed domain-similarity list (LLD §4, FR-2.1)
    sign.ts                          — checksum/signing script, run in CI before publish
  /telemetry (optional, opt-in only)
    /api
      ingest.ts                      — single serverless function, rate-limited, anonymized payload only
```
Deployed as: static list on Cloudflare Pages or GitHub Pages (HLD §7), telemetry function as one Vercel serverless function if opt-in telemetry ships at all in v1. No routing framework, no ORM, no persistent server process. This is the whole backend footprint until Module 6 gets real funding — resist the urge to scaffold more than this now, because every extra piece here is surface area with nothing yet requiring it.

### 2.2 Phase 2/3 backend — Module 6 (deferred; specified now so it's ready)
**Framework decision: Node.js + Express + TypeScript.** The HLD left this as "Node/Express or FastAPI" — picking Express here, decisively, for one concrete reason: `types.ts` in the extension (§1) becomes the *same* types the backend uses for request/response bodies once both are TypeScript. A Python/FastAPI backend would mean hand-maintaining a second, parallel type definition for every `Finding`, `Rule`, and `Report` shape and letting the two drift — for a small team, that's a real, recurring cost with no offsetting benefit, since none of Module 6's work (rate limiting, corroboration counting, moderation queue CRUD) needs Python's ML/data ecosystem.

```
/backend
  /src
    /routes
      rules.ts              — GET /v1/rules/{module}
      reports.ts             — POST /v1/reports
      sites.ts                — GET /v1/sites/{domain}   (Phase 3 only — public layer)
      disputes.ts              — POST /v1/disputes
      badge.ts                  — GET /v1/badge/{domain}
    /controllers
      reports.controller.ts   — request validation, calls service layer, shapes response
      disputes.controller.ts
      sites.controller.ts
    /services
      corroboration.service.ts  — the COUNT(DISTINCT install_id) + time-window logic (LLD §3)
      reputation.service.ts      — reporter down-weighting, never outright banning (Design Doc §2.3)
      redaction.service.ts        — automated PII blur pass on evidence artifacts before storage (Design Doc §11.6)
      rate-limit.service.ts        — per-install_id limiting, backed by Redis
    /repositories
      finding.repository.ts    — all Postgres access for `findings`, via Prisma (see §4)
      report.repository.ts
      dispute.repository.ts
      evidence.repository.ts
    /middleware
      rate-limiter.ts          — wraps rate-limit.service, applied to /v1/reports
      integrity-check.ts        — verifies signed rule-file requests
      error-handler.ts
    /jobs
      aggregate-scores.ts       — scheduled job, recomputes per-domain/per-module trust scores into Redis (HLD §6)
      redact-evidence.ts         — scheduled sweep, catches anything that missed the inline redaction pass
    app.ts                     — Express app assembly
    server.ts                  — entrypoint
  /prisma
    schema.prisma              — see §3
  package.json
  tsconfig.json
```

Layered on purpose: **routes → controllers → services → repositories.** A route file never touches Prisma directly. This matters specifically for Module 6, because `corroboration.service.ts` and `reputation.service.ts` are the two pieces of business logic (Design Doc §2.3, §11.1) that most need unit tests independent of any HTTP request — a service layer makes that trivial; a routes-call-Prisma-directly shortcut would make the Sybil-resistance logic untestable in isolation, which is exactly the logic most worth testing carefully.

---

## 3. Database Structure (Phase 2/3 — not MVP, specified now so it's ready to run)

Postgres, per the HLD, provisioned via **Supabase** (free tier, generous enough for early growth, bundles auth/storage if ever needed — HLD §6). Schema matches LLD §3 exactly, now as runnable DDL rather than a table description, plus indexes the corroboration query actually needs.

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

create table installs (
  install_id           uuid primary key default gen_random_uuid(),  -- random, NEVER a device fingerprint (Design Doc §11.1)
  created_at            timestamptz not null default now(),
  reporter_reputation_score  real not null default 1.0               -- down-weighted over time, never zeroed to a ban
);

create table sites (
  domain               text primary key,
  first_seen            timestamptz not null default now(),
  current_score_json     jsonb not null default '{}'::jsonb           -- per-module breakdown, recomputed by aggregate-scores job
);

create table findings (
  finding_id           uuid primary key default gen_random_uuid(),
  domain                text not null references sites(domain) on delete cascade,
  module                 text not null check (module in ('M1','M2','M3','M4','M5')),
  rule_id                  text not null,
  rule_version              text not null,
  confidence_state           text not null default 'under_review'
                               check (confidence_state in ('under_review','confirmed','disputed')),
  evidence_artifact_id        uuid references evidence_artifacts(artifact_id),
  created_at                timestamptz not null default now()
);
create index idx_findings_domain on findings(domain);
create index idx_findings_confidence on findings(confidence_state);

create table evidence_artifacts (
  artifact_id            uuid primary key default gen_random_uuid(),
  finding_id               uuid not null references findings(finding_id) on delete cascade,
  storage_url                text not null,                          -- Cloudflare R2 (S3-compatible, see §4)
  redaction_status             text not null default 'pending'
                                 check (redaction_status in ('pending','redacted')),
  integrity_hash                 text not null                        -- checked before a finding can stay 'confirmed' (Design Doc §15)
);

create table reports (
  report_id             uuid primary key default gen_random_uuid(),
  install_id              uuid not null references installs(install_id),
  finding_id                uuid not null references findings(finding_id) on delete cascade,
  created_at                 timestamptz not null default now()
);
-- The corroboration query's actual index: distinct reporters per finding, over a time window
create index idx_reports_finding_created on reports(finding_id, created_at);

create table disputes (
  dispute_id            uuid primary key default gen_random_uuid(),
  finding_id               uuid not null references findings(finding_id) on delete cascade,
  submitted_by               text not null,
  status                      text not null default 'open'
                                check (status in ('open','resolved_upheld','resolved_rejected')),
  resolved_at                 timestamptz,
  resolution_notes              text
);
```

Note what's deliberately **absent**: no `users` table with emails/passwords (installs are pseudonymous by design), no device/browser fingerprint columns anywhere (Design Doc §11.1's fix, enforced at the schema level, not just by convention — there's no column to accidentally populate), no raw IP storage on `reports`.

**The corroboration check** (LLD §3, now as an actual query the `corroboration.service.ts` runs):
```sql
select count(distinct install_id) as reporter_count,
       min(created_at) as earliest, max(created_at) as latest
from reports
where finding_id = $1;
-- promotes to 'confirmed' only when reporter_count >= N AND (latest - earliest) >= min_window
```

---

## 4. Framework & Stack — Decisive Table

| Layer | Choice | Why this one, specifically |
|---|---|---|
| Extension core | Manifest V3, **TypeScript** | Not "vanilla JS or TS" (HLD's original phrasing) — TS decisively, so `types.ts` is shareable with the backend (§2.2) |
| Bundler | **Vite + `@crxjs/vite-plugin`** | The current standard tool for MV3 + React + HMR during development; handles the manifest/content-script/background-worker multi-entry build MV3 needs, which a plain webpack config would take real effort to replicate correctly |
| Popup UI | React 18 + Tailwind CSS | Unchanged from HLD — still correct, still free, still MIT |
| Rule engine format | Plain JSON + hand-rolled TS interpreter | Unchanged from HLD/LLD — no third-party rules-engine dependency needed at this scale |
| Backend framework | **Node.js + Express + TypeScript** | Decided in §2.2 — single language across extension + backend + rule engine |
| ORM | **Prisma** | Type-safe queries generated from `schema.prisma`, migrations built in, and its generated types compose naturally with the shared `types.ts` approach — a raw `pg` client would mean hand-writing types Prisma gives for free |
| Database | Postgres via **Supabase** | Matches HLD §6; free tier usable through early growth, bundled storage option reduces vendor count if evidence storage moves there later |
| Hot cache | **Redis via Upstash** | Upstash specifically because it's serverless-request-billed, which matches a Vercel-deployed Express API far better than a traditional always-on Redis instance would — no idle server cost between requests |
| Evidence/object storage | **Cloudflare R2** | S3-compatible (matches LLD §6's spec exactly), zero egress fees — relevant because evidence artifacts get *read* every time a dispute or public listing is viewed, and egress-fee-free storage is the concrete reason to pick R2 over raw S3 here |
| Public dashboard | Next.js 14 (App Router) + Tailwind | Unchanged, deferred to Phase 3 |
| Testing | Vitest (unit) + Playwright (extension E2E) | Unchanged from HLD |
| CI/CD | GitHub Actions | Unchanged from HLD |

---

## 5. API & Networking

### 5.1 External API (Phase 2/3 backend — the LLD's endpoint table, now with request/response contracts)

**`POST /v1/reports`**
```json
// Request
{ "install_id": "uuid", "domain": "example.com", "module": "M1", "rule_id": "M1-003", "evidence_hash": "sha256:..." }
// Response 201
{ "report_id": "uuid", "finding_id": "uuid", "confidence_state": "under_review" }
// Response 429 (rate-limited)
{ "error": "rate_limited", "retry_after_seconds": 3600 }
```

**`GET /v1/rules/{module}`** — public, no auth, cacheable (`Cache-Control: public, max-age=3600`), served with a checksum header the extension verifies against (LLD §2.1, `integrity-check.ts` middleware on the *publishing* side; verification happens client-side in `rules-loader.ts`).

**`POST /v1/disputes`**
```json
{ "finding_id": "uuid", "contact": "business@example.com", "explanation": "text, max 2000 chars" }
```
Always returns `202 Accepted` with `status: "open"` — never a synchronous resolution, since that's a human-moderator decision (SRS FR-6.2, §13.4).

**`GET /v1/sites/{domain}`** (Phase 3 only) — public read, served from the Redis-cached aggregate, never queries Postgres directly at request time (HLD §6's explicit reasoning: public dashboard reads must never hit Postgres live).

**`GET /v1/badge/{domain}`** — returns the same score data regardless of payment status; payment gates only the *display license*, checked separately (Design Doc §11.3's firewall, LLD §4).

All endpoints: HTTPS only, JSON in/out, rate-limited per `install_id` (never per-IP, since IP-based limiting would be a step toward the fingerprinting Design Doc §11.1 explicitly rejected).

### 5.2 Internal networking — extension message contract (not in the earlier docs; needed for implementation)

Three isolated contexts (`content-script` / `background` / `popup`) can't share memory — they talk only through `chrome.runtime.sendMessage` / `onMessage`, or through `chrome.storage`. This needs a typed contract or it becomes an untyped mess fast:

```typescript
// /extension/src/shared/types.ts
type ExtensionMessage =
  | { type: "SCAN_COMPLETE"; findings: Finding[]; pageUrl: string }
  | { type: "GET_RULES"; module: "M1" | "M2" }
  | { type: "RULES_RESPONSE"; rules: Rule[]; source: "network" | "cache" }
  | { type: "HIGHLIGHT_REQUEST"; findingId: string }
  | { type: "REPORT_FINDING"; findingId: string }
  | { type: "TOGGLE_SITE"; domain: string; enabled: boolean };
```

Per FR-8.2/FR-8.3, `content-script → background` messages for `GET_RULES` are sent with a **150ms race against the locally cached rule set** (LLD §2.3's `Promise.race` pattern) — the message contract has to support "background didn't answer in time" as a normal, expected path, not an error case, because that's the exact MV3 worker-recycling scenario FR-8.3 exists to survive.

---

## 6. Pipelines

### 6.1 Detection pipeline (runs in-browser, per page load — the core loop, MVP)
```
page load → manifest-declared content script injects (LLD §2.3, worker-independent)
  → initScan(): read enabled/deny-list from chrome.storage.local directly
  → race: fetch latest rules from background (150ms) vs. cached rules
  → scanPage(): Module 1 rules always run; Module 2 gated by relevance check
  → MutationObserver re-runs scan on significant DOM change (debounced 500ms)
  → findings written to chrome.storage.local IMMEDIATELY (never held in worker memory)
  → toolbar icon updated from current storage state (not cached in-memory value)
```

### 6.2 Rule-update pipeline (CI-driven, MVP-relevant since Module 1/2 rules will change)
```
rule author edits m1_deceptive_commerce.json → PR opened
  → CI: schema validation (reject any eval-shaped field, per LLD §2.1)
  → CI: statute_ref presence check (every rule must cite a category — FR-1.3)
  → on merge: version field bumped (date-stamped)
  → sign.ts generates checksum → published to static host (Cloudflare Pages)
  → extension's rules-loader.ts fetches on next check, verifies checksum before use
  → on checksum mismatch: fall back to last-known-good cached rules, never execute unverified content
```

### 6.3 Report → corroboration → publish pipeline (Phase 2/3, matches LLD §5)
```
POST /v1/reports → rate-limit check (install_id) → reject if exceeded
  → corroboration.service: increment distinct-reporter count for finding_id
  → if count ≥ N AND time-window ≥ min → confidence_state → 'confirmed'
  → redaction.service checks evidence artifact's redaction_status
      → if 'pending', run redaction job before finding becomes visible via GET /v1/sites/{domain}
  → later, if a dispute is filed against a 'confirmed' finding:
      → public read continues to serve it, flagged confidence_state='disputed'
      → business's explanation surfaces alongside it — never silently removed
```

### 6.4 Phishing fast-lane pipeline (MVP, Module 2 severe findings — FR-2.3)
```
domain-similarity score > severe threshold
  → triggerFastLane(): immediate local warning shown, NO network call required
  → writeToStorage(result, flagged_for_review=True) — for later async reporting only
  → this path never waits on corroboration — it's a protective act, not a public accountability act (Design Doc §11.4)
```

### 6.5 CI/CD pipeline (GitHub Actions, needed from day one of development)
```
on push/PR:
  1. lint (ESLint) + typecheck (tsc --noEmit) — both extension and backend workspaces
  2. unit tests (Vitest) — scanner logic, corroboration service, rule interpreter
  3. extension E2E (Playwright) — load unpacked extension, verify Module 1 rules flag a seeded test page
  4. build: vite build (extension) → outputs unpacked extension dir
  5. package: zip the built extension for manual Chrome Web Store upload (no auto-publish at MVP — store review is manual anyway)
on merge to main (backend only, once Phase 2/3 exists):
  6. deploy backend to Vercel; run prisma migrate deploy against Supabase
```

### 6.6 Deployment targets, summarized
| Artifact | Destination |
|---|---|
| Extension build (.zip) | Chrome Web Store (manual upload — one-time $5 dev account fee, HLD §7) |
| Static rule files + domain-similarity list | Cloudflare Pages (free) |
| Backend API (Phase 2/3) | Vercel (free tier → small paid tier once real traffic starts, HLD §6) |
| Postgres (Phase 2/3) | Supabase managed instance |
| Redis (Phase 2/3) | Upstash |
| Evidence artifacts (Phase 2/3) | Cloudflare R2 |
| Public dashboard (Phase 3) | Vercel, same project as the API |

---

## 7. What's Actually Needed — Right Now vs. Deferred

Cross-checked directly against SRS §4's MoSCoW table and §13.6's sequencing, so this isn't a new opinion — it's the same phasing, translated into "what do I open my editor and build first."

### Needed now (MVP — SRS Must-haves)
- `/extension` folder structure in full (§1) — content script, background worker, popup
- `m1_deceptive_commerce.json` and `m2_threat_shield.json` rule files, hand-authored against FR-1.1 and FR-2.1
- `scanner.ts`, `rules-loader.ts`, `dom-observer.ts`, `relevance-gate.ts`, `fast-lane.ts` — the full detection pipeline (§6.1)
- `chrome.storage`-backed state, no external state library (§1.1)
- The onboarding/consent screen with **zero pre-ticked boxes** (FR-7.1) — build this before anything else touches real user data, since SRS §13.1 flags this as a self-audit failure risk if skipped
- The static, signed domain-similarity list + its CI signing step (§6.2, minus the full rule-update pipeline's PR-review ceremony, which can wait)
- CI pipeline: lint, typecheck, unit tests, extension E2E (§6.5, steps 1–4)
- A labeled test set (a few dozen known-pattern sites, a few dozen known-clean sites) to measure false-positive rate before any pilot user sees this, per SRS §13.1's success gate

### Explicitly NOT needed yet (deferred — building this now is wasted effort)
- Any Postgres table from §3 — there is nothing to migrate until Module 6 has funding (SRS §13.4)
- The Express backend in §2.2 — MVP's "backend" is a static file host and, at most, one opt-in telemetry function (§2.1)
- Redis, Upstash, R2 — nothing to cache or store yet
- The public dashboard (Next.js) — Phase 3, gated behind Module 6's public layer
- `corroboration.service.ts`, `reputation.service.ts`, `redaction.service.ts` — real code, but for a system that has no reports table to query yet
- Jagriti's formal API integration — SRS §2.6 flags this as unverified; build the deep-link fallback (FR-3.3) first, confirm real API access as a first-week research task, not an assumed build task

### The one task that gates everything else
Per SRS §13.1: before Module 3 or Module 6 gets a single line of code, Modules 1–2's measured false-positive rate against the labeled test set needs to be low enough that the team would defend a specific flagged example to the business that got flagged. That's not a formality — it's the actual definition of "MVP done" this document is building toward.
