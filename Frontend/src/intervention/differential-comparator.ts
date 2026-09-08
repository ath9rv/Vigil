/**
 * Vigil Differential Compatibility Comparator
 *
 * Enforces Invariant B: Compatibility must measure POST_INTERVENTION - BASELINE.
 * Pre-existing page defects, pre-existing JavaScript errors, or baseline broken buttons
 * must NEVER be attributed to Vigil.
 */

import {
  BaselineHealth,
  PostHealth,
  DifferentialResult,
  GeometrySnapshot,
} from './types';
import { compatibilityVerifier } from './compatibility-verifier';

export class DifferentialComparator {
  private static instance: DifferentialComparator | null = null;
  private preExistingErrorMessages = new Set<string>();

  public static getInstance(): DifferentialComparator {
    if (!DifferentialComparator.instance) {
      DifferentialComparator.instance = new DifferentialComparator();
    }
    return DifferentialComparator.instance;
  }

  public registerPreExistingError(message: string): void {
    this.preExistingErrorMessages.add(message);
  }

  /**
   * Captures the pre-intervention health baseline of the host environment.
   */
  public captureBaseline(targetElement: Element): BaselineHealth {
    const geometry = compatibilityVerifier.captureGeometry(targetElement);
    const neighborGeometries = new Map<string, GeometrySnapshot>();

    if (targetElement.parentElement) {
      const siblings = Array.from(targetElement.parentElement.children);
      for (let i = 0; i < siblings.length; i++) {
        const sib = siblings[i];
        if (sib !== targetElement) {
          const id = sib.id || `sib-${i}`;
          neighborGeometries.set(id, compatibilityVerifier.captureGeometry(sib));
        }
      }
    }

    const interactiveCount = this.countInteractiveElements(targetElement.parentElement || targetElement);
    const formFieldCount = this.countFormFields(targetElement.parentElement || targetElement);

    return {
      errorCount: this.preExistingErrorMessages.size,
      unhandledRejectionCount: 0,
      interactiveCount,
      formFieldCount,
      geometry,
      neighborGeometries,
      timestamp: Date.now(),
    };
  }

  /**
   * Captures post-intervention health state.
   */
  public capturePostHealth(
    targetElement: Element,
    currentErrorMessages: string[] = []
  ): PostHealth {
    const geometry = targetElement.isConnected
      ? compatibilityVerifier.captureGeometry(targetElement)
      : { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };

    const neighborGeometries = new Map<string, GeometrySnapshot>();

    if (targetElement.parentElement) {
      const siblings = Array.from(targetElement.parentElement.children);
      for (let i = 0; i < siblings.length; i++) {
        const sib = siblings[i];
        if (sib !== targetElement && sib.isConnected) {
          const id = sib.id || `sib-${i}`;
          neighborGeometries.set(id, compatibilityVerifier.captureGeometry(sib));
        }
      }
    }

    const interactiveCount = this.countInteractiveElements(targetElement.parentElement || targetElement);
    const formFieldCount = this.countFormFields(targetElement.parentElement || targetElement);

    return {
      errorCount: currentErrorMessages.length,
      unhandledRejectionCount: 0,
      interactiveCount,
      formFieldCount,
      geometry,
      neighborGeometries,
      timestamp: Date.now(),
    };
  }

  /**
   * Compares baseline health with post-intervention state to compute differential regressions.
   */
  public compare(
    baseline: BaselineHealth,
    post: PostHealth,
    newErrors: Array<{ message: string; stack?: string }> = [],
    targetElement?: Element
  ): DifferentialResult {
    const reasons: string[] = [];

    // 1. Differential Error Analysis
    let newlyIntroducedErrors = 0;
    let isCausallyLinked = false;

    for (const err of newErrors) {
      if (!this.preExistingErrorMessages.has(err.message)) {
        newlyIntroducedErrors++;
        // Check if stack or message references target
        if (targetElement) {
          const id = targetElement.id;
          const className = targetElement.className && typeof targetElement.className === 'string'
            ? targetElement.className.split(' ')[0]
            : '';

          if ((id && err.stack?.includes(id)) || (className && className.length > 3 && err.stack?.includes(className))) {
            isCausallyLinked = true;
          }
        }
      }
    }

    const attribution: 'PRE_EXISTING' | 'INTERVENTION_RELATED' | 'UNKNOWN' = 
      newlyIntroducedErrors === 0 
        ? 'PRE_EXISTING'
        : isCausallyLinked 
          ? 'INTERVENTION_RELATED' 
          : 'UNKNOWN';

    if (newlyIntroducedErrors > 0 && isCausallyLinked) {
      reasons.push(`Introduced ${newlyIntroducedErrors} causally linked JavaScript exceptions`);
    }

    // 2. Differential Interaction Analysis
    const newlyBrokenInteractions = Math.max(0, baseline.interactiveCount - post.interactiveCount);
    if (newlyBrokenInteractions > 0) {
      reasons.push(`Lost clickability on ${newlyBrokenInteractions} interactive elements`);
    }

    // 3. Correlated Layout Shifts
    let correlatedLayoutShifts = 0;
    for (const [id, baseGeo] of baseline.neighborGeometries.entries()) {
      const currentGeo = post.neighborGeometries.get(id);
      if (currentGeo) {
        const dX = Math.abs(currentGeo.x - baseGeo.x);
        const dY = Math.abs(currentGeo.y - baseGeo.y);
        if (dX > 2.0 || dY > 2.0) {
          correlatedLayoutShifts++;
        }
      }
    }

    if (correlatedLayoutShifts > 0) {
      reasons.push(`Correlated layout shifts observed on ${correlatedLayoutShifts} neighboring elements`);
    }

    // 4. Material Worsening Determination
    const materiallyWorsened = (
      newlyBrokenInteractions > 0 ||
      correlatedLayoutShifts > 0 ||
      (newlyIntroducedErrors > 0 && isCausallyLinked)
    );

    return {
      materiallyWorsened,
      baseline,
      post,
      newlyIntroducedErrors,
      newlyBrokenInteractions,
      correlatedLayoutShifts,
      attribution,
      reasons,
      hardSafetyViolation: materiallyWorsened,
    };
  }

  private countInteractiveElements(container: Element): number {
    if (!container || !container.querySelectorAll) return 0;
    let count = 0;
    const candidates = container.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex]');
    for (const el of candidates) {
      if (typeof window !== 'undefined' && 'getComputedStyle' in window) {
        try {
          const style = window.getComputedStyle(el);
          if (style.pointerEvents !== 'none' && style.display !== 'none' && style.visibility !== 'hidden') {
            count++;
          }
        } catch {
          count++;
        }
      } else {
        count++;
      }
    }
    return count;
  }

  private countFormFields(container: Element): number {
    if (!container || !container.querySelectorAll) return 0;
    return container.querySelectorAll('input, select, textarea').length;
  }
}

export const differentialComparator = DifferentialComparator.getInstance();
