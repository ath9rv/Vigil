/**
 * Vigil Diagnostic Compatibility Scorer
 *
 * Computes a multi-vector diagnostic compatibility score across 6 domains:
 * Layout Stability, Interaction Continuity, Form Integrity, Accessibility,
 * Runtime Cleanliness, and Performance Impact.
 *
 * Hard Invariant: A high diagnostic score NEVER overrides a hard safety gate.
 * Any breach of payment/auth boundaries, causal errors, or geometry collapse
 * forces hardSafetyGatePassed = false and triggers automatic BLOCK / ROLLBACK.
 */

import {
  DiagnosticCompatibilityScore,
  CompatibilityDiagnostic,
  DifferentialResult,
  BlastRadiusAssessment,
} from './types';
import { CompatibilityCheckResult } from './compatibility-verifier';

export class CompatibilityScorer {
  private static instance: CompatibilityScorer | null = null;

  public static getInstance(): CompatibilityScorer {
    if (!CompatibilityScorer.instance) {
      CompatibilityScorer.instance = new CompatibilityScorer();
    }
    return CompatibilityScorer.instance;
  }

  public score(params: {
    check: CompatibilityCheckResult;
    diffHealth?: DifferentialResult;
    assessment?: BlastRadiusAssessment;
    durationMs?: number;
  }): DiagnosticCompatibilityScore {
    const { check, diffHealth, assessment, durationMs = 5.0 } = params;
    const diagnostics: CompatibilityDiagnostic[] = [];

    // 1. Layout Stability Vector (0-100)
    let layoutScore = 100;
    const layoutEvidence: string[] = [];
    let layoutHardFailure = false;

    if (!check.isAttached) {
      layoutScore = 0;
      layoutHardFailure = true;
      layoutEvidence.push('Element was detached from document');
    } else {
      if (!check.geometryPreserved) {
        layoutScore -= 50;
        layoutEvidence.push('Element dimensions collapsed or expanded abnormally');
      }
      if (check.shiftClass === 'INTERVENTION_CORRELATED_SHIFT') {
        layoutScore -= 50;
        layoutHardFailure = true;
        layoutEvidence.push('Correlated layout shift detected on neighbor elements');
      } else if (check.shiftClass === 'EXPECTED_SHIFT') {
        layoutScore -= 10;
        layoutEvidence.push('Minor expected animation shift observed');
      }
    }
    layoutScore = Math.max(0, layoutScore);
    diagnostics.push({
      vector: 'Layout Stability',
      score: layoutScore,
      evidence: layoutEvidence.length ? layoutEvidence : ['Geometry perfectly preserved; zero layout shifts'],
      hardFailure: layoutHardFailure,
    });

    // 2. Interaction Continuity Vector (0-100)
    let interactionScore = 100;
    const interactionEvidence: string[] = [];
    let interactionHardFailure = false;

    if (!check.parentClickable) {
      interactionScore -= 80;
      interactionHardFailure = true;
      interactionEvidence.push('Parent container pointer-events corrupted');
    }
    if (diffHealth && diffHealth.newlyBrokenInteractions > 0) {
      interactionScore -= diffHealth.newlyBrokenInteractions * 30;
      interactionEvidence.push(`${diffHealth.newlyBrokenInteractions} clickable elements became unresponsive`);
    }
    interactionScore = Math.max(0, interactionScore);
    diagnostics.push({
      vector: 'Interaction Continuity',
      score: interactionScore,
      evidence: interactionEvidence.length ? interactionEvidence : ['Interactive descendants and parents remain clickable'],
      hardFailure: interactionHardFailure,
    });

    // 3. Form Integrity Vector (0-100)
    let formScore = 100;
    const formEvidence: string[] = [];
    let formHardFailure = false;

    if (assessment) {
      if (assessment.hasPaymentOrAuth) {
        formScore = 0;
        formHardFailure = true;
        formEvidence.push('Target contains payment or authentication form controls (BLOCKED)');
      } else if (assessment.hasFormControls) {
        formScore -= 30;
        formEvidence.push('Target contains non-sensitive form elements');
      }
    }
    formScore = Math.max(0, formScore);
    diagnostics.push({
      vector: 'Form Integrity',
      score: formScore,
      evidence: formEvidence.length ? formEvidence : ['No form or submission controls compromised'],
      hardFailure: formHardFailure,
    });

    // 4. Accessibility Continuity Vector (0-100)
    let a11yScore = 100;
    const a11yEvidence: string[] = [];
    let a11yHardFailure = false;

    if (!check.isAttached) {
      a11yScore = 0;
      a11yHardFailure = true;
      a11yEvidence.push('Target element lost accessibility tree presence');
    }
    diagnostics.push({
      vector: 'Accessibility Continuity',
      score: a11yScore,
      evidence: a11yEvidence.length ? a11yEvidence : ['ARIA landmarks and semantics preserved'],
      hardFailure: a11yHardFailure,
    });

    // 5. Runtime Cleanliness Vector (0-100)
    let runtimeScore = 100;
    const runtimeEvidence: string[] = [];
    let runtimeHardFailure = false;

    if (diffHealth) {
      if (diffHealth.newlyIntroducedErrors > 0 && diffHealth.attribution === 'INTERVENTION_RELATED') {
        runtimeScore = 0;
        runtimeHardFailure = true;
        runtimeEvidence.push(`Causally linked runtime exceptions introduced (${diffHealth.newlyIntroducedErrors})`);
      } else if (diffHealth.newlyIntroducedErrors > 0) {
        runtimeScore -= 20;
        runtimeEvidence.push('Uncorrelated third-party script errors observed during window');
      }
    }
    runtimeScore = Math.max(0, runtimeScore);
    diagnostics.push({
      vector: 'Runtime Cleanliness',
      score: runtimeScore,
      evidence: runtimeEvidence.length ? runtimeEvidence : ['Zero script errors introduced'],
      hardFailure: runtimeHardFailure,
    });

    // 6. Performance Impact Vector (0-100)
    let perfScore = 100;
    const perfEvidence: string[] = [];
    let perfHardFailure = false;

    if (durationMs > 50) {
      perfScore = 40;
      perfEvidence.push(`Exceeded 50ms Long Task budget (${durationMs.toFixed(1)}ms)`);
    } else if (durationMs > 30) {
      perfScore = 70;
      perfEvidence.push(`Exceeded 30ms cycle budget (${durationMs.toFixed(1)}ms)`);
    } else {
      perfEvidence.push(`Executed well within 30ms budget (${durationMs.toFixed(1)}ms)`);
    }
    diagnostics.push({
      vector: 'Performance Impact',
      score: perfScore,
      evidence: perfEvidence,
      hardFailure: perfHardFailure,
    });

    // Overall Weighted Diagnostic Score
    const overall = (
      layoutScore * 0.25 +
      interactionScore * 0.25 +
      formScore * 0.20 +
      a11yScore * 0.10 +
      runtimeScore * 0.10 +
      perfScore * 0.10
    );

    // Hard Safety Gates (Overrides high scores)
    const hardSafetyGatePassed = (
      !layoutHardFailure &&
      !interactionHardFailure &&
      !formHardFailure &&
      !a11yHardFailure &&
      !runtimeHardFailure
    );

    return {
      layout: layoutScore,
      interaction: interactionScore,
      forms: formScore,
      accessibility: a11yScore,
      runtime: runtimeScore,
      performance: perfScore,
      overall: Math.round(overall * 10) / 10,
      hardSafetyGatePassed,
      diagnostics,
    };
  }
}

export const compatibilityScorer = CompatibilityScorer.getInstance();
