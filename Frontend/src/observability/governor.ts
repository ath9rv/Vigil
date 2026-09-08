/**
 * Vigil Adaptive Performance Governor
 *
 * Automatically monitors extension execution pressure and adapts operational mode:
 * - NORMAL:     Standard processing; all P0-P3 detectors active.
 * - PRESSURED:  Elevated mutation frequency (> 200/s) or scan latency (> 25ms).
 *               P3 enrichment deferred to idle time; batch coalesce window widened.
 * - DEGRADED:   Hostile render storm (> 500/s) or scan latency (> 40ms).
 *               P2 contextual scans throttled; P3 suspended; P0/P1 security/privacy preserved.
 * - RECOVERING: Workload normalized for 3 consecutive cycles; stepping back up to NORMAL.
 *
 * Core guarantee: Security (P0) and Privacy (P1) protections NEVER shut down.
 */

import { metricsCollector } from './metrics';

export type GovernorState = 
  | 'NORMAL' 
  | 'PRESSURED' 
  | 'DEGRADED' 
  | 'RECOVERING';

export interface GovernorThresholds {
  PRESSURED_MUTATION_RATE: number; // mutations per second
  DEGRADED_MUTATION_RATE: number;
  PRESSURED_LATENCY_MS: number;
  DEGRADED_LATENCY_MS: number;
  RECOVERY_CYCLES_NEEDED: number;
}

export const DEFAULT_THRESHOLDS: GovernorThresholds = {
  PRESSURED_MUTATION_RATE: 200,
  DEGRADED_MUTATION_RATE: 500,
  PRESSURED_LATENCY_MS: 25.0,
  DEGRADED_LATENCY_MS: 40.0,
  RECOVERY_CYCLES_NEEDED: 3,
};

export class PerformanceGovernor {
  private static instance: PerformanceGovernor | null = null;

  private state: GovernorState = 'NORMAL';
  private thresholds: GovernorThresholds = { ...DEFAULT_THRESHOLDS };
  private consecutiveCleanCycles = 0;
  private stateChangeListeners: ((newState: GovernorState, oldState: GovernorState) => void)[] = [];

  public static getInstance(): PerformanceGovernor {
    if (!PerformanceGovernor.instance) {
      PerformanceGovernor.instance = new PerformanceGovernor();
    }
    return PerformanceGovernor.instance;
  }

  public getState(): GovernorState {
    return this.state;
  }

  /**
   * Reports an operational cycle to the governor to evaluate system pressure.
   */
  public reportCycle(metrics: {
    mutationsInWindow: number;
    windowDurationMs: number;
    scanDurationMs: number;
  }): GovernorState {
    const ratePerSec = metrics.windowDurationMs > 0
      ? (metrics.mutationsInWindow / metrics.windowDurationMs) * 1000
      : 0;

    const isHighRate = ratePerSec >= this.thresholds.DEGRADED_MUTATION_RATE;
    const isHighLatency = metrics.scanDurationMs >= this.thresholds.DEGRADED_LATENCY_MS;

    const isMediumRate = ratePerSec >= this.thresholds.PRESSURED_MUTATION_RATE;
    const isMediumLatency = metrics.scanDurationMs >= this.thresholds.PRESSURED_LATENCY_MS;

    const oldState = this.state;

    if (isHighRate || isHighLatency) {
      // Immediate step-down to DEGRADED under severe load
      this.state = 'DEGRADED';
      this.consecutiveCleanCycles = 0;
    } else if (isMediumRate || isMediumLatency) {
      if (this.state === 'DEGRADED') {
        this.state = 'RECOVERING';
      } else {
        this.state = 'PRESSURED';
      }
      this.consecutiveCleanCycles = 0;
    } else {
      // Workload is within normal bounds
      this.consecutiveCleanCycles++;

      if (this.state === 'DEGRADED') {
        this.state = 'RECOVERING';
      } else if (this.state === 'RECOVERING' && this.consecutiveCleanCycles >= this.thresholds.RECOVERY_CYCLES_NEEDED) {
        this.state = 'PRESSURED';
        this.consecutiveCleanCycles = 0;
      } else if (this.state === 'PRESSURED' && this.consecutiveCleanCycles >= this.thresholds.RECOVERY_CYCLES_NEEDED) {
        this.state = 'NORMAL';
        this.consecutiveCleanCycles = 0;
      }
    }

    if (this.state !== oldState) {
      this.notifyListeners(this.state, oldState);
    }

    return this.state;
  }

  /**
   * Determines whether an operation of a given priority should execute under current load.
   */
  public shouldExecute(priority: 'P0_CRITICAL' | 'P1_PRIVACY' | 'P2_CONTEXTUAL' | 'P3_ENRICHMENT'): boolean {
    if (priority === 'P0_CRITICAL' || priority === 'P1_PRIVACY') {
      return true; // P0 and P1 NEVER get dropped
    }

    if (this.state === 'DEGRADED') {
      // In degraded mode, drop P3 and throttle P2
      return false;
    }

    if (this.state === 'PRESSURED') {
      // In pressured mode, execute P2 but defer P3
      return priority !== 'P3_ENRICHMENT';
    }

    return true; // NORMAL: execute all
  }

  /**
   * Returns recommended MutationObserver debounce window in milliseconds.
   */
  public getRecommendedCoalesceWindowMs(): number {
    switch (this.state) {
      case 'DEGRADED':
        return 400; // Widen coalesce window to absorb storm
      case 'PRESSURED':
        return 250;
      case 'RECOVERING':
        return 200;
      case 'NORMAL':
      default:
        return 150;
    }
  }

  public onStateChange(listener: (newState: GovernorState, oldState: GovernorState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(newState: GovernorState, oldState: GovernorState): void {
    for (const listener of this.stateChangeListeners) {
      try {
        listener(newState, oldState);
      } catch (err) {
        console.warn('[Vigil Governor] Listener error:', err);
      }
    }
  }

  public reset(): void {
    this.state = 'NORMAL';
    this.consecutiveCleanCycles = 0;
  }
}

export const performanceGovernor = PerformanceGovernor.getInstance();
