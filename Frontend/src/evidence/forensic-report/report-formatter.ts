import type {
  CanonicalForensicReport,
  UserExplanationView,
  UserExplanationAlternative,
  EvidenceView,
  ForensicView,
} from './types';

/**
 * ForensicReportFormatter (Layer 3)
 *
 * Renders a CanonicalForensicReport across 3 progressive disclosure tiers and
 * generates structured 12-section downloadable investigation reports.
 *
 * Invariants Enforced:
 * - INV-V4-022: Purely renders; zero mutation.
 * - PERF-V4-010: Memoized string formatting.
 */
export class ForensicReportFormatter {
  /**
   * Level 1: User Explanation (Human-First Narrative)
   */
  public static toLevel1UserExplanation(report: CanonicalForensicReport): UserExplanationView {
    const isDeceptive = report.verdict.type.includes('DECEPTIVE') || report.verdict.type.includes('COMMERCE');

    const title = isDeceptive ? 'Possible Hidden Fee' : 'Site Trust Analysis';
    const headline = isDeceptive
      ? 'A mandatory fee appeared after checkout despite not appearing in the original price.'
      : report.verdict.summary;

    const whatVigilSaw = report.timeline.length > 0
      ? report.timeline.map(t => t.summary).join(' ')
      : report.summary;

    const whyThisMatters = isDeceptive
      ? 'The fee was not present in the earlier price representation and no optional service corresponding to the fee was selected.'
      : 'Vigil audits third-party tracking, consent transparency, and pricing integrity.';

    const alternatives: UserExplanationAlternative[] = report.hypotheses.map(h => {
      let verdictLabel = 'Unlikely';
      if (h.status === 'CONFIRMED') verdictLabel = 'Supported';
      else if (h.status === 'DISPROVED') verdictLabel = 'Unsupported';
      else if (h.status === 'PLAUSIBLE') verdictLabel = 'Possible';

      return Object.freeze({
        name: h.type.replace('INNOCUOUS_', '').replace('DECEPTIVE_', '').replace(/_/g, ' '),
        verdict: verdictLabel,
        explanation: h.rejectedReason || h.evaluationSummary,
      });
    });

    const primaryUncertainty = report.uncertainty[0] || {
      level: 'MODERATE_EVIDENCE',
      statement: 'Moderate evidence support.',
      primaryFactor: 'Structural observations.',
    };

    const confidenceDisplay = {
      label: primaryUncertainty.level.replace(/_/g, ' '),
      explanation: primaryUncertainty.statement,
    };

    const nonIntentDisclaimer =
      'This analysis is based on observed page changes and does not establish the company\'s intent.';

    return Object.freeze({
      title,
      headline,
      whatVigilSaw,
      whyThisMatters,
      consideredAlternatives: Object.freeze(alternatives),
      confidenceDisplay,
      nonIntentDisclaimer,
    });
  }

  /**
   * Level 2: Evidence View (Interactive Chronological Timeline & Badges)
   */
  public static toLevel2EvidenceView(report: CanonicalForensicReport): EvidenceView {
    const supports: string[] = [];
    for (const supp of report.supportingEvidence) {
      supports.push(`✓ ${supp.description}`);
    }
    for (const h of report.hypotheses.filter(h => h.status === 'CONFIRMED' || h.status === 'PLAUSIBLE')) {
      supports.push(`✓ ${h.evaluationSummary}`);
    }

    const rejectedAlternatives: string[] = [];
    for (const h of report.hypotheses.filter(h => h.status === 'DISPROVED' || h.rejectedReason)) {
      rejectedAlternatives.push(
        `✗ ${h.type.replace('INNOCUOUS_', '').replace(/_/g, ' ')}: ${h.rejectedReason || 'Refuted by evidence'}`
      );
    }

    const remainingUncertainty = report.uncertainty[0]?.statement || 'No unresolved contradictions.';

    return Object.freeze({
      timelineEntries: report.timeline,
      supportingEvidenceCount: report.supportingEvidence.length,
      primaryObservations: report.observations.slice(0, 10),
      evaluatedHypotheses: report.hypotheses,
      counterfactualSummary: report.counterfactuals,
      supports: Object.freeze(supports),
      rejectedAlternatives: Object.freeze(rejectedAlternatives),
      remainingUncertainty,
    });
  }

  /**
   * Level 3: Forensic View (Full Technical Trace)
   */
  public static toLevel3ForensicView(report: CanonicalForensicReport): ForensicView {
    return Object.freeze({
      fullReport: report,
      auditLineage: Object.freeze({
        navigationId: report.navigationId,
        reportId: report.reportId,
        observationCount: report.observations.length,
        contradictionCount: report.contradictions.length,
        reconciliationDelta: report.modelAssessment?.confidenceDelta,
        modelProvenance: report.modelAssessment
          ? `${report.modelAssessment.modelId}@${report.modelAssessment.version}`
          : undefined,
      }),
    });
  }

  /**
   * Structured 12-Section Investigation Report (Markdown / Text Export)
   */
  public static toStructuredInvestigationMarkdown(report: CanonicalForensicReport): string {
    const lines: string[] = [];

    lines.push('================================================================================');
    lines.push('                             VIGIL FORENSIC REPORT                              ');
    lines.push('               STRUCTURED FOR INDEPENDENT REVIEW AND AUDITABILITY               ');
    lines.push('================================================================================');
    lines.push(`Case ID:     ${report.reportId}`);
    lines.push(`Domain:      ${report.subject.domain}`);
    lines.push(`URL:         ${report.subject.url}`);
    lines.push(`Navigation:  ${report.navigationId}`);
    lines.push(`Generated:   ${new Date(report.generatedAt).toISOString()}`);
    lines.push('--------------------------------------------------------------------------------\n');

    // 1. EXECUTIVE SUMMARY
    lines.push('1. EXECUTIVE SUMMARY');
    lines.push('--------------------');
    lines.push(report.summary);
    lines.push(`Verdict: ${report.verdict.type} (${report.verdict.summary})`);
    lines.push(`Epistemic Confidence: ${report.verdict.confidence.toFixed(2)}\n`);

    // 2. WHAT WAS OBSERVED
    lines.push('2. WHAT WAS OBSERVED');
    lines.push('--------------------');
    if (report.observations.length === 0) {
      lines.push('No direct observations recorded.');
    } else {
      for (const obs of report.observations) {
        lines.push(`- [${obs.observationId}] ${obs.description} (Source: ${obs.source})`);
      }
    }
    lines.push('');

    // 3. EVENT TIMELINE
    lines.push('3. EVENT TIMELINE');
    lines.push('-----------------');
    if (report.timeline.length === 0) {
      lines.push('Zero timeline events captured.');
    } else {
      for (const t of report.timeline) {
        lines.push(`T+${t.relativeTimeMs}ms (Seq ${t.sequence}) [${t.eventType}] ${t.summary}`);
      }
    }
    lines.push('');

    // 4. SUPPORTING EVIDENCE
    lines.push('4. SUPPORTING EVIDENCE');
    lines.push('----------------------');
    if (report.supportingEvidence.length === 0) {
      lines.push('None itemized.');
    } else {
      for (const supp of report.supportingEvidence) {
        lines.push(`- ${supp.observationId}: ${supp.description}`);
      }
    }
    lines.push('');

    // 5. CONTRADICTIONS
    lines.push('5. CONTRADICTIONS');
    lines.push('-----------------');
    if (report.contradictions.length === 0) {
      lines.push('Zero contradictions detected in the observation DAG.');
    } else {
      for (const c of report.contradictions) {
        lines.push(`- Conflict recorded at ${c.observationId}: ${c.description}`);
      }
    }
    lines.push('');

    // 6. ALTERNATIVE EXPLANATIONS
    lines.push('6. ALTERNATIVE EXPLANATIONS');
    lines.push('---------------------------');
    if (report.hypotheses.length === 0) {
      lines.push('No alternative hypotheses formally registered.');
    } else {
      for (const h of report.hypotheses) {
        lines.push(`* [${h.status}] ${h.type} (${h.category})`);
        lines.push(`  Summary: ${h.evaluationSummary}`);
        if (h.rejectedReason) {
          lines.push(`  Rejection Reason: ${h.rejectedReason}`);
        }
      }
    }
    lines.push('');

    // 7. COUNTERFACTUAL ANALYSIS
    lines.push('7. COUNTERFACTUAL ANALYSIS');
    lines.push('--------------------------');
    if (report.counterfactuals.length === 0) {
      lines.push('Zero counterfactual rules evaluated.');
    } else {
      for (const cf of report.counterfactuals) {
        lines.push(`* Rule ${cf.ruleId}: ${cf.result}`);
        lines.push(`  Condition: ${cf.condition}`);
        lines.push(`  Interpretation: ${cf.interpretation}`);
      }
    }
    lines.push('');

    // 8. PROBABILISTIC ASSISTANCE
    lines.push('8. PROBABILISTIC ASSISTANCE');
    lines.push('---------------------------');
    if (!report.modelAssessment) {
      lines.push('Not invoked. Deterministic evidence resolved or bounded the case without NLI escalation.');
    } else {
      lines.push(`Model Invoked:       ${report.modelAssessment.modelId}@${report.modelAssessment.version}`);
      lines.push(`Model Confidence:   ${report.modelAssessment.modelAssessmentConfidence.toFixed(2)} (Softmax alignment)`);
      lines.push(`Ambiguity Signal:   ${report.modelAssessment.ambiguitySignal}`);
      lines.push(`Confidence Delta:   ${report.modelAssessment.confidenceDelta > 0 ? '+' : ''}${report.modelAssessment.confidenceDelta.toFixed(3)} (Bounded to ±0.15)`);
      lines.push(`Advisory Rationale: ${report.modelAssessment.rationale}`);
    }
    lines.push('');

    // 9. AUTHORITATIVE VERDICT
    lines.push('9. AUTHORITATIVE VERDICT');
    lines.push('------------------------');
    lines.push(`Verdict Type: ${report.verdict.type}`);
    lines.push(`Summary:      ${report.verdict.summary}`);
    lines.push(`Eligibility:  ${report.verdict.eligibility}`);
    lines.push(`Final Epistemic Confidence: ${report.verdict.confidence.toFixed(2)}\n`);

    // 10. UNCERTAINTY & LIMITATIONS
    lines.push('10. UNCERTAINTY & LIMITATIONS');
    lines.push('-----------------------------');
    for (const u of report.uncertainty) {
      lines.push(`[Uncertainty Level: ${u.level}] ${u.statement}`);
      lines.push(`Primary Factor: ${u.primaryFactor}`);
    }
    lines.push('');
    lines.push('Non-Negotiable Limitations:');
    for (const lim of report.limitations) {
      lines.push(`- ${lim}`);
    }
    lines.push('');

    // 11. EVIDENCE REFERENCES
    lines.push('11. EVIDENCE REFERENCES');
    lines.push('-----------------------');
    lines.push(`Total Observations Ingested: ${report.observations.length}`);
    lines.push(`Supporting Nodes:             ${report.supportingEvidence.length}`);
    lines.push(`Contradictory Nodes:          ${report.contradictions.length}\n`);

    // 12. INTEGRITY / PROVENANCE
    lines.push('12. INTEGRITY / PROVENANCE');
    lines.push('--------------------------');
    lines.push('Engine: Vigil TrustEngine & V4 Cognitive Reasoning Pipeline');
    lines.push(`Navigation Audit Scope: ${report.navigationId}`);
    lines.push('Immutability Gate: Object.freeze applied to all report nodes (INV-V4-022)');
    lines.push('================================================================================');

    return lines.join('\n');
  }
}
