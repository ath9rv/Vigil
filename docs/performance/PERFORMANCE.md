# Vigil Performance Contract

## Philosophy

Performance is treated as a security and product constraint. Vigil should degrade intelligently under load without sacrificing higher-priority protections.

### Priority

```text
P0 — Security
P1 — Privacy / core defensive behavior
P2 — Contextual reasoning and richer explanation
```

P2 work may be shed under pressure. P0/P1 protection must remain available.

## Existing rules

- Reasoning must be governor-scheduled.
- Storage and alert collections are bounded.
- V4 graph retention is explicitly limited.
- Explain Mode renders cached/frozen outputs and does not rerun reasoning.
- NLI inference is admitted only from genuine ambiguity.

## Chromium certification

The real-browser program measures median and p95 under repeated trials and distinguishes browser/runtime measurements from Node/jsdom microbenchmarks.

Important memory terminology is kept precise:

- `JSHeapUsedSize` — JavaScript heap metric from CDP.
- Browser process memory — a separate operating-system/browser metric when measured.
- Extension/service-worker memory — must be reported only when the measurement method actually isolates it.

## Engineering budgets

Budgets such as page-load overhead, reasoning latency, service-worker startup, model inference, memory ceilings, and report rendering are **Vigil targets selected for engineering control**. They are not external standards.

## Long-session requirement

Performance validation should include repeated navigation, findings, worker lifecycle events, Explain Mode usage, cleanup, and multi-tab behavior to identify accumulation or retention problems that short benchmarks may miss.
