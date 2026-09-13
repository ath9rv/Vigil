# Vigil Threat Model & Defense Strategy

This document specifies the adversarial threat landscape for Vigil in a Chromium Manifest V3 browser environment.

---

## 1. Adversary Profiles

1. **Hostile Web Publisher (Malicious Page Scripts):**
   - Attempts to detect extension presence via DOM probing, timing analysis, or error enumeration.
   - Attempts to access or dismiss ambient warning overlays.
   - Attempts to flood the DOM mutation observer to freeze the browser thread.
2. **Adversarial Extension / Malicious Add-on:**
   - Attempts to forge messages to Vigil's background service worker.
   - Attempts to spoof tab IDs or origin URLs to pollute trust scores.
3. **Deceptive E-Commerce Platform:**
   - Obfuscates countdown timers with CSS animations or loops.
   - Hides mandatory service fees until checkout progression (drip pricing).
   - Pre-checks subscription terms or sneaks basket items.
4. **Fingerprinting & Tracking Network:**
   - Attempts Canvas, WebGL, AudioContext, and WebRTC IP enumeration.
   - Cloaks third-party trackers behind first-party CNAME aliases.

---

## 2. Defensive Countermeasures Matrix

| Threat Vector | Countermeasure | Implementation File |
| :--- | :--- | :--- |
| **DOM Shield Tampering** | Closed Shadow DOM (`{ mode: 'closed' }`) | `Frontend/src/content-scripts/ambient-shield.ts` |
| **Mutation Bomb DoS** | PerformanceGovernor + Token Bucket + Degradation | `Frontend/src/observability/governor.ts` |
| **Cross-Tab Spoofing** | Background `sender.tab.id` verification | `Frontend/src/background/message-router.ts` |
| **Cross-Origin Spoofing** | Compares message hostname to `new URL(sender.url).hostname` | `Frontend/src/background/message-router.ts` |
| **Stale Navigation Leak** | `NavigationState` monotonically increasing sequence | `Frontend/src/background/navigation-state.ts` |
| **Storage Poisoning** | Hard alert ceiling (50) + 24h TTL + AsyncMutex | `Frontend/src/background/fast-lane.ts` |
| **Fingerprint Enumeration** | MAIN-world prototype noise injection | `Frontend/src/content-scripts/defender.ts` |
