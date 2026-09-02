# Security Policy

## Supported Versions

Only the latest release of Project Vigil is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Architecture & Core Commitments

Project Vigil is built on a **Zero-Trust Client Architecture**:
1. **Zero Secret Storage:** The extension bundle contains zero private API keys, cloud credentials, or production secrets. Client-side secrets are considered public by design.
2. **Zero Involuntary Telemetry:** No user browsing history, keystrokes, form entries, or telemetry metrics are collected or transmitted to external servers.
3. **Isolated Execution Worlds:**
   * Content scripts evaluating hostile DOM structures execute in the Chromium `ISOLATED` world.
   * Prototype mitigations (`defender.js`) execute in the `MAIN` world at `document_start` and never evaluate un-sanitized string inputs via `eval()` or `Function()`.
   * UI overlays render inside closed Shadow DOM roots with isolated stylesheets to prevent DOM clobbering and CSS injection attacks.
4. **Atomic Concurrency:** All modifications to local extension state are serialized through an asynchronous mutex (`AsyncMutex`) to prevent LevelDB read-modify-write race conditions.

## Reporting a Vulnerability

If you discover a potential security vulnerability in Project Vigil, please report it responsibly:

* **Email:** mailxatharv@gmail.com (or open a private security advisory on GitHub)
* **Expected Response Time:** 48 hours for initial triage.
* **Disclosure Policy:** We request a 90-day coordinated disclosure window before public publication.

Please include:
* Extension version and browser build (e.g. Chrome 128 / Edge 128)
* Step-by-step reproduction steps or a minimal HTML test fixture
* Impact assessment and proof-of-concept
