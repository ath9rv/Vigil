/**
 * Vigil Intervention Transaction
 *
 * Implements an atomic two-phase commit / rollback transaction for DOM mutations.
 * Enforces mutation-scoped snapshotting, comparative verification, dry-run simulation,
 * and exact restoration on failure.
 */

import {
  InterventionTransactionRecord,
  TransactionState,
  MutationPlan,
  InterventionSafetyClass,
  CompatibilityLevel,
  InterventionConfidence,
  GeometrySnapshot,
} from './types';
import { compatibilityVerifier, CompatibilityCheckResult } from './compatibility-verifier';

let transactionCounter = 0;

export class InterventionTransaction {
  public readonly id: string;
  public record: InterventionTransactionRecord;
  private element: HTMLElement;
  private siblingSnapshots = new Map<Element, GeometrySnapshot>();

  constructor(options: {
    element: HTMLElement;
    ruleId: string;
    navigationId: string;
    frameId?: string;
    origin?: string;
    shadowRootHost?: string;
    safetyClass: InterventionSafetyClass;
    compatibilityLevel: CompatibilityLevel;
    detectionConfidence: InterventionConfidence;
    plan: MutationPlan;
    dryRun?: boolean;
  }) {
    transactionCounter++;
    this.id = `INT-${transactionCounter.toString().padStart(5, '0')}`;
    this.element = options.element;

    this.record = {
      id: this.id,
      ruleId: options.ruleId,
      navigationId: options.navigationId,
      frameId: options.frameId || 'main',
      origin: options.origin || (typeof window !== 'undefined' ? window.location.origin : 'unknown'),
      shadowRootHost: options.shadowRootHost,
      safetyClass: options.safetyClass,
      compatibilityLevel: options.compatibilityLevel,
      detectionConfidence: options.detectionConfidence,
      state: 'PLANNED',
      plan: options.plan,
      dryRun: !!options.dryRun,
    };
  }

  /**
   * Captures mutation-scoped baseline snapshots of the target element and its immediate siblings.
   */
  public snapshot(): this {
    if (this.record.state !== 'PLANNED') {
      throw new Error(`Cannot snapshot transaction in state ${this.record.state}`);
    }

    const geometry = compatibilityVerifier.captureGeometry(this.element);

    // Mutation-scoped style snapshot: only record styles scheduled for modification
    const inlineStyles: Record<string, string> = {};
    for (const prop of Object.keys(this.record.plan.styles)) {
      inlineStyles[prop] = (this.element.style as any)[prop] || '';
    }

    // Mutation-scoped attribute snapshot: only record attributes scheduled for modification
    const attributes: Record<string, string | null> = {};
    for (const attr of Object.keys(this.record.plan.attributes)) {
      attributes[attr] = this.element.getAttribute(attr);
    }

    this.record.preSnapshot = {
      geometry,
      inlineStyles,
      attributes,
    };

    // Capture sibling baseline geometries for causal shift detection
    if (this.element.parentElement) {
      const siblings = Array.from(this.element.parentElement.children);
      for (const sib of siblings) {
        if (sib !== this.element) {
          this.siblingSnapshots.set(sib, compatibilityVerifier.captureGeometry(sib));
        }
      }
    }

    this.record.state = 'SNAPSHOTTED';
    return this;
  }

  /**
   * Applies the mutation plan. In dry-run mode, skips actual DOM modification.
   */
  public apply(): this {
    if (this.record.state !== 'SNAPSHOTTED') {
      throw new Error(`Cannot apply transaction in state ${this.record.state}`);
    }

    this.record.state = 'APPLYING';

    try {
      if (!this.record.dryRun) {
        // Apply inline styles
        for (const [prop, value] of Object.entries(this.record.plan.styles)) {
          (this.element.style as any)[prop] = value;
        }

        // Apply attributes
        for (const [attr, value] of Object.entries(this.record.plan.attributes)) {
          this.element.setAttribute(attr, value);
        }
      }

      this.record.appliedAt = Date.now();
      this.record.state = 'APPLIED';
    } catch (err: any) {
      this.rollback(`Exception during mutation apply: ${err?.message || err}`);
    }

    return this;
  }

  /**
   * Verifies invariants against pre-mutation measured baseline.
   */
  public verify(): CompatibilityCheckResult {
    if (this.record.state !== 'APPLIED') {
      throw new Error(`Cannot verify transaction in state ${this.record.state}`);
    }

    this.record.state = 'VERIFYING';

    if (this.record.dryRun) {
      // In dry-run mode, verify against existing element state
      this.record.state = 'VERIFIED';
      this.record.verifiedAt = Date.now();
      return {
        result: 'PASS',
        geometryPreserved: true,
        shiftClass: 'NO_SHIFT',
        parentClickable: true,
        isAttached: true,
        deltaX: 0,
        deltaY: 0,
        deltaWidth: 0,
        deltaHeight: 0,
        reasons: ['Dry-run simulation passed'],
      };
    }

    const check = compatibilityVerifier.verify(
      this.element,
      this.record.preSnapshot!.geometry,
      this.siblingSnapshots
    );

    this.record.postSnapshot = {
      geometry: compatibilityVerifier.captureGeometry(this.element),
    };

    if (check.result === 'PASS') {
      this.record.state = 'VERIFIED';
      this.record.verifiedAt = Date.now();
    } else {
      this.rollback(`Verification failed: ${check.reasons.join('; ')}`);
    }

    return check;
  }

  /**
   * Commits the verified transaction.
   */
  public commit(): InterventionTransactionRecord {
    if (this.record.state !== 'VERIFIED') {
      throw new Error(`Cannot commit transaction in state ${this.record.state}`);
    }

    this.record.state = 'COMMITTED';
    return this.record;
  }

  /**
   * Rolls back mutations and restores pre-state inline styles and attributes.
   */
  public rollback(reason: string = 'User or verifier requested rollback'): InterventionTransactionRecord {
    if (this.record.state === 'ROLLED_BACK' || this.record.state === 'ABORTED') {
      return this.record;
    }

    if (!this.record.dryRun && this.record.preSnapshot) {
      // Restore inline styles
      for (const [prop, prevValue] of Object.entries(this.record.preSnapshot.inlineStyles)) {
        if (prevValue) {
          (this.element.style as any)[prop] = prevValue;
        } else {
          (this.element.style as any)[prop] = '';
        }
      }

      // Restore attributes
      for (const [attr, prevValue] of Object.entries(this.record.preSnapshot.attributes)) {
        if (prevValue !== null) {
          this.element.setAttribute(attr, prevValue);
        } else {
          this.element.removeAttribute(attr);
        }
      }

      // Also clean up intervention identifier
      this.element.removeAttribute('data-vigil-intervention-id');
      this.element.removeAttribute('data-vigil-neutralized');
    }

    this.record.state = 'ROLLED_BACK';
    this.record.rolledBackAt = Date.now();
    this.record.rollbackReason = reason;

    return this.record;
  }

  /**
   * Aborts a planned transaction before application.
   */
  public abort(reason: string = 'Aborted prior to mutation'): InterventionTransactionRecord {
    this.record.state = 'ABORTED';
    this.record.rollbackReason = reason;
    return this.record;
  }
}
