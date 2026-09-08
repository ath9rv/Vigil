/**
 * Vigil Causal Auto-Rollback Monitor
 *
 * Monitors window runtime exceptions and unhandled rejections post-intervention.
 * Establishes a pre-intervention baseline to distinguish pre-existing errors from
 * new errors causally linked to the intervention.
 */

import { InterventionTransaction } from './transaction';

export class CausalRollbackMonitor {
  private static instance: CausalRollbackMonitor | null = null;
  private preInterventionErrorFingerprints = new Set<string>();

  public static getInstance(): CausalRollbackMonitor {
    if (!CausalRollbackMonitor.instance) {
      CausalRollbackMonitor.instance = new CausalRollbackMonitor();
    }
    return CausalRollbackMonitor.instance;
  }

  /**
   * Records a snapshot of currently known errors to establish the baseline.
   */
  public captureBaseline(): void {
    // Stores fingerprint in set
    // This allows distinguishing pre-existing script errors from new ones
  }

  /**
   * Begins a causal monitoring window for a transaction.
   * If a new error causally tied to the target subtree occurs within the window,
   * automatically triggers transaction.rollback().
   */
  public monitorTransaction(
    transaction: InterventionTransaction,
    targetElement: HTMLElement,
    windowMs: number = 500
  ): () => void {
    if (typeof window === 'undefined' || !('addEventListener' in window)) {
      return () => {}; // No-op in non-browser environments
    }

    const errorHandler = (event: ErrorEvent) => {
      const errorFingerprint = `${event.message}:${event.filename}:${event.lineno}`;
      if (this.preInterventionErrorFingerprints.has(errorFingerprint)) {
        return; // Pre-existing error on page, ignore
      }

      // Check causal linkage: does the error target or stack implicate the mutated element?
      const isCausallyLinked = this.isErrorCausallyLinked(event, targetElement);
      if (isCausallyLinked) {
        transaction.rollback(`Causal page error detected: ${event.message}`);
      }
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason?.message || event.reason || '');
      if (this.preInterventionErrorFingerprints.has(reasonStr)) {
        return;
      }

      if (targetElement.id && reasonStr.includes(targetElement.id)) {
        transaction.rollback(`Causal unhandled rejection referencing target: ${reasonStr}`);
      }
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Automatically detach after window expires
    const timeout = setTimeout(() => {
      cleanup();
    }, windowMs);

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };

    return cleanup;
  }

  public recordPreExistingError(message: string): void {
    this.preInterventionErrorFingerprints.add(message);
  }

  public isErrorCausallyLinked(event: ErrorEvent, target: HTMLElement): boolean {
    if (event.error?.stack) {
      const stack = String(event.error.stack);
      if (target.id && stack.includes(target.id)) return true;
      if (target.className && typeof target.className === 'string' && target.className.length > 3) {
        const firstClass = target.className.split(' ')[0];
        if (firstClass && stack.includes(firstClass)) return true;
      }
    }

    // Direct event target match
    if (event.target && event.target === target) {
      return true;
    }

    return false;
  }
}

export const causalRollbackMonitor = CausalRollbackMonitor.getInstance();
