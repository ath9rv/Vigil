---
name: vigil-performance
description: Focus on observer overhead, memory growth, graph pruning, and CPU budgets. Activate when debugging performance issues or implementing new observers.
---

# Vigil Performance

Browser extensions have tight resource budgets. Unoptimized extensions cause jank and drain battery.

## Content Script Budgets
1. **MutationObserver**: Debounce heavily. Avoid processing on every child node insertion. Filter by target selectors before performing heavy work.
2. **Main Thread**: Do not block the main thread. Yield execution for expensive computations.

## Background Budgets
1. **EvidenceGraph Growth**: The graph is append-only per navigation. It MUST be pruned/disposed upon navigation end. Enforce budget limits (e.g., `MAX_NODES_PER_NAVIGATION`) to prevent runaway memory usage on infinite-scroll SPAs.
2. **Temporal Correlation**: Correlation algorithms must be O(N) or O(N log N). Avoid O(N^2) Cartesian products when checking temporal proximity.
3. **Storage I/O**: Batch writes to `chrome.storage.local`. Use atomic updates carefully to avoid race conditions but don't cause thrashing.
