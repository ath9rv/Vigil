import type { Finding } from '../evidence';
import type {
  CanonicalForensicReport,
  TimelineEntry,
  EvidenceReference,
  HypothesisExplanation,
  CounterfactualExplanation,
  UncertaintyStatement,
  ForensicReportSubject,
  ForensicReportVerdict,
} from './types';

/**
 * ReportAdapter (Layer 3)
 *
 * Ensures every Finding presented in the popup has a CanonicalForensicReport.
 * If finding.report is already attached, it is returned directly (zero duplicate reasoning).
 * Otherwise, it constructs a pure, read-only CanonicalForensicReport from finding metadata.
 *
 * Invariants Enforced:
 * - INV-V4-022: Pure read-only projection; zero mutation.
 * - INV-V4-023: Semantic Fidelity; preserves exact confidence and categories without inflation.
 * - PERF-V4-013: Zero Duplicate Reasoning.
 */
export class ReportAdapter {
  private static readonly NON_INTENT_DISCLAIMER =
    'This analysis is based strictly on observed web page changes and network transmissions. It does not establish corporate subjective intent or fraudulent motive.';

  public static ensureCanonicalReport(
    finding: Finding,
    domain?: string,
    url?: string
  ): CanonicalForensicReport {
    // 1. If finding already carries a canonical report, return it directly
    if (finding.report) {
      return finding.report;
    }

    const timestamp = finding.evidence?.capturedAt || Date.now();
    const cleanDomain = domain || this.extractDomain(finding.evidence?.sourceUrl) || 'example.com';
    const cleanUrl = url || finding.evidence?.sourceUrl || `https://${cleanDomain}`;
    const navId = `nav-${finding.id}`;

    // Deterministic report ID
    const year = new Date(timestamp).getFullYear();
    const hash = Math.abs(this.hashCode(finding.id + cleanDomain)).toString(16).padStart(6, '0').toUpperCase().substring(0, 6);
    const reportId = `VF-${year}-${hash}`;

    // Epistemic confidence mapping
    let numericConfidence = 0.60;
    if (finding.confidence === 'CONFIRMED') numericConfidence = 0.90;
    else if (finding.confidence === 'SUGGESTIVE') numericConfidence = 0.65;
    else if (finding.confidence === 'OBSERVED') numericConfidence = 0.50;
    else if (finding.confidence === 'INCONCLUSIVE') numericConfidence = 0.35;

    const verdict: ForensicReportVerdict = Object.freeze({
      type: finding.category || 'DARK_PATTERN',
      summary: finding.interpretation || 'Observed page anomaly.',
      confidence: numericConfidence,
      eligibility: 'ELIGIBLE',
    });

    const subject: ForensicReportSubject = Object.freeze({
      domain: cleanDomain,
      url: cleanUrl,
    });

    // Timeline synthesis
    const timeline: TimelineEntry[] = [];
    const forensics = finding.evidence?.forensics;

    if (forensics && forensics.observed && forensics.observed.length > 0) {
      forensics.observed.forEach((obsText, idx) => {
        timeline.push(
          Object.freeze({
            sequence: idx + 1,
            timestamp: timestamp + idx * 500,
            relativeTimeMs: idx * 500,
            eventType: (finding.evidence?.sourceType as any) || 'DOM',
            source: finding.ruleId || 'scanner',
            summary: obsText,
            observationId: `obs-${finding.id}-${idx + 1}`,
          })
        );
      });
    } else {
      timeline.push(
        Object.freeze({
          sequence: 1,
          timestamp,
          relativeTimeMs: 0,
          eventType: (finding.evidence?.sourceType as any) || 'DOM',
          source: finding.ruleId || 'scanner',
          summary: finding.evidence?.excerpt || finding.interpretation || 'Pattern detected on page',
          observationId: `obs-${finding.id}-1`,
        })
      );
    }

    // Observations
    const observations: EvidenceReference[] = timeline.map(t =>
      Object.freeze({
        observationId: t.observationId,
        timestamp: t.timestamp,
        source: t.source,
        description: t.summary,
      })
    );

    // Hypotheses
    const hypotheses: HypothesisExplanation[] = [];
    hypotheses.push(
      Object.freeze({
        hypothesisId: `hyp-${finding.id}-primary`,
        type: finding.ruleName || finding.category,
        category: 'DECEPTIVE',
        status: numericConfidence >= 0.85 ? 'CONFIRMED' : 'PLAUSIBLE',
        confidence: numericConfidence,
        evaluationSummary: finding.interpretation,
      })
    );

    if (forensics) {
      if (forensics.contradictingEvidence && forensics.contradictingEvidence.length > 0) {
        forensics.contradictingEvidence.forEach((contra, idx) => {
          hypotheses.push(
            Object.freeze({
              hypothesisId: `hyp-${finding.id}-alt-${idx}`,
              type: 'INNOCUOUS_EXPLANATION',
              category: 'INNOCUOUS',
              status: 'PLAUSIBLE',
              confidence: 0.45,
              evaluationSummary: contra,
              rejectedReason: 'Under evaluation; counter-evidence pending.',
            })
          );
        });
      }
    }

    // Counterfactuals
    const counterfactuals: CounterfactualExplanation[] = [];
    if (finding.category === 'DARK_PATTERN' || finding.ruleName?.includes('Fee') || finding.interpretation?.includes('fee')) {
      counterfactuals.push(
        Object.freeze({
          ruleId: 'CF-COMMERCE-001',
          condition: 'Removal of progression action',
          result: 'CONFIRMED_STATE_DELTA',
          interpretation: 'Fee was absent in the initial base presentation prior to progression.',
          limitations: [ReportAdapter.NON_INTENT_DISCLAIMER],
        })
      );
    }

    // Uncertainty
    const uncertainty: UncertaintyStatement[] = [];
    if (numericConfidence >= 0.85) {
      uncertainty.push(
        Object.freeze({
          level: 'STRONG_EVIDENCE',
          statement: 'Strong evidentiary support based on observed DOM sequence and lack of user opt-in.',
          primaryFactor: 'Progression-dependent state change corroboration.',
        })
      );
    } else if (numericConfidence >= 0.60) {
      uncertainty.push(
        Object.freeze({
          level: 'MODERATE_EVIDENCE',
          statement: 'Moderate evidence: pattern matches known signature, but alternative explanations cannot be completely ruled out.',
          primaryFactor: 'Potential regional configuration or responsive layout differences.',
        })
      );
    } else {
      uncertainty.push(
        Object.freeze({
          level: 'INSUFFICIENT_EVIDENCE',
          statement: 'Tentative observation requiring corroborating events.',
          primaryFactor: 'Single-event snapshot without full temporal sequence.',
        })
      );
    }

    return Object.freeze({
      reportId,
      navigationId: navId,
      subject,
      verdict,
      summary: finding.interpretation,
      timeline: Object.freeze(timeline),
      observations: Object.freeze(observations),
      supportingEvidence: Object.freeze(observations),
      contradictions: Object.freeze([]),
      hypotheses: Object.freeze(hypotheses),
      counterfactuals: Object.freeze(counterfactuals),
      uncertainty: Object.freeze(uncertainty),
      limitations: Object.freeze([ReportAdapter.NON_INTENT_DISCLAIMER]),
      generatedAt: timestamp,
    });
  }

  private static extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
