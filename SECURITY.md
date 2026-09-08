# Security Policy

## Supported Versions

| Version | Status |
|:--------|:------:|
| 2.1.x   | ✅ Active support |
| 2.0.x   | ✅ Security fixes only |
| < 2.0   | ❌ End of life |

## Security Architecture

Vigil is designed as a **zero-trust, client-side-only** browser extension:

1. **Zero Secret Storage** — The extension bundle contains no API keys, cloud credentials, or production secrets.
2. **Zero Involuntary Telemetry** — No browsing history, keystrokes, form entries, or telemetry metrics are collected or transmitted. The only external network call (ToS;DR API) is opt-in with non-bypassable call-site consent enforcement.
3. **Strict Content Security Policy** — Extension pages enforce `script-src 'self'; object-src 'self'`, prohibiting remote code execution, `eval()`, and inline scripts.
4. **Cross-Context Message Authentication** — All `chrome.runtime.onMessage` handlers verify `sender.id === chrome.runtime.id` and validate `sender.tab.id` against claimed context, preventing cross-extension and cross-tab message injection.
5. **SSRF Protection** — All outbound `fetch()` calls pass through `validateSafeExternalUrl()`, blocking loopback, private subnets, cloud metadata endpoints, and non-HTTPS protocols.
6. **Isolated Execution Worlds** — Content scripts run in Chromium's `ISOLATED` world. Anti-fingerprinting mitigations (`defender.js`) run in `MAIN` world at `document_start` without `eval()` or `Function()`. UI overlays render inside closed Shadow DOM roots.
7. **Atomic Concurrency** — All `chrome.storage.local` mutations are serialized through `AsyncMutex` to prevent read-modify-write race conditions.
8. **DOM XSS Immunity** — Zero usage of `innerHTML` with interpolated strings. All dynamic DOM construction uses programmatic `createElement()` + `textContent`.

## Reporting a Vulnerability

If you discover a security vulnerability in Vigil:

- **Email:** [mailxatharv@gmail.com](mailto:mailxatharv@gmail.com) (or open a [private security advisory](https://github.com/ath9rv/Vigil/security/advisories/new) on GitHub)
- **Response Time:** 48 hours for initial triage
- **Disclosure Policy:** 90-day coordinated disclosure window

Please include:
- Extension version and browser build (e.g. Chrome 128 / Edge 128)
- Step-by-step reproduction or minimal HTML fixture
- Impact assessment and proof-of-concept
