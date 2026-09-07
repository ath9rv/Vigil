---
name: vigil-project
description: General knowledge about the Vigil project (purpose, tech stack, codebase layout). Activate to understand project context and conventions.
---

# Vigil Project Knowledge

**Vigil** is a privacy and security browser extension built on Chrome Manifest V3. Its purpose is to autonomously detect deceptive UI patterns, data exfiltration, trackers, and privacy policy violations, presenting them to the user via a unified "Trust Engine."

## Tech Stack
- **Platform**: Chrome MV3
- **Language**: TypeScript (strict mode)
- **Frontend/UI**: React + Tailwind CSS + Vite
- **Testing**: Vitest
- **Build System**: Custom Vite configuration for extensions

## Codebase Layout (`Frontend/src/`)
- `background/`: Service worker. Brain of the extension. Holds the `TrustEngine`.
- `content-scripts/`: Isolated world DOM observers.
- `evidence/`: The reasoning core. `TrustEngine`, graph, temporal logic, verdict resolver.
- `network/`: Network interceptors (webRequest, declarativeNetRequest).
- `threat-intel/`: Threat intelligence, tracker blocklists.
- `ui/`: Extension popup UI components.
- `shared/`: Shared types, constants, and storage wrappers.

## Core Conventions
1. **One Canonical Path**: Detectors produce `RawObservation`s. The `TrustEngine` owns the business logic to turn observations into findings.
2. **Deterministic Confidence**: Confidence scores are derived from contradictions and temporal proximity, not hardcoded guesses.
3. **No Direct UI Rendering**: Background scripts do not talk directly to the DOM. Findings are synced via `chrome.storage` to the React popup.
