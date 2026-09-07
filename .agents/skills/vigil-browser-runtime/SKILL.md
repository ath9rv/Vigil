---
name: vigil-browser-runtime
description: Expertise in Chrome MV3 lifecycle, service worker suspension, and cross-context messaging. Activate when dealing with manifest permissions, webRequest, or persistent storage.
---

# Vigil Browser Runtime (MV3)

Chrome Manifest V3 imposes strict constraints on how Vigil operates.

## Service Worker Lifecycle
- Background scripts can be suspended at any time by the browser when idle.
- NEVER rely on global in-memory variables for long-term state across navigations.
- State that must survive suspension MUST be stored in `chrome.storage.local` (or session).
- Re-hydrate state upon initialization.

## Network Interception
- `chrome.declarativeNetRequest` is the primary way to block or modify requests.
- `chrome.webRequest` is used for observation (non-blocking) and requires host permissions.

## Messaging
- `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage` are used for cross-context communication.
- Always validate the sender. `message-router.ts` acts as the ingress validation point.
- Handle orphaned ports or disconnected extension contexts gracefully.
