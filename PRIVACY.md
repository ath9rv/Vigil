# Privacy Policy — Vigil

**Effective Date:** September 8, 2026  
**Architecture:** 100% On-Device by Default · Zero Analytics · Zero Telemetry

---

## 1. Core Commitment

Vigil is built on a non-negotiable invariant: **a trust and privacy extension must never become a surveillance tool.**

- **No browsing history** is collected, transmitted, or stored remotely — ever.
- **No keystrokes, forms, or credentials** are captured or sent off-device.
- **No analytics SDKs** — zero Google Analytics, Mixpanel, Segment, Sentry, or PostHog.
- **No tracking IDs** — no device fingerprints, advertising identifiers, or cross-session user trackers.
- **Local storage only** — all settings and cached results reside exclusively in `chrome.storage.local` on your machine.

---

## 2. 100% On-Device Processing

Every core pipeline runs entirely in your browser's local memory:

| Pipeline | What it does | Where it runs |
|:---|:---|:---:|
| DOM Dark-Pattern Scanner | Detects deceptive UI (drip pricing, fake urgency, pre-ticked traps) | Local |
| Behavioral Cookie DNA | Analyzes entropy, lifespan, and security flags | Local |
| Credential Shield | Evaluates typosquatting, homoglyphs, form-target mismatches | Local |
| Anti-Fingerprinting | Perturbs Canvas, WebGL, Audio readbacks | Local |
| Legal Document Auditor | Classifies clauses across 19 risk dimensions | Local |
| WebRTC Protection | Blocks STUN/ICE local IP discovery | Local |

Raw cookie values, session tokens, and page content are never stored, logged, or transmitted.

---

## 3. External Network Requests

By default, Vigil makes **zero** outbound network requests — during install, startup, background execution, or browsing.

### Opt-In: ToS;DR Legal Lookup

Vigil offers an optional deep legal audit powered by the open-source [ToS;DR](https://tosdr.org/) database.

- **Default state:** OFF. Vigil uses only its local legal classifier.
- **Non-bypassable consent:** The consent gate lives at the network call site (`tosdr-client.ts`), not the UI layer. The socket cannot open without affirmative, stored user consent.
- **Scope when enabled:** HTTPS GET to `https://api.tosdr.org/service/v1/?url=<domain>` — public domain name only. No paths, query params, cookies, referrers, or user identifiers (`credentials: 'omit'`).
- **Immediate revocation:** Disabling consent purges all cached ToS;DR data from `chrome.storage.local` and halts all queries instantly.

---

## 4. Extension Permissions

| Permission | Purpose |
|:---|:---|
| `host_permissions: ["<all_urls>"]` | Real-time DOM scanning for dark patterns and phishing on arbitrary domains. Content scripts analyze locally, never transmit. |
| `declarativeNetRequest` | Native browser-engine blocking of 100+ tracking domains. No JS observes raw requests. |
| `declarativeNetRequestWithHostAccess` | Strips URL tracking params (`fbclid`, `gclid`, `utm_*`) via native redirect transforms. |
| `declarativeNetRequestFeedback` | Reads blocked tracker counts for popup UI display. No URLs stored or transmitted. |
| `storage` | Local-only persistence of preferences, allowlists, and scores. |
| `cookies` | Read-only cookie metadata inspection. Values never persisted or transmitted. |
| `scripting` | Injects `defender.js` into MAIN world for anti-fingerprinting. |
| `privacy` | Sets `webRTCIPHandlingPolicy` to prevent local IP leakage through VPN tunnels. No other privacy settings are touched. |
| `activeTab` | Temporary tab access during popup interaction for legal doc highlighting. |
| `notifications` | Local desktop alerts for critical phishing detection. No personal data in notifications. |

Full per-permission justifications: [`docs/security/CHROME_WEB_STORE_JUSTIFICATIONS.md`](docs/security/CHROME_WEB_STORE_JUSTIFICATIONS.md)

---

## 5. Content Security Policy

```
script-src 'self'; object-src 'self'
```

- No `eval()`, no remote script loading, no inline scripts, no CDN imports.
- Cross-context messages authenticated via `sender.id === chrome.runtime.id`.
- Outbound fetches protected by SSRF validation (blocks loopback, RFC 1918, cloud metadata).

---

## 6. Open Source Verification

Vigil is open source under the Apache 2.0 License. Audit the source, verify builds, and inspect runtime behavior:

- **Repository:** [github.com/ath9rv/Vigil](https://github.com/ath9rv/Vigil)
- **Contact:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com)
