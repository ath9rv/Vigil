# Zero-Telemetry & Privacy Model

This document provides the technical evidence behind Vigil's privacy claims.

---

## 1. Zero-Telemetry Guarantee

Vigil upholds an absolute zero-telemetry invariant:

- **No analytics SDKs** — no Google Analytics, Mixpanel, Sentry, Segment, Datadog, or PostHog.
- **No cloud processing** — scanned URLs, DOM nodes, cookie inventories, and legal analysis results never leave the device.
- **No ingestion servers** — all heuristics, ML models, and threat indices execute in local browser memory.
- **No tracking identifiers** — no device fingerprints, advertising IDs, or cross-session user trackers are generated.
- **Verified by audit** — full-codebase grep for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, and `navigator.sendBeacon` confirms zero telemetry egress. The only `sendBeacon`/`XMLHttpRequest` references in the codebase exist in `inject-defender.ts`, where Vigil *intercepts* third-party tracker telemetry on visited pages (defensive, not egress).

---

## 2. Declarative Network Sanitization (DNR)

Vigil uses Chrome's native `declarativeNetRequest` engine (`Frontend/rules/`) for network-layer protection:

| Ruleset | Function |
|:---|:---|
| `tracker_blocklist.json` | Blocks 100+ tracking, advertising, and cryptomining domains at the browser network stack level |
| `url_sanitizer.json` | Strips tracking parameters (`utm_*`, `fbclid`, `gclid`, `_ga`) via `queryTransform.removeParams` |
| `https_upgrades.json` | Upgrades insecure HTTP → HTTPS |

DNR rules are evaluated by the browser engine without JavaScript observing raw request payloads.

---

## 3. Optional External Service: ToS;DR

The only external network call in Vigil is the opt-in ToS;DR legal lookup:

| Property | Detail |
|:---|:---|
| Default state | **OFF** |
| Consent enforcement | Non-bypassable call-site gate in `tosdr-client.ts` |
| Data transmitted | Public domain name only (`credentials: 'omit'`) |
| Revocation behavior | Immediate cache purge from `chrome.storage.local` |

See [`PRIVACY.md`](../../PRIVACY.md) for the full call-site consent architecture.

---

## 4. Permission Least-Privilege Audit

| Permission | Purpose | Safeguard |
|:---|:---|:---|
| `host_permissions: ["<all_urls>"]` | Real-time DOM scanning on arbitrary origins | Content scripts analyze locally, never transmit |
| `declarativeNetRequest` | Native tracker blocking | Browser engine handles, no JS observes requests |
| `declarativeNetRequestWithHostAccess` | URL tracking param stripping | Native redirect transforms only |
| `declarativeNetRequestFeedback` | Blocked tracker count for popup UI | Count only, no URLs stored |
| `storage` | Local preferences and scores | On-device `chrome.storage.local` only |
| `cookies` | Read-only cookie metadata inspection | Values never persisted or transmitted |
| `scripting` | MAIN-world `defender.js` injection | Anti-fingerprinting only |
| `privacy` | WebRTC IP leak protection | Only `webRTCIPHandlingPolicy`, no other settings |
| `activeTab` | Temporary tab access during popup use | Ephemeral, user-initiated only |
| `notifications` | Local phishing alerts | No personal data in notifications |

Full per-permission justification text: [`CHROME_WEB_STORE_JUSTIFICATIONS.md`](CHROME_WEB_STORE_JUSTIFICATIONS.md)

---

## 5. Content Security Policy

```
script-src 'self'; object-src 'self'
```

- No `eval()`, no remote script loading, no CDN imports
- Cross-context messages authenticated via `sender.id === chrome.runtime.id`
- SSRF protection on all outbound `fetch()` calls (`url-security.ts`)
