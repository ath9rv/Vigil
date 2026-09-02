# Privacy Policy

**Effective Date:** September 3, 2026  
**Commitment:** Zero User Tracking. Zero Analytics. Zero Browsing History Transmission.

---

## 1. Zero-Telemetry Commitment

Project Vigil is built on a simple premise: **A privacy tool should never become a surveillance tool.**

* We do **not** collect your browsing history.
* We do **not** collect your search queries, keystrokes, form inputs, or passwords.
* We do **not** use Google Analytics, Mixpanel, Sentry, or any telemetry or error-tracking SDKs.
* We do **not** assign cross-device tracking IDs or create user profiles.
* The randomly generated `install_id` stored in `chrome.storage.local` is isolated to your local device and never leaves your machine.

---

## 2. What Is Processed Locally On Your Machine

All analysis performed by Vigil happens entirely inside your browser's local memory:
* **DOM Pattern Evaluation:** Webpage elements and text patterns are parsed in-memory to detect dark patterns (drip pricing, hidden recurring subscriptions, fake urgency).
* **Threat Intelligence:** URLs are evaluated against local typosquatting and homoglyph heuristic algorithms on your machine.
* **Anti-Fingerprinting Noise:** Canvas and WebGL parameters are perturbed locally to disrupt tracking probes.
* **Legal Policy Analysis:** Terms of service and privacy policy text are classified locally using an embedded negation-aware text engine.

---

## 3. External Network Requests & Explicit Consent

By default, Vigil makes **zero** outbound network requests during installation, startup, and everyday browsing.

### Opt-In Third-Party Legal Queries (ToS;DR)
* **Feature:** Deep Legal Audit (Crowdsourced Terms of Service Ratings).
* **Behavior:** When you explicitly click "Audit Terms & Conditions" in the popup, Vigil will ask for your consent before querying `https://api.tosdr.org/`.
* **5-Fold Privacy Protection:**
  1. *Background browsing:* **Zero** requests are made to ToS;DR.
  2. *User declines consent:* **Zero** requests are made. Local analysis runs offline.
  3. *User grants consent:* Exactly one query containing only the website domain is dispatched.
  4. *Feature disabled:* **Zero** requests are made.
  5. *Page reloads:* Results are cached locally; no repeated requests occur.

---

## 4. Extension Permissions Explained

In compliance with Chromium Manifest V3 least-privilege standards:

| Permission | Technical Purpose |
|---|---|
| `declarativeNetRequest` | Blocks network requests to known tracking domains and strips URL tracking parameters without reading URL contents in JavaScript. |
| `storage` | Saves your local settings, whitelisted domains, and cached scan results locally on your machine. |
| `scripting` | Dynamically registers the privacy defender (`defender.js`) into the page's execution context when you enable Strict Privacy mode. |
| `notifications` | Displays local system alerts when high-confidence credential theft or phishing attacks are detected. |
| `optional_host_permissions` | Enables Strict Anti-Fingerprinting protection only on the origins you specifically choose to protect. |

---

## 5. Open Source Auditability

Vigil's code is 100% open source under the Apache 2.0 License. Any user or security researcher can inspect, build, and verify the extension directly from the source repository.

---

## 6. Contact & Inquiries

For any questions, concerns, or inquiries regarding this Privacy Policy or Vigil's data architecture, contact:
* **Email:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com)
