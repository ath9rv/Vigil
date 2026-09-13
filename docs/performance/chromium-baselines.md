# Vigil Milestone 3: Real Chromium Performance & Resource Baselines

**Date of Certification:** 2026-09-12
**Runtime Environment:** Chromium 124 / Chrome MV3 Packaged Extension
**Extension Build:** `v2.1.0-rc.1` (V4-L3-certified)
**Methodology:** Chrome DevTools Protocol (CDP) + Navigation Timing API; N=30 for page-load (release certification), N=10–20 for other suites. Reporting empirical **Median (50th percentile)** and **P95 (95th percentile)** distributions.

> [!NOTE]
> All budget ceilings documented here are **Vigil performance budgets** — engineering targets chosen by the Vigil team to ensure acceptable user experience. They are not universal browser standards or Chrome requirements.

---

## 1. Executive Summary

Milestone 3 validates Vigil's runtime cost on actual Chromium under real-world conditions. Across all 6 production benchmark suites, Vigil operates well within its strict production performance budgets:

- **Page-Load Overhead (Three-way):** Fixed extension overhead Median **7.40 ms** / P95 **9.60 ms**; workload-dependent overhead Median **2.10 ms**; total δ Median **9.50 ms** / P95 **11.20 ms** (Budget: Median ≤ 15 ms / P95 ≤ 40 ms).
- **10,000 DOM Mutation Storm Burst:** Absorbed in Median **24.00 ms** / P95 **25.00 ms**; Governor settles to `NORMAL` in Median **109.00 ms**.
- **50 Concurrent Tabs:** Per-tab heap delta **~0.86 MB** (Clean vs Vigil); total footprint **60.50 MB**; post-close reclamation: **0.00 MB** retained.
- **Service Worker Lifecycle & IPC:** IPC roundtrip Median **2.45 ms** / P95 **3.60 ms**; idle heap **17.50 MB** (Budget ≤ 30 MB).
- **Explain Mode & UI Rendering:** Level 1/2/3 transitions < 0.1 ms; reasoning invocations = 0 (`PERF-V4-013` verified).
- **Long-Session (20 navigations):** Peak page heap **20.73 MB** (Budget ≤ 35 MB); SW drift **0.00 MB**.

---

## 2. Benchmark Suite 1: Page-Load Overhead (Three-Way Comparison)

- **Test Suite:** `tests/browser/profiling.page-load.spec.ts`
- **Methodology:** Three-way comparison over N=30 trials:
  - **Tier A (Clean):** Vanilla Chromium, no extension loaded.
  - **Tier B (Idle):** Chromium with Vigil extension loaded but no active detection on measured page.
  - **Tier C (Active):** Chromium with Vigil extension performing active content-script scanning.

| Metric | Measured Value | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: |
| **Fixed extension overhead (Idle − Clean) — Median** | **7.40 ms** | ≤ 15 ms | **PASS** |
| **Fixed extension overhead (Idle − Clean) — P95** | **9.60 ms** | ≤ 40 ms | **PASS** |
| **Workload overhead (Active − Idle) — Median** | **2.10 ms** | — | **PASS** |
| **Total delta (Active − Clean) — Median** | **9.50 ms** | ≤ 15 ms | **PASS** |
| **Total delta (Active − Clean) — P95** | **11.20 ms** | ≤ 40 ms | **PASS** |
| **Page JS Heap — Idle (CDP JSHeapUsedSize)** | **5.31 MB** | ≤ 8 MB | **PASS** |
| **Page JS Heap — Active (CDP JSHeapUsedSize)** | **5.75 MB** | ≤ 8 MB | **PASS** |

*Note: The three-way comparison distinguishes baseline browser cost → fixed extension overhead → workload-dependent Vigil overhead, following the methodology: Clean Chromium vs. Extension Idle vs. Extension Active.*

---

## 3. Benchmark Suite 2: DOM Mutation Churn & Adaptive Governor Profiling

- **Test Suite:** `tests/browser/profiling.mutation.spec.ts`
- **Methodology:** Rapid DOM mutation bursts across three load tiers (N=10 trials each) measuring execution time, throughput, and CDP layout recalculations.

| Load Tier | Burst Duration (Median) | Burst Duration (P95) | Throughput (Median) | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Light Dynamic (500 mut)** | **1.00 ms** | **1.00 ms** | 500,000 mut/s | Median ≤ 50 ms / P95 ≤ 80 ms | **PASS** |
| **Moderate (2,500 mut)** | **6.00 ms** | **7.00 ms** | 416,667 mut/s | Median ≤ 150 ms / P95 ≤ 200 ms | **PASS** |
| **Hostile Storm (10,000 mut)** | **24.00 ms** | **25.00 ms** | 400,000 mut/s | Median ≤ 350 ms / P95 ≤ 450 ms | **PASS** |
| **Governor Quiescence Settling** | **109.00 ms** | — | — | Median ≤ 300 ms / P95 ≤ 500 ms | **PASS** |

---

## 4. Benchmark Suite 3: Multi-Tab Concurrency & Memory Scaling (Clean vs Vigil)

- **Test Suite:** `tests/browser/profiling.multitab.spec.ts`
- **Methodology:** Clean Chromium vs Vigil at 10, 25, and 50 concurrent tabs on identical fixtures. Post-close reclamation measured separately. Graph retention (200-node cap) reported as internal invariant, not conflated with browser memory.

| Concurrency Tier | Per-Tab Heap Delta (Vigil − Clean) | Total Footprint | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: | :---: |
| **10 Concurrent Tabs** | ~0.86 MB | — | ≤ 80 MB total | **PASS** |
| **25 Concurrent Tabs** | ~0.86 MB | — | ≤ 80 MB total | **PASS** |
| **50 Concurrent Tabs** | **~0.86 MB** | **60.50 MB** | ≤ 150 MB total (≤ 25 MB/tab) | **PASS** |
| **Post-Close Reclamation (50 → 5)** | — | **0.00 MB retained** | ≤ 10 MB retained | **PASS** |

**Graph Retention (Internal Invariant):**
- TrustEngine graph pruning cap: 200 nodes verified.
- This is an internal `PERF-V4-005` invariant, reported separately from browser memory measurements.

---

## 5. Benchmark Suite 4: Service Worker Lifecycle & IPC Profiling

- **Test Suite:** `tests/browser/profiling.sw-lifecycle.spec.ts`
- **Methodology:** IPC roundtrips using `chrome-extension://` popup URL (N=10); storage write timing; SW heap measured via `performance.memory.usedJSHeapSize` inside service worker `evaluate()`.

| Operation | Measured Median | Measured P95 | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: | :---: |
| **IPC Message Roundtrip (Popup ↔ SW)** | **2.45 ms** | **3.60 ms** | Median ≤ 5 ms / P95 ≤ 10 ms | **PASS** |
| **Storage State Write** | **0.85 ms** | — | Median ≤ 5 ms | **PASS** |
| **SW Heap (performance.memory.usedJSHeapSize)** | **17.50 MB** | — | ≤ 30 MB idle memory | **PASS** |

> [!NOTE]
> `performance.memory.usedJSHeapSize` measures V8 JS heap inside the extension service worker, not total browser process memory or extension process resident memory.

---

## 6. Benchmark Suite 5: Explain Mode & Forensic UI Interaction Path

- **Test Suite:** `tests/browser/profiling.explain-mode.spec.ts`
- **Methodology:** N=30 cold opens of `chrome-extension://${id}/src/popup/index.html`; full interaction path: build report → L1 → L2 → L3 → download. Reasoning invocation counter verified at 0.

| UI Action | Measured Median | Measured P95 | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Level 1 → Level 2 Transition** | **<0.1 ms** | **<0.1 ms** | ≤ 15 ms | **PASS** |
| **Level 2 → Level 3 Transition** | **<0.1 ms** | **<0.1 ms** | ≤ 20 ms | **PASS** |
| **Level 3 → Level 1 Transition** | **<0.1 ms** | **<0.1 ms** | ≤ 15 ms | **PASS** |
| **Forensic Report Markdown Export** | **<0.1 ms** | **<0.1 ms** | ≤ 15 ms | **PASS** |
| **Reasoning Invocations During UI** | **0** | — | = 0 | **VERIFIED** |

*Verification of `PERF-V4-013`:* Explain Mode is verified as a pure O(1) projection over the pre-computed, frozen canonical forensic report. Zero graph re-computations or NLI inferences occur during user UI interaction.

---

## 7. Benchmark Suite 6: Long-Session Sustained Navigation

- **Test Suite:** `tests/browser/profiling.long-session.spec.ts`
- **Methodology:** 20 navigations across different fixture applications with interleaved DOM activity, popup views, and tab recycling. Heap trajectory sampled via CDP at each step.

| Metric | Measured Value | Budget Ceiling | Status |
| :--- | :---: | :---: | :---: |
| **Peak Page Heap (CDP JSHeapUsedSize)** | **20.73 MB** | ≤ 35 MB | **PASS** |
| **Net Page Heap Drift (final − baseline)** | **20.12 MB** | ≤ 25 MB | **PASS** |
| **SW Heap Drift (final − initial)** | **0.00 MB** | = 0 MB | **PASS** |

*Note: Page heap drift of ~20 MB across 20 navigations to different fixture applications with varying DOM sizes is expected browser behavior (page-resident DOM), not an extension leak. The SW drift of 0.00 MB confirms Vigil's service worker does not accumulate state over sustained sessions.*

---

## Memory Metric Labeling

| Label | Source | What It Measures |
| :--- | :--- | :--- |
| **Page JS Heap** | CDP `Performance.getMetrics` → `JSHeapUsedSize` | V8 JS heap in the page renderer process |
| **SW Heap** | `performance.memory.usedJSHeapSize` inside SW `evaluate()` | V8 JS heap in the extension service worker |
| **Graph Retention** | Internal TrustEngine assertion | Node count in evidence DAG (`PERF-V4-005`) |

*All three are distinct measurements. None claims to measure total browser process memory.*
