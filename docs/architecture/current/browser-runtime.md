# Browser Runtime & Multi-World Isolation

This document outlines how Vigil executes safely across the distinct Chromium execution worlds in Manifest V3.

---

## 1. Execution Worlds in Chromium MV3

To protect user browsing while preventing fingerprinting probes, Vigil bifurcates execution across two distinct JavaScript worlds:

```text
                               CHROMIUM TAB
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
[MAIN WORLD: defender.js]                                 [ISOLATED WORLD: content-scripts]
- Injected at document_start                              - Injected at document_idle
- Runs in target page context                             - Isolated JS context, shared DOM
- Stealth Canvas & WebGL perturbation                     - Scanner & DOM Heuristics
- Hardware persona normalization                          - Urgency Neutralizer
- Prototype camouflage (makeNative)                       - MutationObserver Event Bus
```

---

## 2. MAIN World Defender (`Frontend/src/content-scripts/inject-defender.ts`)

Websites attempt to fingerprint users by probing browser APIs directly in the window context:
* **Canvas Perturbation**: Injects micro-deterministic noise into `toDataURL` and `getImageData` without distorting visible image rendering.
* **WebGL Normalization**: Masks GPU vendor and renderer strings to standard fleet signatures (`ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)`).
* **AudioContext Protection**: Deterministically perturbs `OfflineAudioContext` channel data rendering.
* **Hardware Persona**: Reports standardized hardware concurrency (`8`) and device memory (`8 GB`).
* **Stealth Camouflage (`makeNative`)**: Overrides `Function.prototype.toString` to return `function () { [native code] }` for all patched getters, preventing anti-adblock detection scripts (e.g. CreepJS) from raising "Lie Detected" flags.

---

## 3. ISOLATED World Content Scripts (`Frontend/src/content-scripts/`)

Content scripts run in an isolated environment with full DOM access:
* **`scanner.ts`**: Evaluates declarative JSON rules across modules M1 (Deceptive Commerce), M2 (Threat Shield), M3 (Privacy Consent), M4 (Attention Addiction), and M5 (Social Proof).
* **`cookie-consent-handler.ts`**: Automatically detects Consent Management Platforms (OneTrust, Cookiebot, etc.) and programmatically clicks "Reject All" or "Essential Only".
* **`ambient-shield.ts`**: Traverses open Shadow DOM boundaries to uncover deeply encapsulated deceptive elements.
* **`event-bus.ts`**: Batches and throttles DOM mutations using `requestIdleCallback` to guarantee less than 30ms CPU budget utilization.

---

## 4. Background Service Worker (`Frontend/src/background/`)

* **Message Router (`message-router.ts`)**: Type-safe message dispatcher managing IPC between popup, content scripts, and storage.
* **Navigation State (`navigation-state.ts`)**: Tracks tab lifecycles and generates unique navigation IDs to eliminate cross-page evidence leaks.
* **Fast Lane (`fast-lane.ts`)**: Zero-network urgent notification pipeline for severe credential phishing warnings.
* **AsyncMutex (`Frontend/src/shared/storage.ts`)**: Serializes concurrent reads/writes to `chrome.storage.local`, eliminating lost-update race conditions across asynchronous workers.
