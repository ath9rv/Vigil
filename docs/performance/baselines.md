# Vigil Substrate Performance Baselines (Empirical Measurements)

**Date of Measurement:** 2026-09-12
**Environment:** Chromium MV3 / Node v24.14.1 / Vitest 2.1.9
**Benchmark Suites:**
- `Frontend/src/evidence/substrate-benchmark.test.ts`
- `Frontend/src/evidence/v4/tests/v4-performance.test.ts`
- `Frontend/src/evidence/counterfactual/tests/counterfactual-perf.test.ts`

---

## 1. Measured Substrate Metrics

| Metric | Target Budget | Measured Performance | Margin of Safety | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Observation Creation** | >50,000 obs/sec | **279,486 – 540,997 obs/sec** (2–4µs/obs) | **5.6x – 10.8x faster** | **PASS** |
| **EvidenceGraph Insertion** | <0.05 ms/node | **0.0014 – 0.0026 ms/node** | **19.2x – 35.7x faster** | **PASS** |
| **TrustEngine Ingestion** | <0.10 ms/obs | **0.0091 – 0.0243 ms/obs** | **4.1x – 11.0x faster** | **PASS** |
| **Duplicate Hash Rejection** | <0.05 ms/dup | **0.0086 ms/dup** (50 in 0.43ms) | **5.8x faster** | **PASS** |
| **Verdict Finalization** | <50 ms | **0.75 – 2.61 ms** | **19.1x – 66.6x faster** | **PASS** |
| **Snapshot Extraction (200 nodes)** | <20 ms | **0.17 – 0.96 ms** | **20.8x – 117.6x faster** | **PASS** |
| **Retention Budget Ceiling** | 200 nodes | **Strictly capped at 200** | Zero leakage | **PASS** |
| **FastLane Alert Ceiling** | 50 alerts / 24h | **50 alerts max under 1k flood** | Zero overflow | **PASS** |
| **Mutation Storm Tolerance** | 10,000 mutations | **Absorbed without thread lockup** | Governor degraded | **PASS** |

---

## 2. V4 Temporal Causal Graph Scaling (Measured)

| Event Scale | Target Budget | Measured Latency | Scaling Order | Status |
| :--- | :---: | :---: | :---: | :---: |
| **100 Events** | <10 ms | **4.36 – 6.73 ms** | O(N · K) bounded | **PASS** |
| **1,000 Events** | <50 ms | **27.40 – 38.67 ms** | Sub-linear candidate scan | **PASS** |
| **5,000 Events (Burst)** | Interruptible | **Governor yielded cleanly** | Zero main-thread hang | **PASS** |

---

## 3. V4 Counterfactual Reasoning Baselines (Measured)

| Counterfactual Operation | Target Budget | Measured Latency | Scaling Order | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bounded Snapshot Extraction (500 events)** | <5 ms | **1.529 – 2.071 ms** | O(N) pure traversal | **PASS** |
| **Cached Snapshot Reuse (2 Hypotheses)** | <2 ms overhead | **<0.5 ms cached retrieval** | O(1) map access | **PASS** |
| **Budget Enforcement (0ms limit)** | Immediate yield | **governorYielded = true** | Instantaneous | **PASS** |

### Benchmark Environment Distinction
> **Critical Architectural Note:** Node.js benchmark figures reflect algorithmic upper bounds. Real Chromium Manifest V3 performance includes message-passing serialization overhead across content scripts and service workers. Therefore, all V4 reasoning operations must run within governor-scheduled time slices (max 150ms total cycle, max 50ms per hypothesis traversal, max 25ms per counterfactual evaluation).

---

## 4. Regression Gate
Any commit that degrades ingestion throughput below 50,000 obs/sec or increases finalization latency above 50ms will trigger an automated performance regression failure.

---

## 5. Step 5 Admission Gate (Pre-Execution Criteria)

> **Architectural Note on Planned Backend:** Local ONNX Runtime Web / NLI inference is the **planned execution backend** for Step 5, not yet an established runtime capability. It will only be admitted into the production pipeline once the model weights are bounded, quantized, benchmarked, and verified against the Step 5 Admission Budget.

| Metric | Target Admission Gate | Status |
| :--- | :---: | :---: |
| **Invocation Rate** | Only unresolved cases (<5% of navigations) | **Enforced by AmbiguityGate** |
| **Input Text Ceiling** | Strict ≤500 characters | **Enforced by EscalationRequest** |
| **Main-Thread Blocking** | 0 ms (Worker thread) | **Pre-condition for Step 5** |
| **Timeout Ceiling** | 100 ms max | **Pre-condition for Step 5** |
| **Failure Behavior** | Safe degradation to UNRESOLVED | **INV-V4-020 Certified** |

---

## 6. V4 Gated NLI Evaluation Baselines (Measured)

| NLI Operation | Target Budget | Measured Latency | Status |
| :--- | :---: | :---: | :---: |
| **Deterministic NLI Evaluation (100 runs)** | <50 ms | **1.005 – 1.785 ms** (0.010 – 0.018 ms/eval) | **PASS** |
| **Hypothesis Reconciler Execution** | <1 ms | **<0.1 ms** (pure arithmetic & object clone) | **PASS** |
| **Timeout Degradation (0ms budget)** | Instantaneous | **0.001 ms** (immediate fallback) | **PASS** |

---

## 7. Layer 3 Forensic Explanation Baselines (Measured)

**Benchmark Suite:** `Frontend/src/evidence/forensic-report/tests/report-performance.test.ts`

| Operation | Target Budget | Measured Performance | Margin of Safety | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Report Assembly & Serialization (50 reports)** | <30 ms (<0.6 ms/report) | **4.5 – 9.4 ms (0.09 – 0.19 ms/report)** | **3.2x – 6.7x faster** | **PASS** |
| **Serialized Investigation Report Size** | <10 KB | **3,926 bytes (~3.9 KB)** | **2.5x under budget** | **PASS** |
| **Progressive Disclosure Level Slicing** | <1 ms | **<0.05 ms** (pure object projections) | **>20x faster** | **PASS** |
| **Snapshot State Mutation Check** | 0 mutations | **0 mutations verified (`INV-V4-022`)** | Deep freeze | **PASS** |
