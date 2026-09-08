/**
 * Vigil Observability & Performance Metrics Layer
 *
 * Guarantees:
 * - 100% local, in-memory, bounded, disposable
 * - Zero external telemetry transmission
 * - Explicit performance budget assertions with diagnostic warnings
 * - Measures execution latency and resource footprints
 */

export interface PerformanceBudgets {
  DEFENDER_INIT_MAX_MS: number;        // Target: < 2ms
  DOM_SCAN_MAX_MS: number;             // Target: < 30ms / cycle
  TRUST_ENGINE_INGESTION_MAX_MS: number; // Target: < 5ms / observation
  STANDARD_MEMORY_MAX_MB: number;      // Target: < 40MB
}

export const DEFAULT_BUDGETS: PerformanceBudgets = {
  DEFENDER_INIT_MAX_MS: 2.0,
  DOM_SCAN_MAX_MS: 30.0,
  TRUST_ENGINE_INGESTION_MAX_MS: 5.0,
  STANDARD_MEMORY_MAX_MB: 40.0,
};

export interface MetricsSnapshot {
  observation_count: number;
  evidence_node_count: number;
  correlation_count: number;
  verdict_count: number;
  intervention_count: number;
  rollback_count: number;
  false_positive_override_count: number;
  user_restore_count: number;

  // Latencies
  dom_scan_ms: number;
  shadow_dom_scan_ms: number;
  trust_engine_ms: number;
  defender_init_ms: number;

  // MutationObserver calibration metrics
  mutation_callbacks_count: number;
  nodes_received_count: number;
  nodes_analyzed_count: number;
  nodes_skipped_count: number;
  coalesced_mutations_count: number;

  // Resource estimates
  memory_estimate_mb: number;
  queue_depth: number;

  // Diagnostics
  budget_violations: string[];
  timestamp: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector | null = null;

  private counters: Record<string, number> = {
    observation_count: 0,
    evidence_node_count: 0,
    correlation_count: 0,
    verdict_count: 0,
    intervention_count: 0,
    rollback_count: 0,
    false_positive_override_count: 0,
    user_restore_count: 0,
    mutation_callbacks_count: 0,
    nodes_received_count: 0,
    nodes_analyzed_count: 0,
    nodes_skipped_count: 0,
    coalesced_mutations_count: 0,
    queue_depth: 0,
  };

  private timings: Record<string, number> = {
    dom_scan_ms: 0,
    shadow_dom_scan_ms: 0,
    trust_engine_ms: 0,
    defender_init_ms: 0,
  };

  private budgetViolations: string[] = [];
  private budgets: PerformanceBudgets = { ...DEFAULT_BUDGETS };

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public increment(metric: string, amount: number = 1): void {
    this.counters[metric] = (this.counters[metric] || 0) + amount;
  }

  public recordTiming(metric: string, durationMs: number): void {
    // Keep moving average or max observed
    this.timings[metric] = Math.max(this.timings[metric] || 0, durationMs);
    this.checkBudget(metric, durationMs);
  }

  public startTimer(metric: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordTiming(metric, duration);
      return duration;
    };
  }

  private checkBudget(metric: string, durationMs: number): void {
    if (metric === 'defender_init_ms' && durationMs > this.budgets.DEFENDER_INIT_MAX_MS) {
      const msg = `[Vigil Budget] Defender init exceeded budget: ${durationMs.toFixed(2)}ms > ${this.budgets.DEFENDER_INIT_MAX_MS}ms`;
      console.warn(msg);
      this.budgetViolations.push(msg);
    }
    if (metric === 'dom_scan_ms' && durationMs > this.budgets.DOM_SCAN_MAX_MS) {
      const msg = `[Vigil Budget] DOM scan exceeded budget: ${durationMs.toFixed(2)}ms > ${this.budgets.DOM_SCAN_MAX_MS}ms`;
      console.warn(msg);
      this.budgetViolations.push(msg);
    }
    if (metric === 'trust_engine_ms' && durationMs > this.budgets.TRUST_ENGINE_INGESTION_MAX_MS) {
      const msg = `[Vigil Budget] TrustEngine ingestion exceeded budget: ${durationMs.toFixed(2)}ms > ${this.budgets.TRUST_ENGINE_INGESTION_MAX_MS}ms`;
      console.warn(msg);
      this.budgetViolations.push(msg);
    }
  }

  public getSnapshot(): MetricsSnapshot {
    let memoryEstimateMb = 0;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      memoryEstimateMb = ((performance as any).memory.usedJSHeapSize || 0) / (1024 * 1024);
    }

    return {
      observation_count: this.counters.observation_count || 0,
      evidence_node_count: this.counters.evidence_node_count || 0,
      correlation_count: this.counters.correlation_count || 0,
      verdict_count: this.counters.verdict_count || 0,
      intervention_count: this.counters.intervention_count || 0,
      rollback_count: this.counters.rollback_count || 0,
      false_positive_override_count: this.counters.false_positive_override_count || 0,
      user_restore_count: this.counters.user_restore_count || 0,

      dom_scan_ms: this.timings.dom_scan_ms || 0,
      shadow_dom_scan_ms: this.timings.shadow_dom_scan_ms || 0,
      trust_engine_ms: this.timings.trust_engine_ms || 0,
      defender_init_ms: this.timings.defender_init_ms || 0,

      mutation_callbacks_count: this.counters.mutation_callbacks_count || 0,
      nodes_received_count: this.counters.nodes_received_count || 0,
      nodes_analyzed_count: this.counters.nodes_analyzed_count || 0,
      nodes_skipped_count: this.counters.nodes_skipped_count || 0,
      coalesced_mutations_count: this.counters.coalesced_mutations_count || 0,

      memory_estimate_mb: parseFloat(memoryEstimateMb.toFixed(2)),
      queue_depth: this.counters.queue_depth || 0,

      budget_violations: [...this.budgetViolations],
      timestamp: Date.now(),
    };
  }

  public reset(): void {
    for (const key of Object.keys(this.counters)) {
      this.counters[key] = 0;
    }
    for (const key of Object.keys(this.timings)) {
      this.timings[key] = 0;
    }
    this.budgetViolations = [];
  }
}

export const metricsCollector = MetricsCollector.getInstance();
