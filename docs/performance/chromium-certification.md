# Vigil Chromium Performance Certification

## Purpose

This document records the real-Chromium performance validation methodology and current certification status.

## Methodology

Performance is evaluated in real Chromium using Playwright and Chrome DevTools Protocol instrumentation.

Where practical, tests distinguish:

1. Clean browser baseline.
2. Vigil loaded but idle.
3. Vigil loaded and actively processing the workload.

Repeated trials are used for important measurements. Engineering profiles report median and p95; release-grade external claims should use sufficiently large samples to support the stated statistical interpretation.

## Metrics

The profiling program covers:

- Page-load overhead.
- Content-script and reasoning work.
- JavaScript heap and clearly labeled memory measures.
- Mutation workload and governor transitions.
- Service-worker lifecycle and messaging.
- 10/25/50-tab stress.
- Post-cleanup memory behavior.
- Explain Mode and forensic report rendering.
- Long-session stability.
- ONNX/NLI worker cold and warm inference.

## Current recorded result

The latest recorded browser regression state includes:

- 27/27 Playwright Chromium specifications passing.
- Actual packaged extension runtime exercised in Chromium.
- Real ONNX/NLI Web Worker profiling included.

Milestone-specific budgets are **Vigil engineering targets**, not browser standards.

## Interpretation rule

A benchmark passing its numerical budget does not imply that the web ecosystem is universally safe or that every machine will see the same result. Results must always be interpreted with browser version, operating environment, workload, and trial count.
