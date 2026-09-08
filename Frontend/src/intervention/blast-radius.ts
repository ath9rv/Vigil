/**
 * Vigil Blast Radius Estimator
 *
 * Evaluates the structural, functional, and transactional risk of mutating a DOM element.
 * Analyzes multi-signal evidence (interactive density, form controls, payment/auth presence,
 * iframes, ARIA landmarks) rather than relying on keywords alone.
 *
 * Core Rule: Automatic DOM interventions are strictly forbidden from altering input values,
 * textarea values, select states, contenteditable contents, payment controls, and authentication
 * fields regardless of detection confidence.
 */

import { BlastRadiusAssessment, InterventionSafetyClass, CompatibilityLevel } from './types';

const SENSITIVE_INPUT_TYPES = new Set(['password', 'tel', 'email']);
const SENSITIVE_AUTOCOMPLETE = new Set([
  'cc-number', 'cc-csc', 'cc-exp', 'cc-type',
  'new-password', 'current-password', 'one-time-code'
]);
const SENSITIVE_PATTERNS = /password|secret|credit|card|cvv|cvc|token|stripe|paypal|checkout|payment|auth/i;

export class BlastRadiusEstimator {
  private static instance: BlastRadiusEstimator | null = null;

  public static getInstance(): BlastRadiusEstimator {
    if (!BlastRadiusEstimator.instance) {
      BlastRadiusEstimator.instance = new BlastRadiusEstimator();
    }
    return BlastRadiusEstimator.instance;
  }

  /**
   * Evaluates the risk profile of mutating a given DOM element.
   */
  public assess(element: Element): BlastRadiusAssessment {
    const reasons: string[] = [];

    // 1. Direct Target Prohibitions (Level 4: BLOCKED)
    if (this.isDirectlyForbiddenTarget(element)) {
      reasons.push('Target is an immutable form, auth, or input control');
      return {
        safetyClass: 'BLOCKED',
        compatibilityLevel: 4,
        riskScore: 1.0,
        reasons,
        interactiveDensity: 1.0,
        hasFormControls: true,
        hasPaymentOrAuth: true,
        hasCrossIframe: false,
      };
    }

    // 2. Subtree Inspections
    const allDescendants = Array.from(element.querySelectorAll('*'));
    const totalElements = allDescendants.length + 1;

    let interactiveCount = 0;
    let hasFormControls = false;
    let hasPaymentOrAuth = false;
    let hasCrossIframe = false;

    // Check target itself
    if (this.isInteractiveElement(element)) interactiveCount++;
    if (this.isPaymentOrAuthElement(element)) hasPaymentOrAuth = true;

    // Check descendants
    for (const el of allDescendants) {
      if (this.isInteractiveElement(el)) {
        interactiveCount++;
      }

      if (el.tagName === 'FORM' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || (el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit')) {
        hasFormControls = true;
      }

      if (this.isPaymentOrAuthElement(el)) {
        hasPaymentOrAuth = true;
      }

      if (el.tagName === 'IFRAME') {
        hasCrossIframe = true;
      }
    }

    const interactiveDensity = totalElements > 0 ? interactiveCount / totalElements : 0;

    // 3. Multi-Signal Safety Classification
    if (hasPaymentOrAuth) {
      reasons.push('Subtree contains authentication or payment processing controls');
      return {
        safetyClass: 'BLOCKED',
        compatibilityLevel: 4,
        riskScore: 1.0,
        reasons,
        interactiveDensity,
        hasFormControls,
        hasPaymentOrAuth,
        hasCrossIframe,
      };
    }

    if (hasCrossIframe) {
      reasons.push('Subtree contains embedded iframe (potential secure boundary or payment gateway)');
      return {
        safetyClass: 'RESTRICTED',
        compatibilityLevel: 3,
        riskScore: 0.85,
        reasons,
        interactiveDensity,
        hasFormControls,
        hasPaymentOrAuth,
        hasCrossIframe,
      };
    }

    if (hasFormControls) {
      reasons.push('Subtree contains form elements or submission triggers');
      return {
        safetyClass: 'RESTRICTED',
        compatibilityLevel: 3,
        riskScore: 0.75,
        reasons,
        interactiveDensity,
        hasFormControls,
        hasPaymentOrAuth,
        hasCrossIframe,
      };
    }

    if (interactiveDensity > 0.25 || interactiveCount > 2) {
      reasons.push(`High interactive element density (${(interactiveDensity * 100).toFixed(0)}%)`);
      return {
        safetyClass: 'RESTRICTED',
        compatibilityLevel: 3,
        riskScore: 0.60,
        reasons,
        interactiveDensity,
        hasFormControls,
        hasPaymentOrAuth,
        hasCrossIframe,
      };
    }

    // Check if it is an animated/interactive countdown or badge
    if (totalElements > 1 || element.tagName === 'DIV' || element.tagName === 'SECTION') {
      reasons.push('Container or dynamic element suitable for animation freezing');
      return {
        safetyClass: 'CAUTIOUS',
        compatibilityLevel: 2,
        riskScore: 0.30,
        reasons,
        interactiveDensity,
        hasFormControls: false,
        hasPaymentOrAuth: false,
        hasCrossIframe: false,
      };
    }

    // Isolated pure text or cosmetic badge
    reasons.push('Isolated cosmetic element with zero interactive descendants');
    return {
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      riskScore: 0.10,
      reasons,
      interactiveDensity: 0,
      hasFormControls: false,
      hasPaymentOrAuth: false,
      hasCrossIframe: false,
    };
  }

  private isDirectlyForbiddenTarget(el: Element): boolean {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
    if ((el as HTMLElement).isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') return true;
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'combobox' || role === 'searchbox' || role === 'dialog' || role === 'alertdialog') return true;
    return false;
  }

  private isInteractiveElement(el: Element): boolean {
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
    if (el.hasAttribute('onclick') || el.hasAttribute('tabindex')) return true;
    const role = el.getAttribute('role');
    if (role === 'button' || role === 'link' || role === 'checkbox' || role === 'switch' || role === 'tab') return true;
    return false;
  }

  private isPaymentOrAuthElement(el: Element): boolean {
    const isInputOrForm = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'FORM' || el.tagName === 'BUTTON';

    // 1. Direct sensitive input controls (always payment/auth)
    const type = el.getAttribute('type');
    if (type && SENSITIVE_INPUT_TYPES.has(type.toLowerCase())) return true;

    const autocomplete = el.getAttribute('autocomplete');
    if (autocomplete && SENSITIVE_AUTOCOMPLETE.has(autocomplete.toLowerCase())) return true;

    // 2. Sensitive names/IDs on actual form controls or buttons
    if (isInputOrForm) {
      const name = el.getAttribute('name');
      if (name && SENSITIVE_PATTERNS.test(name)) return true;

      const id = el.id;
      if (id && SENSITIVE_PATTERNS.test(id)) return true;

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && SENSITIVE_PATTERNS.test(ariaLabel)) return true;
    }

    // 3. Container structural combination:
    // A container is only payment/auth if it contains an active form/submit control AND inputs
    if (el.tagName === 'FORM') {
      const hasInputs = el.querySelectorAll('input, select, textarea').length > 0;
      const hasSubmit = el.querySelectorAll('button[type="submit"], input[type="submit"], button').length > 0;
      if (hasInputs && hasSubmit) return true;
    }

    return false;
  }
}

export const blastRadiusEstimator = BlastRadiusEstimator.getInstance();
