---
name: vigil-ui
description: UI and UX guidelines for the Vigil extension popup and injected overlays.
---

# Vigil UI Guidelines

The Vigil UI must communicate complex security findings to non-technical users without causing alarm fatigue.

## Finding Hierarchy
1. **Critical / Blocked**: Requires immediate attention. Renders at the top. High contrast (Red).
2. **Caution**: Potential privacy loss. Intermediate contrast (Yellow/Orange).
3. **Info**: Routine tracker blocking or safe behavior. Low visual noise (Gray/Blue).

## Confidence Visualization
- Never present an inferred finding as absolute truth.
- Use explicit confidence labels: `High`, `Moderate`, `Low`.
- Use the `ExplanationEngine` output to render the rationale. Hide raw node IDs or temporal sequences behind an "Advanced" toggle.

## Extension UX Constraints
- **Popup constraints**: The popup is ephemeral. It can close at any time. Do not hold local component state that isn't easily recovered from `chrome.storage.local`.
- **Dark UI Consistency**: Vigil defaults to a dark theme. Ensure all components use the standard Tailwind dark variants.
- **Injected Overlays**: When injecting highlights into the DOM, use `position: absolute`, high `z-index`, and `pointer-events: none` to avoid breaking page functionality. Use `ShadowDOM` to prevent CSS bleed from the host page.
