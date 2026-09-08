# Privacy Policy — Vigil

**Effective Date:** September 8, 2026  
**Commitment:** Zero User Tracking. Zero Analytics. Zero Browsing History Transmission. 100% On-Device by Default.

---

## 1. Zero-Telemetry Commitment

Project Vigil is built on a non-negotiable architectural invariant: **A trust and privacy extension must never become an exfiltration or surveillance vector.**

* **No Browsing History Collected or Transmitted:** Vigil never logs, transmits, or stores your browsing history on any remote server.
* **No Keystroke, Form, or Credential Logging:** Keystrokes, passwords, search queries, form inputs, and sensitive DOM contents are never captured or sent off-device.
* **Zero Third-Party Analytics or Error Trackers:** Vigil contains zero analytics SDKs (no Google Analytics, Mixpanel, Segment, Datadog, Sentry, or PostHog).
* **Zero Cross-Device or Persistent Tracking IDs:** Vigil does not generate device fingerprints, advertising IDs, or cross-session user trackers.
* **Local Device Storage Only:** All configuration settings, per-site denylists, and cached scan results reside exclusively in your browser's private `chrome.storage.local`.

---

## 2. 100% On-Device Local Processing (Default Architecture)

Every core security and privacy detection pipeline in Vigil executes entirely within your browser's local memory and WebAssembly runtime:

1. **DOM Dark-Pattern Scanner:** Deceptive UI patterns (drip pricing, fake countdown urgency, pre-ticked subscription traps, disguised advertisements) are evaluated in-memory using local CSS selectors and heuristic classifiers.
2. **Behavioral Cookie DNA Engine:** Cookie entropy, lifespan, and security attributes (`HttpOnly`, `SameSite`, `Secure`) are analyzed locally. Raw cookie values and session tokens are never stored, transmitted, or logged.
3. **Phishing & Credential Shield:** Typosquatting, homoglyph domain similarity, and mismatched form targets are evaluated client-side without pinging remote reputation lookups.
4. **Anti-Fingerprinting Noise:** Canvas and WebGL tracking probes are neutralized by injecting deterministic local mathematical noise in the page context.
5. **Local Legal Document Analysis:** Terms of Service and Privacy Policies are parsed and classified locally on your CPU using an embedded negation-aware text engine and local ONNX WebAssembly model.

---

## 3. External Network Requests & Call-Site Consent Invariant

By default, Vigil makes **zero** external outbound network requests during installation, startup, background execution, or browsing.

### Opt-In Third-Party Legal Queries (ToS;DR Phoenix API)
Vigil offers an optional deep legal audit feature powered by the open-source [ToS;DR](https://tosdr.org/) (Terms of Service; Didn't Read) crowdsourced database.

* **Default State:** **Strictly OFF (Disabled).** Vigil relies exclusively on its local, on-device NLP/regex legal classifier.
* **Non-Bypassable Call-Site Consent Enforcement:** Consent is not merely a UI flag. The consent verification gate lives directly at the network execution call site (`tosdr-client.ts`). Even if a background routine or prefetcher were invoked, the network socket cannot open without affirmative, stored user consent.
* **Scope of Data Sent (When Explicitly Consented):**
  * Vigil dispatches an HTTPS GET request to `https://api.tosdr.org/service/v1/?url=<domain>`.
  * **Payload:** Only the public registered domain name (e.g., `example.com`).
  * **Exclusions:** Full URL path, query parameters, referrers, IP address headers, cookies, and user identifiers are strictly omitted (`credentials: 'omit'`).
* **Immediate Revocation & Cache Purge:** When a user disables or revokes consent for a domain, all cached ToS;DR data for that domain is immediately purged from `chrome.storage.local`, and all outbound queries for that domain immediately halt.

---

## 4. Extension Permissions Explained

In compliance with Chromium Manifest V3 least-privilege standards, Vigil requests only the minimum permissions necessary to deliver active privacy defense:

| Permission | Justification & Safeguards |
|:---|:---|
| `host_permissions: ["<all_urls>"]` | Required to scan visited web pages in real-time for DOM dark patterns, detect credential-harvesting phishing forms on arbitrary domains, and enforce declarative tracker blocking. Content scripts evaluate the DOM locally in-memory and never transmit page content externally. |
| `declarativeNetRequest` | Blocks network requests to known tracking, fingerprinting, and advertising domains using browser-native static rulesets without allowing JavaScript to observe URL contents. |
| `declarativeNetRequestWithHostAccess` | Allows Vigil to strip invasive URL tracking parameters (such as `fbclid`, `gclid`, `utm_*`) across navigations using native redirect transforms. |
| `declarativeNetRequestFeedback` | Enables Vigil to read rule match counts via `getMatchedRules()` solely to display blocked tracker statistics in the popup UI. No browsing history or URLs are exposed or transmitted. |
| `storage` | Saves user preferences, site allowlists/denylists, and local heuristic scores in `chrome.storage.local`. All data remains strictly on the user's device. |
| `cookies` | Allows read-only inspection of cookie metadata (expiration, flags, and entropy) to detect unauthorized pre-consent marketing trackers. Raw cookie values are never persisted or transmitted. |
| `scripting` | Programmatically registers the isolated anti-fingerprinting defense script (`defender.js`) into the main world to neutralize aggressive Canvas/Audio tracking probes. |
| `privacy` | Permits configuring browser privacy settings (such as WebRTC IP handling policy and network prediction controls) when the user enables Vigil's hardened privacy mode. |
| `activeTab` | Grants temporary elevated tab access when the user interacts with the extension popup (e.g., to highlight detected dark patterns or extract terms of service text). |
| `notifications` | Displays local, on-device desktop alerts when high-confidence credential phishing or severe malicious threats are intercepted. |

---

## 5. Security & Content Security Policy (CSP)

Vigil enforces an explicit, strict Manifest V3 Content Security Policy:
```text
script-src 'self'; object-src 'self'
```
* Remote script evaluation, `eval()`, dynamic code loading from CDNs, and inline script execution are strictly prohibited.
* Cross-context messaging between content scripts and the background worker enforces mandatory `sender.id === chrome.runtime.id` authentication and tab ID origin validation.
* Outbound fetches strictly enforce anti-SSRF protections, blocking loopback (`127.0.0.1`), private RFC 1918 subnets, and cloud metadata services (`169.254.169.254`).

---

## 6. Open Source Verification & Contact

Project Vigil is open source under the Apache 2.0 License. Security researchers, regulators, and users are invited to audit the source code, verify reproduction builds, and inspect runtime behavior:

* **Repository:** [https://github.com/ath9rv/Vigil](https://github.com/ath9rv/Vigil)
* **Security & Privacy Contact:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com)
