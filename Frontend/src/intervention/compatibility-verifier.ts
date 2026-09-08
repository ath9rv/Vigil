/**
 * Vigil Comparative Compatibility Verifier
 *
 * Enforces the core Phase 3 invariant:
 * "An intervention is successful only when the host page remains functional,
 * structurally, and visually correct afterward."
 *
 * Verifies geometry stability, causal layout shifts, parent clickability,
 * and DOM validity against pre-mutation measured baselines.
 */

import {
  GeometrySnapshot,
  ShiftClassification,
  VerificationResult,
} from './types';

export interface CompatibilityCheckResult {
  result: VerificationResult;
  geometryPreserved: boolean;
  shiftClass: ShiftClassification;
  parentClickable: boolean;
  isAttached: boolean;
  deltaX: number;
  deltaY: number;
  deltaWidth: number;
  deltaHeight: number;
  reasons: string[];
}

export class CompatibilityVerifier {
  private static instance: CompatibilityVerifier | null = null;

  public static getInstance(): CompatibilityVerifier {
    if (!CompatibilityVerifier.instance) {
      CompatibilityVerifier.instance = new CompatibilityVerifier();
    }
    return CompatibilityVerifier.instance;
  }

  /**
   * Captures a measured GeometrySnapshot from an element.
   */
  public captureGeometry(element: Element): GeometrySnapshot {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    };
  }

  /**
   * Evaluates post-mutation state against pre-mutation measured baseline.
   */
  public verify(
    element: Element,
    preGeometry: GeometrySnapshot,
    siblingPreGeometries: Map<Element, GeometrySnapshot> = new Map()
  ): CompatibilityCheckResult {
    const reasons: string[] = [];
    const isAttached = element.isConnected;

    if (!isAttached) {
      reasons.push('Target element was detached from document');
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
        reasons,
      };
    }

    const postGeometry = this.captureGeometry(element);
    const deltaX = Math.abs(postGeometry.x - preGeometry.x);
    const deltaY = Math.abs(postGeometry.y - preGeometry.y);
    const deltaWidth = Math.abs(postGeometry.width - preGeometry.width);
    const deltaHeight = Math.abs(postGeometry.height - preGeometry.height);

    // 1. Geometry Invariant: element dimensions must not collapse to 0
    let geometryPreserved = true;
    if (preGeometry.width > 0 && postGeometry.width === 0) {
      geometryPreserved = false;
      reasons.push('Element width collapsed to 0');
    }
    if (preGeometry.height > 0 && postGeometry.height === 0) {
      geometryPreserved = false;
      reasons.push('Element height collapsed to 0');
    }
    if (deltaWidth > 5.0 || deltaHeight > 5.0) {
      geometryPreserved = false;
      reasons.push(`Element dimensions changed significantly (dW: ${deltaWidth.toFixed(1)}px, dH: ${deltaHeight.toFixed(1)}px)`);
    }

    // 2. Neighbor / Sibling Layout Shift (CLS)
    let shiftClass: ShiftClassification = 'NO_SHIFT';
    for (const [sibling, prevSiblingGeo] of siblingPreGeometries.entries()) {
      if (sibling.isConnected) {
        const currentSiblingGeo = this.captureGeometry(sibling);
        const shiftX = Math.abs(currentSiblingGeo.x - prevSiblingGeo.x);
        const shiftY = Math.abs(currentSiblingGeo.y - prevSiblingGeo.y);

        if (shiftX > 2.0 || shiftY > 2.0) {
          shiftClass = 'INTERVENTION_CORRELATED_SHIFT';
          reasons.push(`Neighbor element shifted by (${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px)`);
          break;
        }
      }
    }

    // 3. Parent Clickability Invariant
    let parentClickable = true;
    const parent = element.parentElement;
    if (parent && typeof window !== 'undefined' && 'getComputedStyle' in window) {
      try {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.pointerEvents === 'none' && parentStyle.display !== 'none') {
          // Check if parent was already pointer-events: none before
          parentClickable = false;
          reasons.push('Parent container pointer-events corrupted to none');
        }
      } catch {
        // Ignored in non-DOM test environments
      }
    }

    const isPass = geometryPreserved && shiftClass !== 'INTERVENTION_CORRELATED_SHIFT' && parentClickable;

    return {
      result: isPass ? 'PASS' : 'FAIL',
      geometryPreserved,
      shiftClass,
      parentClickable,
      isAttached,
      deltaX,
      deltaY,
      deltaWidth,
      deltaHeight,
      reasons,
    };
  }
}

export const compatibilityVerifier = CompatibilityVerifier.getInstance();
