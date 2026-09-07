---
name: vigil-security
description: Focus on trust boundaries, DOM injection, message spoofing, origin confusion, and supply-chain concerns. Activate when performing a security task.
---

# Vigil Security Model

Vigil processes highly untrusted, actively hostile data (web pages, trackers, malicious scripts).

## Threat Vectors
1. **DOM Injection**: Never insert raw `innerHTML` from untrusted sources. Use safe DOM APIs (`textContent`, `createElement`).
2. **Message Spoofing**: Content scripts can be compromised by the page. The background worker MUST validate the sender tab, origin, and format of all incoming messages.
3. **Origin Confusion**: Ensure findings are attributed to the correct top-level origin, not an isolated iframe or redirect intermediary.
4. **Race Conditions / TOCTOU**: Do not rely on asynchronous checks if the state might have mutated in the interim (e.g., navigation changing out from under an async gap).
5. **Permission Escalation**: Minimize requested permissions. Use optional permissions when possible.

## Defensive Coding
- Use strict type validation at trust boundaries.
- Employ the `TrustEngine` to buffer, validate, and sanity-check evidence.
