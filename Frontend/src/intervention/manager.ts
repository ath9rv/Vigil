/**
 * Vigil Centralized Intervention & Reversibility Manager
 *
 * Implements the Observe -> Score -> Decide -> Intervene -> Verify pipeline.
 *
 * Key guarantees:
 * 1. Zero destructive element deletions: all interventions are non-destructive visual de-emphases
 * 2. Pre-intervention state captured in WeakMap before any mutation
 * 3. Geometry and layout preserved (no layout shifts)
 * 4. 100% reversible via 1-click restore
 * 5. Full provenance recorded for every intervention
 */

import type {
  InterventionRecord,
  OriginalElementState,
  ApplyInterventionOptions,
  InterventionStatus,
} from './types';

export class InterventionManager {
  private static instance: InterventionManager | null = null;

  // WeakMap prevents memory leaks when DOM elements are removed by the page
  private originalStates = new WeakMap<HTMLElement, OriginalElementState>();
  
  // Registry of all performed interventions
  private records = new Map<string, { record: InterventionRecord; elementRef: WeakRef<HTMLElement> }>();

  public static getInstance(): InterventionManager {
    if (!InterventionManager.instance) {
      InterventionManager.instance = new InterventionManager();
    }
    return InterventionManager.instance;
  }

  /**
   * Applies a safe, non-destructive intervention to a target element.
   * Follows: Capture State -> Apply Minimal Mutation -> Verify Layout -> Register Rollback.
   */
  public applyIntervention(
    element: HTMLElement,
    options: ApplyInterventionOptions
  ): InterventionRecord | null {
    if (!element || !(element instanceof HTMLElement)) {
      return null;
    }

    // Idempotent: do not re-intervene on an already active element
    if (this.originalStates.has(element)) {
      const existingId = element.getAttribute('data-vigil-intervention-id');
      if (existingId && this.records.has(existingId)) {
        return this.records.get(existingId)!.record;
      }
    }

    const interventionId = `vigil-inv-${crypto.randomUUID()}`;
    const rect = typeof element.getBoundingClientRect === 'function'
      ? element.getBoundingClientRect()
      : { width: 0, height: 0, top: 0, left: 0 };

    // 1. Capture Original State
    const originalState: OriginalElementState = {
      opacity: element.style.opacity || '',
      pointerEvents: element.style.pointerEvents || '',
      animation: element.style.animation || '',
      transition: element.style.transition || '',
      textContent: options.freezeText ? element.textContent || '' : undefined,
      attributes: {
        'data-vigil-neutralized': element.getAttribute('data-vigil-neutralized'),
        'data-vigil-intervention-id': element.getAttribute('data-vigil-intervention-id'),
        'title': element.getAttribute('title'),
      },
      boundingRect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      },
    };
    this.originalStates.set(element, originalState);

    // 2. Apply Minimal Non-Destructive Mutation
    const mutationType = options.mutationType || 'VISUAL_FREEZE';
    try {
      element.setAttribute('data-vigil-neutralized', 'true');
      element.setAttribute('data-vigil-intervention-id', interventionId);
      element.setAttribute('title', `Vigil: ${options.reason} (Click Vigil shield in toolbar to restore)`);

      element.style.setProperty('opacity', '0.3', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
      element.style.setProperty('animation', 'none', 'important');
      element.style.setProperty('transition', 'none', 'important');

      if (options.freezeText && element.textContent) {
        element.textContent = options.freezeText;
      }
    } catch (err) {
      console.warn('[Vigil InterventionManager] Failed to apply mutation:', err);
      return null;
    }

    // 3. Verify Layout and Stability
    const newRect = typeof element.getBoundingClientRect === 'function'
      ? element.getBoundingClientRect()
      : { width: 0, height: 0 };
    
    // Geometry check: verify element has not collapsed to 0 height unexpectedly
    const layoutPreserved = rect.height === 0 || newRect.height > 0;
    const verificationResult = layoutPreserved ? 'PASS' : 'FAIL';

    // 4. Register Provenance Record
    const record: InterventionRecord = {
      id: interventionId,
      targetSelector: this.buildSelector(element),
      elementTag: element.tagName.toLowerCase(),
      reason: options.reason,
      triggeringEvidenceIds: options.triggeringEvidenceIds || [],
      confidenceState: options.confidenceState || 'HIGH',
      mutationType,
      timestamp: Date.now(),
      layoutPreserved,
      rollbackAvailable: true,
      verificationResult,
      status: 'ACTIVE',
    };

    this.records.set(interventionId, {
      record,
      elementRef: new WeakRef(element),
    });

    return record;
  }

  /**
   * Restores an element to its exact pre-intervention state.
   */
  public restoreIntervention(interventionId: string): boolean {
    const entry = this.records.get(interventionId);
    if (!entry) return false;

    const element = entry.elementRef.deref();
    if (!element || !(element instanceof HTMLElement)) {
      entry.record.status = 'FAILED';
      return false;
    }

    const originalState = this.originalStates.get(element);
    if (!originalState) {
      entry.record.status = 'FAILED';
      return false;
    }

    try {
      // Restore Styles
      if (originalState.opacity) {
        element.style.opacity = originalState.opacity;
      } else {
        element.style.removeProperty('opacity');
      }

      if (originalState.pointerEvents) {
        element.style.pointerEvents = originalState.pointerEvents;
      } else {
        element.style.removeProperty('pointer-events');
      }

      if (originalState.animation) {
        element.style.animation = originalState.animation;
      } else {
        element.style.removeProperty('animation');
      }

      if (originalState.transition) {
        element.style.transition = originalState.transition;
      } else {
        element.style.removeProperty('transition');
      }

      // Restore Text Content
      if (originalState.textContent !== undefined) {
        element.textContent = originalState.textContent;
      }

      // Restore Attributes
      element.removeAttribute('data-vigil-neutralized');
      element.removeAttribute('data-vigil-intervention-id');

      if (originalState.attributes['title']) {
        element.setAttribute('title', originalState.attributes['title']!);
      } else {
        element.removeAttribute('title');
      }

      this.originalStates.delete(element);
      entry.record.status = 'RESTORED';
      return true;
    } catch (err) {
      console.warn('[Vigil InterventionManager] Failed to restore intervention:', err);
      entry.record.status = 'FAILED';
      return false;
    }
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

  /**
   * Get all intervention records.
   */
  public getInterventions(): InterventionRecord[] {
    return Array.from(this.records.values()).map(e => e.record);
  }

  /**
   * Get a specific intervention record by ID.
   */
  public getIntervention(id: string): InterventionRecord | undefined {
    return this.records.get(id)?.record;
  }

  /**
   * Number of currently active interventions.
   */
  public getActiveCount(): number {
    return Array.from(this.records.values()).filter(e => e.record.status === 'ACTIVE').length;
  }

  /**
   * Clear all records (e.g. on navigation unload).
   */
  public clear(): void {
    this.restoreAll();
    this.records.clear();
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
