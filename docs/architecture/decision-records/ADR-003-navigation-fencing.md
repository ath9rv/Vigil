# ADR-003: Strict Navigation Lifecycle Fencing

**Status:** Accepted
**Introduced:** V2.1 RC1
**Enforces:** INV-V4-002

### Context
In single-page applications (SPAs) and rapid browsing, async observations from a terminated navigation could arrive while a new navigation was active, contaminating evidence state across sites.

### Decision
Bind all observations, evidence nodes, and causal hypotheses to a unique `navigationId`. The `TrustEngine` validates `navigationState.isNavigationValid(tabId, navigationId)` and drops stale observations immediately.

### Consequences
- Zero cross-navigation or cross-origin evidence leakage.
- Automatic memory pruning: `dispose(navigationId)` clears all associated nodes and edges.
