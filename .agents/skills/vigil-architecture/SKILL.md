---
name: vigil-architecture
description: High-level knowledge of Vigil's runtime execution boundaries and state ownership. Activate when determining where a new feature or service should live.
---

# Vigil Architecture

Vigil operates across strict trust boundaries dictated by the Chrome extension model.

## Execution Contexts

1. **Background (Service Worker)**
   - **Role**: The brain. Holds the TrustEngine, state managers, network interceptors.
   - **Constraints**: Suspends when idle. Must persist state to storage. Cannot access DOM.
   - **Trust**: Highly trusted, but must treat all incoming messages as hostile.

2. **Content Scripts (Isolated World)**
   - **Role**: DOM observers, UI overlay injection.
   - **Constraints**: Cannot access page JS variables. Can read/write DOM.
   - **Trust**: Untrusted. Can be influenced by malicious page DOM.

3. **Main World (Injected Scripts)**
   - **Role**: Anti-fingerprinting, prototype pollution detection.
   - **Constraints**: Operates in the page's execution environment.
   - **Trust**: Highly untrusted. The page can spoof or overwrite anything here.

4. **Extension UI (Popup)**
   - **Role**: Render findings.
   - **Constraints**: Short-lived. Cannot do heavy computation.

## State Ownership & Mutation
- **`navigation-state.ts`** owns the source of truth for active navigations.
- **`message-router.ts`** owns ingress routing. It does not own business logic.
- **`TrustEngine`** owns the reasoning state.

## Rules of Engagement
- **DO NOT** duplicate existing services or create parallel architectures.
- **DO NOT** bypass established boundaries (e.g., content scripts talking directly to the UI).
- **DO NOT** introduce state ownership without justification.
