---
description: Safety pre-flight checks before modifying security-sensitive code.
---

# Vigil Change Safety

Before modifying security-sensitive code or core architecture (like `message-router`, `TrustEngine`, or `navigation-state`), you must execute a safety check:

1. **Identify trust boundaries**: Is this code handling data from the content script, Main World, or an external network? Treat all external inputs as untrusted.
2. **Identify state mutation**: What persistent state is being modified? Is it correctly isolated and cleared per `navigationId`?
3. **Identify race conditions**: Can this code execute out-of-order due to asynchronous browser events? Use async mutexes or atomic operations where necessary.
4. **Identify permissions**: Does this require new manifest permissions?
5. **Identify impacted tests**: What existing tests cover this path?

Never deploy a change to a security-sensitive module without first verifying negative tests (e.g., verifying that a spoofed message or stale event is successfully rejected).
