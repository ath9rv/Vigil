/**
 * Vigil Intervention Transaction
 *
 * Implements an atomic two-phase commit / rollback transaction for DOM mutations.
 * Enforces mutation-scoped snapshotting, comparative verification, dry-run simulation,
 * 5-second expiration, context binding, and strict ABORTED_STALE state handling.
 *
 * Hard Invariant: A transaction may only mutate or rollback within the exact
 * (origin, navigationId, frameId, nodeIdentity) context in which it was created.
 * Replacement or detached elements must never be modified upon rollback.
 */

import {
  InterventionTransactionRecord,
  TransactionState,
  MutationPlan,
  InterventionSafetyClass,
  CompatibilityLevel,
  InterventionConfidence,
  GeometrySnapshot,
  TransactionContext,
} from './types';
import { compatibilityVerifier, CompatibilityCheckResult } from './compatibility-verifier';

let transactionCounter = 0;

/**
 * Computes a deterministic identity for a DOM element that survives standard attribute mutations
 * but detects replacement by modern frameworks (React / Vue / Angular).
 */
export function computeDeterministicNodeIdentity(
  el: Element,
  origin: string,
  navId: string,
  frameId: string
): string {
  let path = el.tagName;
  let current: Element | null = el;
  let depth = 0;

  while (current && current.parentElement && depth < 5) {
    const parent: Element = current.parentElement;
    const index = Array.prototype.indexOf.call(parent.children, current);
    path = `${parent.tagName}[${index}]>${path}`;
    current = parent;
    depth++;
  }

  const id = el.id ? `#${el.id}` : '';
  const role = el.getAttribute('role') || '';
  return `${origin}::${navId}::${frameId}::${path}${id}:${role}`;
}

export class InterventionTransaction {
  public readonly id: string;
  public record: InterventionTransactionRecord;
  private element: HTMLElement;
  private siblingSnapshots = new Map<Element, GeometrySnapshot>();
  private readonly maxLifetimeMs = 5000;

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

    const frameId = options.frameId || 'main';
    const origin = options.origin || (typeof window !== 'undefined' ? window.location.origin : 'unknown');
    const nodeIdentity = computeDeterministicNodeIdentity(options.element, origin, options.navigationId, frameId);

    const now = Date.now();
    const context: TransactionContext = {
      origin,
      navigationId: options.navigationId,
      frameId,
      nodeIdentity,
    };

    this.record = {
      id: this.id,
      ruleId: options.ruleId,
      context,
      navigationId: options.navigationId,
      frameId,
      origin,
      shadowRootHost: options.shadowRootHost,
      safetyClass: options.safetyClass,
      compatibilityLevel: options.compatibilityLevel,
      detectionConfidence: options.detectionConfidence,
      state: 'PLANNED',
      plan: options.plan,
      createdAt: now,
      expiresAt: now + this.maxLifetimeMs,
      dryRun: !!options.dryRun,
    };
  }

  /**
   * Checks whether the transaction has become stale due to expiration, detachment,
   * node replacement, or context drift.
   */
  public checkStaleness(currentNavId?: string, currentOrigin?: string): boolean {
    if (this.record.state === 'ABORTED_STALE' || this.record.state === 'ROLLED_BACK') {
      return true;
    }

    // 1. Expiration check (> 5000ms)
    if (Date.now() > this.record.expiresAt) {
      this.abortStale('Transaction exceeded 5-second lifetime limit');
      return true;
    }

    // 2. Navigation / origin drift check
    if (currentNavId && currentNavId !== this.record.context.navigationId) {
      this.abortStale(`Navigation drift detected (${this.record.context.navigationId} -> ${currentNavId})`);
      return true;
    }

    if (currentOrigin && currentOrigin !== this.record.context.origin) {
      this.abortStale(`Origin drift detected (${this.record.context.origin} -> ${currentOrigin})`);
      return true;
    }

    // 3. Node attachment check
    if (!this.element || !this.element.isConnected) {
      this.abortStale('Target node was detached from the document');
      return true;
    }

    // 4. Node identity check (detects replacement elements)
    const currentIdentity = computeDeterministicNodeIdentity(
      this.element,
      this.record.context.origin,
      this.record.context.navigationId,
      this.record.context.frameId
    );

    if (currentIdentity !== this.record.context.nodeIdentity) {
      this.abortStale('Target node was replaced by a different element');
      return true;
    }

    return false;
  }

  /**
   * Captures mutation-scoped baseline snapshots.
   */
  public snapshot(): this {
    if (this.checkStaleness()) return this;

    if (this.record.state !== 'PLANNED') {
      throw new Error(`Cannot snapshot transaction in state ${this.record.state}`);
    }

    const geometry = compatibilityVerifier.captureGeometry(this.element);

    const inlineStyles: Record<string, string> = {};
    for (const prop of Object.keys(this.record.plan.styles)) {
      inlineStyles[prop] = (this.element.style as any)[prop] || '';
    }

    const attributes: Record<string, string | null> = {};
    for (const attr of Object.keys(this.record.plan.attributes)) {
      attributes[attr] = this.element.getAttribute(attr);
    }

    this.record.preSnapshot = {
      geometry,
      inlineStyles,
      attributes,
    };

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
    if (this.checkStaleness()) return this;

    if (this.record.state !== 'SNAPSHOTTED') {
      throw new Error(`Cannot apply transaction in state ${this.record.state}`);
    }

    this.record.state = 'APPLYING';

    try {
      if (!this.record.dryRun) {
        for (const [prop, value] of Object.entries(this.record.plan.styles)) {
          (this.element.style as any)[prop] = value;
        }

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
    if (this.checkStaleness()) {
      return {
        result: 'FAIL',
        geometryPreserved: false,
        shiftClass: 'INTERVENTION_CORRELATED_SHIFT',
        parentClickable: false,
        isAttached: false,
        deltaX: 0,
        deltaY: 0,
        deltaWidth: 0,
        deltaHeight: 0,
        reasons: [`Transaction aborted as stale: ${this.record.staleReason}`],
      };
    }

    if (this.record.state !== 'APPLIED') {
      throw new Error(`Cannot verify transaction in state ${this.record.state}`);
    }

    this.record.state = 'VERIFYING';

    if (this.record.dryRun) {
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
    if (this.checkStaleness()) {
      return this.record;
    }

    if (this.record.state !== 'VERIFIED') {
      throw new Error(`Cannot commit transaction in state ${this.record.state}`);
    }

    this.record.state = 'COMMITTED';
    return this.record;
  }

  /**
   * Rolls back mutations. Strictly refuses to mutate replacement or detached elements.
   */
  public rollback(reason: string = 'User or verifier requested rollback'): InterventionTransactionRecord {
    if (this.record.state === 'ROLLED_BACK' || this.record.state === 'ABORTED' || this.record.state === 'ABORTED_STALE') {
      return this.record;
    }

    // Invariant: refuse to mutate detached or replaced elements
    if (!this.element || !this.element.isConnected) {
      return this.abortStale('Cannot rollback detached node');
    }

    const currentIdentity = computeDeterministicNodeIdentity(
      this.element,
      this.record.context.origin,
      this.record.context.navigationId,
      this.record.context.frameId
    );

    if (currentIdentity !== this.record.context.nodeIdentity) {
      return this.abortStale('Cannot rollback replaced node');
    }

    if (!this.record.dryRun && this.record.preSnapshot) {
      for (const [prop, prevValue] of Object.entries(this.record.preSnapshot.inlineStyles)) {
        if (prevValue) {
          (this.element.style as any)[prop] = prevValue;
        } else {
          (this.element.style as any)[prop] = '';
        }
      }

      for (const [attr, prevValue] of Object.entries(this.record.preSnapshot.attributes)) {
        if (prevValue !== null) {
          this.element.setAttribute(attr, prevValue);
        } else {
          this.element.removeAttribute(attr);
        }
      }

      this.element.removeAttribute('data-vigil-intervention-id');
      this.element.removeAttribute('data-vigil-neutralized');
    }

    this.record.state = 'ROLLED_BACK';
    this.record.rolledBackAt = Date.now();
    this.record.rollbackReason = reason;

    return this.record;
  }

  public abortStale(reason: string): InterventionTransactionRecord {
    this.record.state = 'ABORTED_STALE';
    this.record.staleReason = reason;
    this.record.rollbackReason = reason;
    return this.record;
  }

  public abort(reason: string = 'Aborted prior to mutation'): InterventionTransactionRecord {
    this.record.state = 'ABORTED';
    this.record.rollbackReason = reason;
    return this.record;
  }
}
