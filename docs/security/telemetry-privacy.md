# Zero-Telemetry & Privacy Verification

This document details the security and privacy invariants upheld by Vigil.

---

## 1. The Zero-Telemetry Guarantee

Vigil operates under an absolute **Zero-Telemetry Policy**:
* **No Remote Analytics**: Vigil does not embed Google Analytics, Mixpanel, Sentry, or any third-party tracking SDKs.
* **No Cloud Telemetry**: Scanned URLs, DOM nodes, and cookie inventories are never transmitted off the user device.
* **No Ingestion Servers**: All threat intelligence indices, heuristics, legal parsers, and machine learning models execute entirely within local browser memory.
* **Cryptographic Isolation**: All cached domain trust scores and site settings stored in `chrome.storage.local` stay on disk within the browser user profile.

---

## 2. Declarative Net Request (DNR) Sanitization

Vigil leverages Chrome's `declarativeNetRequest` API (`Frontend/rules/`) to protect the user at the network layer:
1. **Tracker Blocklist (`tracker_blocklist.json`)**:
   * Pre-compiled block rules for over 100 high-prevalence advertising, tracking, social, and cryptomining domains.
   * Evaluated directly in the browser network stack without invoking JavaScript on every request.
2. **URL Sanitizer (`url_sanitizer.json`)**:
   * Uses `queryTransform.removeParams` to automatically strip tracking parameters (`utm_source`, `fbclid`, `gclid`, `_ga`, etc.) from all web requests.
3. **HTTPS Upgrade Enforcer (`https_upgrades.json`)**:
   * Upgrades insecure HTTP traffic to secure HTTPS channels.

---

## 3. Extension Permissions Least-Privilege Audit

| Permission | Purpose | Principle of Least Privilege |
| :--- | :--- | :--- |
| `storage` | Storing local user preferences, site allowlists, and cached trust scores | Required for local persistence |
| `scripting` | Injecting MAIN-world anti-fingerprinting defender | Scoped to active web contexts |
| `declarativeNetRequest` | Enforcing network-level tracker blocking | Local kernel-level network protection |
| `activeTab` | Accessing tab metadata when popup opens | Minimal tab-level access |
| `notifications` | Warning users upon encountering confirmed credential theft | Urgent security alerts only |
| `cookies` | Reading cookie metadata for Behavioral DNA analysis | Strictly read-only local forensic analysis |
