/**
 * Vigil Centralized Intervention & Reversibility Manager
 *
 * Implements the Two-Axis Decision Gate & Transactional Safety Pipeline:
 * Observe -> Assess Blast Radius -> Two-Axis Decision -> Transaction (Snapshot -> Mutate -> Verify -> Commit/Rollback).
 *
 * Key guarantees:
 * 1. Two-axis separation: Detection Confidence != Intervention Safety
 * 2. Absolute form/auth/payment immutability (Level 4 BLOCKED)
 * 3. Mutation-scoped snapshotting and comparative compatibility verification
 * 4. Automatic causal error rollback monitoring
 * 5. Dry-run simulation and global protection modes (ACTIVE, SAFE_ONLY, OBSERVE_ONLY, OFF)
 * 6. Site Governance: domain overrides preserve passive TrustEngine intelligence
 * 7. Hard Safety Gates override numerical diagnostic scores
 * 8. 100% reversible via 1-click restore
 */

import {
  InterventionRecord,
  ApplyInterventionOptions,
  ProtectionMode,
  InterventionSafetyClass,
  InterventionConfidence,
  MutationPlan,
} from './types';
import { blastRadiusEstimator } from './blast-radius';
import { InterventionTransaction } from './transaction';
import { causalRollbackMonitor } from './auto-rollback';
import { siteGovernance } from './site-governance';
import { differentialComparator } from './differential-comparator';
import { compatibilityScorer } from './compatibility-scorer';

export class InterventionManager {
  private static instance: InterventionManager | null = null;

  private protectionMode: ProtectionMode = 'ACTIVE';
  private dryRun = false;

  // Active transactions map by transaction/intervention ID
  private transactions = new Map<string, InterventionTransaction>();

  // Registry of all performed interventions for popup & telemetry
  private records = new Map<string, { record: InterventionRecord; elementRef: WeakRef<HTMLElement> }>();

  public static getInstance(): InterventionManager {
    if (!InterventionManager.instance) {
      InterventionManager.instance = new InterventionManager();
    }
    return InterventionManager.instance;
  }

  public setProtectionMode(mode: ProtectionMode): void {
    this.protectionMode = mode;
  }

  public getProtectionMode(): ProtectionMode {
    return this.protectionMode;
  }

  public setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  public isDryRun(): boolean {
    return this.dryRun;
  }

  /**
   * Applies a safe, non-destructive intervention to a target element.
   * Follows the two-axis safety matrix: Detection Confidence x Intervention Safety.
   */
  public applyIntervention(
    element: HTMLElement,
    options: ApplyInterventionOptions
  ): InterventionRecord | null {
    if (!element || !(element instanceof HTMLElement)) {
      return null;
    }

    if (this.protectionMode === 'OFF') {
      return null;
    }

    // 0. Site Governance Check
    const domain = options.origin
      ? new URL(options.origin).hostname
      : typeof window !== 'undefined'
        ? window.location.hostname
        : 'unknown';

    if (!siteGovernance.shouldMutate(domain)) {
      return this.recordAdvisory(element, options, 'SAFE', 'SITE_GOVERNANCE_OVERRIDE');
    }

    // 1. Blast Radius Assessment
    const assessment = blastRadiusEstimator.assess(element);
    const confidence = options.confidenceState || 'HIGH';

    // 2. Two-Axis Decision Gate
    if (!this.isAuthorizedToMutate(confidence, assessment.safetyClass)) {
      // Inadmissible for mutation: record advisory finding only
      return this.recordAdvisory(element, options, assessment.safetyClass, 'DECISION_GATE_BLOCKED');
    }

    // Global Protection Mode Enforcement
    if (this.protectionMode === 'OBSERVE_ONLY') {
      return this.recordAdvisory(element, options, assessment.safetyClass, 'OBSERVE_ONLY_MODE');
    }

    if (this.protectionMode === 'SAFE_ONLY' && assessment.safetyClass !== 'SAFE') {
      return this.recordAdvisory(element, options, assessment.safetyClass, 'SAFE_ONLY_DOWNGRADED');
    }

    // 3. Capture Pre-Intervention Baseline Health
    const baselineHealth = differentialComparator.captureBaseline(element);

    // 4. Build Mutation Plan
    const mutationType = options.mutationType || 'VISUAL_FREEZE';
    const plan: MutationPlan = {
      styles: {
        opacity: '0.3',
        'pointer-events': 'none',
        animation: 'none',
        transition: 'none',
      },
      attributes: {
        'data-vigil-neutralized': 'true',
        title: `Vigil: ${options.reason} (Click Vigil shield in toolbar to restore)`,
      },
      freezeText: options.freezeText,
    };

    // 5. Construct Transaction
    const isDryRunActive = options.dryRun !== undefined ? options.dryRun : this.dryRun;
    const startTime = performance.now();
    const transaction = new InterventionTransaction({
      element,
      ruleId: options.ruleId || 'M1-URGENCY-NEUTRALIZE',
      navigationId: options.navigationId || 'nav-current',
      frameId: options.frameId || 'main',
      origin: options.origin,
      safetyClass: assessment.safetyClass,
      compatibilityLevel: assessment.compatibilityLevel,
      detectionConfidence: confidence,
      plan,
      dryRun: isDryRunActive,
    });

    // 6. Execute Transaction: Snapshot -> Apply -> Verify -> Commit/Rollback
    transaction.snapshot();
    transaction.apply();
    const verification = transaction.verify();
    const durationMs = performance.now() - startTime;

    // 7. Post-Health & Differential Assessment
    const postHealth = differentialComparator.capturePostHealth(element);
    const diffResult = differentialComparator.compare(baselineHealth, postHealth, [], element);

    // 8. Multi-Vector Diagnostic Scoring & Hard Safety Gates
    const diagnosticScore = compatibilityScorer.score({
      check: verification,
      diffHealth: diffResult,
      assessment,
      durationMs,
    });

    const isSuccessful = verification.result === 'PASS' && diagnosticScore.hardSafetyGatePassed;

    if (isSuccessful) {
      transaction.commit();
      // Attach Causal Auto-Rollback Monitor for 500ms
      causalRollbackMonitor.monitorTransaction(transaction, element, 500);
    } else {
      transaction.rollback(`Safety gate failure: ${verification.reasons.concat(diffResult.reasons).join('; ')}`);
    }

    // 9. Record in registry
    const interventionId = transaction.id;
    element.setAttribute('data-vigil-intervention-id', interventionId);
    this.transactions.set(interventionId, transaction);

    const record: InterventionRecord = {
      id: interventionId,
      targetSelector: this.buildSelector(element),
      elementTag: element.tagName.toLowerCase(),
      reason: options.reason,
      triggeringEvidenceIds: options.triggeringEvidenceIds || [],
      confidenceState: confidence,
      mutationType,
      timestamp: Date.now(),
      layoutPreserved: verification.geometryPreserved,
      rollbackAvailable: true,
      verificationResult: isSuccessful ? 'PASS' : 'FAIL',
      status: isSuccessful ? 'ACTIVE' : 'FAILED',
      transactionId: transaction.id,
      diagnosticScore,
    };

    this.records.set(interventionId, {
      record,
      elementRef: new WeakRef(element),
    });

    return record;
  }

  /**
   * Two-Axis Decision Gate:
   * Maps Detection Confidence x Intervention Safety into an authorization decision.
   */
  public isAuthorizedToMutate(
    confidence: InterventionConfidence,
    safetyClass: InterventionSafetyClass
  ): boolean {
    if (safetyClass === 'BLOCKED') {
      return false; // Absolute invariant: BLOCKED elements are NEVER mutated
    }

    if (confidence === 'LOW' || confidence === 'MODERATE' || confidence === 'CONTESTED') {
      return false; // Insufficient confidence to mutate host DOM
    }

    if (safetyClass === 'RESTRICTED') {
      return false; // Requires explicit user approval
    }

    // At HIGH or CONFIRMED confidence, SAFE and CAUTIOUS mutations are permitted
    return safetyClass === 'SAFE' || safetyClass === 'CAUTIOUS';
  }

  /**
   * Restores an element to its exact pre-intervention state via transaction rollback.
   */
  public restoreIntervention(interventionId: string): boolean {
    const transaction = this.transactions.get(interventionId);
    if (transaction) {
      transaction.rollback('User or extension requested restore');
    }

    const entry = this.records.get(interventionId);
    if (entry) {
      const el = entry.elementRef.deref();
      if (el && el instanceof HTMLElement) {
        el.removeAttribute('data-vigil-intervention-id');
        el.removeAttribute('data-vigil-neutralized');
      }
      entry.record.status = 'RESTORED';
      return true;
    }
    return false;
  }

  /**
   * Restores all currently active interventions.
   */
  public restoreAll(): number {
    let restoredCount = 0;
    for (const [id, entry] of this.records.entries()) {
      if (entry.record.status === 'ACTIVE') {
        if (this.restoreIntervention(id)) {
          restoredCount++;
        }
      }
    }
    return restoredCount;
  }

  public getInterventions(): InterventionRecord[] {
    return Array.from(this.records.values()).map(e => e.record);
  }

  public getIntervention(id: string): InterventionRecord | undefined {
    return this.records.get(id)?.record;
  }

  public getActiveCount(): number {
    return Array.from(this.records.values()).filter(e => e.record.status === 'ACTIVE').length;
  }

  public clear(): void {
    this.restoreAll();
    this.records.clear();
    this.transactions.clear();
  }

  private recordAdvisory(
    element: HTMLElement,
    options: ApplyInterventionOptions,
    safetyClass: InterventionSafetyClass,
    reason: string
  ): InterventionRecord {
    const id = `vigil-adv-${crypto.randomUUID()}`;
    const record: InterventionRecord = {
      id,
      targetSelector: this.buildSelector(element),
      elementTag: element.tagName.toLowerCase(),
      reason: `${options.reason} [Advisory: ${reason}]`,
      triggeringEvidenceIds: options.triggeringEvidenceIds || [],
      confidenceState: options.confidenceState || 'HIGH',
      mutationType: 'ATTRIBUTE_FLAG',
      timestamp: Date.now(),
      layoutPreserved: true,
      rollbackAvailable: false,
      verificationResult: 'PASS',
      status: 'ACTIVE',
    };

    this.records.set(id, {
      record,
      elementRef: new WeakRef(element),
    });

    return record;
  }

  private buildSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.trim().split(/\s+/)[0];
      if (firstClass) return `${element.tagName.toLowerCase()}.${firstClass}`;
    }
    return element.tagName.toLowerCase();
  }
}

export const interventionManager = InterventionManager.getInstance();
