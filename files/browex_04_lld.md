# VIGIL — Low-Level Design (LLD)
### Document 4 of 4 — component logic, rule schema, data model, and API contract, precise enough to start coding from directly

---

## 1. Purpose
Where the HLD says "content script runs Module 1/2 rule engines," this document says what a rule looks like, what the DOM scanner's matching logic actually does, what the database tables are, and what the API endpoints are — the level of detail a developer needs to open an editor and start.

---

## 2. Rule Engine — Schema and Logic

### 2.1 Rule file format (JSON, one file per module)

```json
{
  "module": "M1_deceptive_commerce",
  "version": "2026.09.01",
  "rules": [
    {
      "id": "M1-003",
      "name": "confirm_shaming",
      "statute_ref": "CCPA-India 2023 Guidelines, Category: Confirmshaming",
      "severity": "medium",
      "selector_strategy": "text_pattern",
      "match": {
        "target": "button, a[role=button]",
        "text_patterns": [
          "no,? i (don'?t|do not) (want|care)",
          "no thanks,? i (prefer|like) (paying full price|overpaying)"
        ],
        "case_insensitive": true
      },
      "explanation_template": "This decline option is worded to guilt or shame the user rather than state the choice neutrally."
    }
  ]
}
```

- Rules are **declarative only** — `match` is a structured object the interpreter evaluates; there is no `eval`-able field anywhere in the schema, per the HLD §8 security requirement.
- `statute_ref` is mandatory on every rule, not optional — this is FR-1.3 from the SRS enforced at the schema level, not just by convention.
- `version` is a date-stamped string; the changelog implied by an updated `version` field is what Design Doc §11 (fairness/proportionality) needs to show users when a rule set changes.

### 2.2 DOM scanner matching logic (pseudocode)

```
function scanPage(rules_M1, rules_M2):
    findings = []
    elements = document.querySelectorAll(ALL_INTERACTIVE_SELECTORS)

    for rule in rules_M1:
        candidates = filterBySelector(elements, rule.match.target)
        for el in candidates:
            if matchesTextPattern(el, rule.match.text_patterns):
                findings.append(Finding(rule, el, confidence="Under Review"))

    # Module 2 relevance gate — SRS FR-2.x, HLD §4 performance budget
    if pageHasPaymentOrLoginForm(document):
        for rule in rules_M2:
            result = evaluateM2Rule(rule, document.location, elements)
            if result.match:
                findings.append(Finding(rule, result.element, confidence="Under Review"))
                if result.severity == "severe":
                    triggerFastLane(result)   # SRS UC-4 / Design Doc §11.4

    return findings

function triggerFastLane(result):
    # Immediate, local, private warning — no network call required
    showImmediateWarning(result)
    writeToStorage(result, flagged_for_review=True)
```

- `triggerFastLane` deliberately has **no network dependency** — the severe-phishing warning must work even if the extension is fully offline, consistent with HLD §3's "unplug the laptop" requirement.
- `MutationObserver` re-runs `scanPage` on significant DOM changes, debounced (target: no more than once per 500ms) to respect the performance budget in SRS NFR-Performance.

---

## 2.3 Always-On Operation — Implementation (SRS FR-8.1–FR-8.6)

The failure mode this is written against is concrete, not hypothetical: Document 1 §3 found the closest comparable shipped tool's top complaint was the extension silently going unresponsive, requiring a manual restart to notice. That happens when a toggle's state lives only in the background worker's memory — MV3 kills that worker after idle, and the toggle state dies with it. The fix is architectural, not a bug-fix-later item:

```
// manifest.json — content script injection is DECLARATIVE, not triggered by the worker
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content-scripts/scanner.js"],
  "run_at": "document_idle"
}]
```

Because injection is declared in the manifest, Chrome runs `scanner.js` on every matching page load automatically — this happens whether or not the background service worker is currently alive. The scanner's own startup sequence is what has to be worker-independent:

```
// scanner.ts — runs on every page load, per the manifest above
async function initScan():
    # Read enabled/deny-list state DIRECTLY from storage — never message
    # the background worker and wait, per FR-8.2
    state = await chrome.storage.local.get(["enabled", "site_denylist"])
    if not state.enabled or currentDomain in state.site_denylist:
        return  # respects per-site opt-out, FR-8.6 — still storage-first, no worker round-trip

    # Try to get the latest rules from the worker with a short timeout;
    # fall back to the last cached rule set if the worker hasn't woken up yet — FR-8.3
    rules = await Promise.race([
        requestRulesFromWorker(),   # wakes the worker if it's asleep
        timeout(150).then(() => getCachedRules())
    ])

    findings = scanPage(rules.M1, rules.M2)
    await chrome.storage.local.set({ [pageKey]: findings })  # immediate write, never in-memory only
    updateToolbarIcon(state.enabled, findings.length)          # reads current state, not a stale cached value — FR-8.5
```

The popup never calls anything that starts or stops scanning — it only reads from `chrome.storage.local` to display results and write the enabled/deny-list flags a user changes in settings. This makes FR-8.4 (popup is a review surface, never an activation switch) true by construction: there is no code path where scanning depends on the popup having been opened.

## 3. Database Schema (for the 3-month+ backend, when Module 6's public layer is built)

Not needed at MVP (HLD §5), but specified here so the schema is ready when Module 3+/Module 6 development starts.

| Table | Key fields | Notes |
|---|---|---|
| `installs` | `install_id` (PK, random UUID, **not** a device fingerprint — Design Doc §11.1), `created_at`, `reporter_reputation_score` | No PII. No hardware/browser fingerprint fields, by design. |
| `sites` | `domain` (PK), `first_seen`, `current_score_json` (per-module breakdown) | |
| `findings` | `finding_id` (PK), `domain` (FK), `module`, `rule_id`, `rule_version`, `confidence_state` (`under_review` / `confirmed` / `disputed`), `evidence_artifact_id` (FK), `created_at` | `confidence_state` is a first-class column, not derived on the fly — SRS FR-6.1 |
| `evidence_artifacts` | `artifact_id` (PK), `finding_id` (FK), `storage_url`, `redaction_status` (`pending`/`redacted`), `integrity_hash` | `redaction_status` must be `redacted` before an artifact is ever served publicly (Design Doc §11.6); `integrity_hash` lets Module 6's "downgrade on evidence loss" rule (Design Doc §15) be checked automatically |
| `reports` | `report_id` (PK), `install_id` (FK), `finding_id` (FK), `created_at` | Used for the corroboration-threshold count (Design Doc §11.1's fix — count of distinct `install_id`s, not raw report count) |
| `disputes` | `dispute_id` (PK), `finding_id` (FK), `submitted_by`, `status` (`open`/`resolved_upheld`/`resolved_rejected`), `resolved_at`, `resolution_notes` | SLA timestamp fields included from day one, per Design Doc §13.4 |

Corroboration check (conceptual): a finding may only transition from `under_review` to `confirmed` when `COUNT(DISTINCT install_id)` in `reports` for that `finding_id` meets the configured threshold **and** those installs' `created_at` values span a minimum time window — both conditions, not just a raw count, per Design Doc §11.1's anti-brigading logic.

---

## 4. API Endpoint Specification (3-month+ backend)

| Method | Path | Purpose | Notes |
|---|---|---|---|
| `GET` | `/v1/rules/{module}` | Fetch the current signed rule set for a module | Public, cacheable, integrity-verified client-side (HLD §8) |
| `POST` | `/v1/reports` | Submit a finding report | Body: `{install_id, domain, module, rule_id, evidence_hash}`. Rate-limited per `install_id` (Design Doc §11.1) |
| `GET` | `/v1/sites/{domain}` | Public score + confidence-stated findings for a domain | Only implemented once Module 6's public layer ships — not MVP |
| `POST` | `/v1/disputes` | File a dispute against a finding | Body: `{finding_id, contact, explanation}`. Creates a row in `disputes` with `status=open` |
| `GET` | `/v1/badge/{domain}` | Badge eligibility/status for a domain | Returns the same underlying score data regardless of payment status, per Design Doc §11.3's firewall — payment is checked only for *display license*, handled separately from this read endpoint |

All endpoints are `HTTPS` only, rate-limited, and — per Design Doc §11.6 — never accept or return raw device-fingerprint-shaped fields.

---

## 5. Sequence Flow — Report → Corroboration → Publish (3-month+, textual)

1. User submits a report → `POST /v1/reports`.
2. Backend checks `install_id` rate limit; rejects if exceeded.
3. Backend increments the distinct-reporter count for that `finding_id`.
4. If count and time-window thresholds are both met → finding's `confidence_state` updates to `confirmed` → evidence artifact's `redaction_status` is checked; if not yet `redacted`, the redaction job runs before the finding becomes visible via `GET /v1/sites/{domain}`.
5. If a `dispute` is later filed against a `confirmed` finding, the public read continues to serve the finding but flags `confidence_state=disputed` and surfaces the business's explanation alongside it (Design Doc §2.4) — it does not silently disappear.

---

## 6. Extension Codebase — Module Breakdown

```
/extension
  /content-scripts
    scanner.ts         — scanPage(), MutationObserver wiring
    rules-loader.ts     — loads + validates JSON rule files (schema check, reject on eval-shaped fields)
    highlighter.ts       — on-page element highlighting, on request only
  /background
    service-worker.ts    — dedup, aggregation, immediate storage writes (MV3-safe)
    fast-lane.ts          — Module 2 severe-finding path, no network dependency
  /popup
    App.tsx
    components/
      FindingList.tsx
      ConfidenceBadge.tsx    — WCAG-AA: never color-only
      ReportAction.tsx        — Jagriti routing/deep-link
      DisputeAction.tsx
      SettingsPerSite.tsx     — per-site opt-out, Document 1 §3's top-requested feature
  /rules
    m1_deceptive_commerce.json
    m2_threat_shield.json
  /shared
    types.ts
    storage.ts             — wraps chrome.storage, single write path (no in-memory-only state)
```

---

## 7. Free/Open-Source Tooling for the Development Process Itself

| Need | Free tool |
|---|---|
| Unit tests | Vitest |
| E2E/extension tests | Playwright (has documented Chrome-extension testing support) |
| Linting | ESLint + Prettier |
| Type safety | TypeScript (free, catches a large class of the "silent breakage after an update" complaint from Document 1 §3) |
| API contract docs | OpenAPI spec, rendered with Swagger UI |
| Diagrams beyond this doc's ASCII art | Excalidraw or draw.io |
| CI/CD | GitHub Actions free tier |
| Issue/requirement tracking | GitHub Issues + Projects, seeded directly from SRS Appendix A |
| Local Postgres for backend dev | Docker + the official free `postgres` image, matching the Supabase/Neon schema exactly so local dev never drifts from the hosted free tier |

---

This closes the pre-development set: Document 1 grounds the product in what already exists, Document 2 says exactly what to build first, Document 3 says what it's built with, Document 4 says how each piece actually works. From here, the next artifact should be code, not another document.
