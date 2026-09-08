# Chrome Web Store — Permission Justifications & Privacy Practices Disclosure

**Target Extension:** Vigil — Web Trust & Safety Shield (`Frontend/manifest.json`)  
**Architecture:** 100% On-Device by Default / Local Execution / Zero Telemetry  
**Compliance Version:** Manifest V3 / Chrome Web Store Developer Program Policies (2026)

---

## Part 1: Single Purpose Description

> **Single Purpose Statement (for CWS Store Listing):**  
> Vigil is a client-side web trust and safety shield that protects users in real-time against deceptive dark patterns (fake urgency, hidden fees, pre-ticked subscription traps), intrusive tracking cookies, browser fingerprinting, and predatory legal terms using 100% on-device heuristic analysis.

---

## Part 2: Permission Justification Text (Copy-Paste Ready for Developer Dashboard)

Below is the exact text to enter into the Chrome Web Store Developer Dashboard under **"Permissions Justification"** for each requested permission:

### 1. `host_permissions: ["<all_urls>"]`
```text
Vigil is a universal browsing safety extension that must evaluate page structures across arbitrary web origins in real-time. Broad host permissions are required to:
1. Detect credential theft attempts (e.g. typosquatting lookalike domains and form-action mismatches posting credentials to third-party endpoints) on arbitrary domains before credentials are submitted.
2. Scan page DOMs in local memory for deceptive dark patterns (such as hidden subscription traps, drip pricing, and counterfeit urgency timers).
3. Enforce declarative tracker blocking and anti-fingerprinting defenses across any site the user visits.

Safeguard: Content scripts analyze DOM elements entirely in-memory on the user's CPU. Page content, form inputs, URLs, and browsing history are never transmitted off the user's machine.
```

### 2. `declarativeNetRequest` & `declarativeNetRequestWithHostAccess`
```text
Required to block network connections to known tracking, fingerprinting, and advertising domains using Chrome's native Declarative Net Request engine. Host access is required to strip invasive URL tracking parameters (e.g., fbclid, gclid, utm_*) across cross-site navigations using native redirect transformations.

Safeguard: Network blocking is handled directly by Chrome's browser engine without requiring JavaScript to observe or read raw network request payloads, maximizing user privacy and performance.
```

### 3. `declarativeNetRequestFeedback`
```text
Required solely to invoke chrome.declarativeNetRequest.getMatchedRules() to retrieve the numerical count of blocked trackers on the active domain.

Safeguard: This count is displayed locally in the extension's popup interface to give the user visibility into blocked tracking attempts. No URLs, requests, or browsing histories are recorded, stored remotely, or transmitted.
```

### 4. `cookies`
```text
Required to perform read-only forensic inspection of cookie metadata (lifespan, entropy, and flags such as HttpOnly, Secure, and SameSite) to detect unauthorized third-party tracking cookies set prior to user consent.

Safeguard: Vigil only extracts statistical entropy and metadata. Raw cookie values, session tokens, authentication credentials, and user IDs are never stored, logged, or transmitted.
```

### 5. `scripting`
```text
Required to dynamically inject the isolated anti-fingerprinting defender (defender.js) into the page's execution context.

Safeguard: The defender adds subtle, deterministic mathematical noise to Canvas, AudioContext, and WebGL readbacks to neutralize persistent device fingerprinting without breaking standard web application graphics or audio playback.
```

### 6. `storage`
```text
Required to persist user preferences, per-site allowlists/denylists, and local heuristic scores inside chrome.storage.local.

Safeguard: All stored state remains strictly on the user's local disk. Vigil contains no remote databases and does not synchronize browsing state with any cloud server.
```

### 7. `privacy`
```text
Required specifically to configure chrome.privacy.network.webRTCIPHandlingPolicy to 'default_public_interface_only'. This directly supports Vigil's anti-fingerprinting and identity protection purpose by preventing WebRTC local IP leakage. Without this setting, hostile websites and third-party trackers execute client-side STUN/ICE queries to bypass VPN tunnels and discover the user's private local LAN IP addresses (e.g. RFC 1918 subnets), creating an immutable network device fingerprint.

Safeguard: Vigil's use of the chrome.privacy API is strictly confined to WebRTC network interface isolation. Vigil does not read, modify, or monitor browser history settings, autofill, passwords, or any other browser-level privacy configurations.
```

### 8. `activeTab`
```text
Required to inspect the active tab's legal document links and highlight detected deceptive elements in the DOM when the user opens and interacts with the extension popup.

Safeguard: Access is strictly ephemeral and granted only during active user engagement with the extension interface.
```

### 9. `notifications`
```text
Required to display high-priority local desktop notifications when typosquatting domains, form-action mismatches (credential theft attempts), or severe deceptive patterns are detected in real-time.

Safeguard: Notifications are generated entirely on-device and contain no personal information.
```

---

## Part 3: Privacy Practices Tab Questionnaire Guidance

In the **"Privacy practices"** tab of the Chrome Web Store Developer Dashboard:

### 1. Remote Code Declaration
* **Does your extension contain remote code?**  
  Select: **NO**.  
  *Explanation:* All JavaScript, CSS, rulesets, and WebAssembly bundles are completely packaged within the extension CRX. Vigil uses no `eval()`, no remote script loaders, no CDN imports, and no dynamic imports from remote servers.

### 2. Data Usage Declarations
* **Does the extension collect user data?**  
  Select: **NO** (or mark "Website Content" with the explicit clarification below if required by store categorizations).

* **Certification Checkboxes:**
  - [x] I certify that Vigil complies with the Limited Use policy.
  - [x] I certify that Vigil does not sell user data to third parties.
  - [x] I certify that Vigil does not use or transfer user data for purposes unrelated to the extension's single purpose.
  - [x] I certify that Vigil does not use or transfer user data to determine creditworthiness or for lending purposes.

### 3. Third-Party Network Egress Disclosure (ToS;DR API)
Under the **Data disclosure / Privacy Policy link** section:
* State:
  > "Vigil is 100% on-device by default. All dark pattern detection, cookie analysis, heuristic threat scoring, and legal clause analysis run locally in the browser. The only external network call is an optional, user-initiated query to the open-source ToS;DR Phoenix API (https://api.tosdr.org/) when the user explicitly requests an external terms-of-service audit. The query transmits only the public domain name (with credentials omitted) and never transmits user identity, cookies, browsing history, or personal data. Consent is strictly opt-in and enforced at the network call site."

### 4. Privacy Policy Public URL Field
In the **"Privacy policy"** URL field on the Developer Dashboard:
```text
https://ath9rv.github.io/Vigil/privacy.html
```

> **How to activate GitHub Pages (30 seconds):**
> 1. Go to repository **Settings** &rarr; **Pages** (`https://github.com/ath9rv/Vigil/settings/pages`)
> 2. Under **Build and deployment &rarr; Branch**, select **`main`** and **`/ (root)`**
> 3. Click **Save**
> 4. The policy will be live at `https://ath9rv.github.io/Vigil/privacy.html` (both `privacy.html` and `docs/privacy.html` are included in the repository).

