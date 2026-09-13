import type { ReadOnlyEvidenceGraph } from '../graph';
import type { TemporalEventIndex } from '../temporal-event-index';
import type { VerdictResolution } from '../../shared/types';
import type { HypothesisEvaluationResult, CompetingHypothesis } from '../v4/types';
import type { CounterfactualAnalysisResult } from '../counterfactual/types';
import type { ReconciliationResult } from '../nli/types';
import type {
  CanonicalForensicReport,
  TimelineEntry,
  EvidenceReference,
  HypothesisExplanation,
  CounterfactualExplanation,
  ModelContribution,
  UncertaintyStatement,
  UncertaintyLevel,
  ForensicReportSubject,
  ForensicReportVerdict,
} from './types';

export interface ForensicReportBuildParams {
  readonly navigationId: string;
  readonly subject: ForensicReportSubject;
  readonly graph: ReadOnlyEvidenceGraph;
  readonly timeline: TemporalEventIndex;
  readonly verdictResolution: VerdictResolution;
  readonly hypothesisResult?: HypothesisEvaluationResult;
  readonly counterfactualResult?: CounterfactualAnalysisResult;
  readonly reconciliationResult?: ReconciliationResult;
  readonly generatedAt?: number;
  readonly reportId?: string;
}

/**
 * ForensicReportBuilder (Layer 3)
 *
 * Synthesizes a structured CanonicalForensicReport from frozen reasoning artifacts.
 *
 * Invariants Enforced:
 * - INV-V4-022: Explanation Non-Interference. Operates purely on read-only snapshots; zero mutation.
 * - INV-V4-023: Semantic Fidelity. Faithfully projects verdict, hypotheses, and uncertainty without inflation.
 * - PERF-V4-009: Operates on frozen snapshots.
 * - PERF-V4-010: Memoized formatting of evidence references.
 * - PERF-V4-013: Zero Duplicate Reasoning. Consumes frozen outputs; never reruns reasoning.
 */
export class ForensicReportBuilder {
  private static readonly NON_INTENT_DISCLAIMER =
    'This analysis is based strictly on observed web page changes and network transmissions. It does not establish corporate subjective intent or fraudulent motive.';

  private static readonly SENSITIVE_KEY_REGEX =
    /pass(word)?|token|auth|secret|cookie|session|api_?key|credit_?card|cvv|ssn/i;

  public sanitizeString(str: string): string {
    return str
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]');
  }

  public sanitizePayload(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
    if (!payload) return {};
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (ForensicReportBuilder.SENSITIVE_KEY_REGEX.test(k)) {
        cleaned[k] = '[REDACTED]';
      } else if (typeof v === 'string') {
        cleaned[k] = this.sanitizeString(v);
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        cleaned[k] = this.sanitizePayload(v as Record<string, unknown>);
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }

  private computeDeterministicReportId(
    navigationId: string,
    timestamp: number,
    eventCount: number,
    obsCount: number
  ): string {
    let hash = 0;
    const str = `${navigationId}:${timestamp}:${eventCount}:${obsCount}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(6, '0').substring(0, 6).toUpperCase();
    const year = new Date(timestamp).getFullYear();
    return `VF-${year}-${hex}`;
  }

  public buildReport(params: ForensicReportBuildParams): CanonicalForensicReport {
    const {
      navigationId,
      subject,
      graph,
      timeline,
      verdictResolution,
      hypothesisResult,
      counterfactualResult,
      reconciliationResult,
    } = params;

    const rawEvents = timeline.getEvents(navigationId);
    const graphNodes = graph.getNodes().filter(n => n.navigationId === navigationId);

    const generatedAt =
      params.generatedAt ??
      (rawEvents.length > 0 ? rawEvents[rawEvents.length - 1].timestamp : Date.now());

    const reportId =
      params.reportId ??
      this.computeDeterministicReportId(navigationId, generatedAt, rawEvents.length, graphNodes.length);

    // 1. Event Timeline Entries
    const firstTimestamp = rawEvents.length > 0 ? rawEvents[0].timestamp : generatedAt;
    const timelineEntries: TimelineEntry[] = rawEvents.map((evt, idx) =>
      Object.freeze({
        sequence: evt.sequence ?? idx + 1,
        timestamp: evt.timestamp,
        relativeTimeMs: Math.max(0, evt.timestamp - firstTimestamp),
        eventType: evt.type,
        source: evt.source,
        summary: this.summarizeEventPayload(evt.payload),
        observationId: evt.observationId,
      })
    );

    // 2. Observations & Evidence References
    const observations: EvidenceReference[] = graphNodes.map(node =>
      Object.freeze({
        observationId: node.provenance?.observationId || `obs-${node.id}`,
        nodeId: node.id,
        timestamp: node.timestamp,
        source: node.source,
        description: this.sanitizeString(`[${node.type}] Evidence collected by ${node.provenance?.collector || 'scanner'}`),
      })
    );

    // 3. Supporting Evidence
    const supportingSet = new Set(verdictResolution.supportingEvidenceIds || []);
    const supportingEvidence: EvidenceReference[] = observations.filter(
      obs => supportingSet.has(obs.observationId) || (obs.nodeId && supportingSet.has(obs.nodeId))
    );

    // 4. Contradictions
    const contradictionSet = new Set(verdictResolution.contradictingEvidenceIds || []);
    const contradictions: EvidenceReference[] = observations.filter(
      obs => contradictionSet.has(obs.observationId) || (obs.nodeId && contradictionSet.has(obs.nodeId))
    );

    // 5. Hypotheses Explanations
    const hypotheses: HypothesisExplanation[] = [];
    if (hypothesisResult) {
      for (const h of hypothesisResult.activeHypotheses) {
        hypotheses.push(this.formatHypothesis(h));
      }
      for (const h of hypothesisResult.rejectedAlternatives) {
        hypotheses.push(this.formatHypothesis(h));
      }
    }

    // 6. Counterfactual Explanations
    const counterfactuals: CounterfactualExplanation[] = [];
    const cfSource = counterfactualResult || hypothesisResult?.counterfactualAnalysis;
    if (cfSource) {
      for (const evalItem of cfSource.evaluations) {
        counterfactuals.push(
          Object.freeze({
            ruleId: evalItem.ruleId,
            condition: `Removal of ${evalItem.removedEvents.length} trigger events`,
            result: evalItem.result,
            interpretation: evalItem.stateDelta.map(d => d.interpretation).join('; ') || 'No state change',
            limitations: evalItem.limitations,
          })
        );
      }
    }

    // 7. Model Contribution (if invoked)
    let modelAssessment: ModelContribution | undefined;
    if (reconciliationResult) {
      const a = reconciliationResult.assessment;
      modelAssessment = Object.freeze({
        modelId: a.modelId,
        version: a.modelVersion,
        modelAssessmentConfidence: a.modelAssessmentConfidence,
        ambiguitySignal: a.ambiguitySignal,
        confidenceDelta: reconciliationResult.confidenceDelta,
        rationale: a.rationale,
      });
    }

    // 8. Verdict Object
    const verdict: ForensicReportVerdict = Object.freeze({
      type: verdictResolution.verdict?.type || 'INCONCLUSIVE',
      summary: verdictResolution.verdict?.summary || 'No canonical violation established.',
      confidence: verdictResolution.confidence,
      eligibility: verdictResolution.eligibility,
    });

    // 9. Uncertainty Statements
    const uncertainty = this.synthesizeUncertainty(verdictResolution, cfSource, contradictions);

    // 10. Limitations
    const limitations: string[] = [ForensicReportBuilder.NON_INTENT_DISCLAIMER];
    if (cfSource) {
      for (const ev of cfSource.evaluations) {
        for (const lim of ev.limitations) {
          if (!limitations.includes(lim)) limitations.push(lim);
        }
      }
    }
    if (reconciliationResult) {
      for (const lim of reconciliationResult.assessment.limitations) {
        if (!limitations.includes(lim)) limitations.push(lim);
      }
    }

    // 11. Executive Summary
    const summary = this.buildExecutiveSummary(verdict, hypothesisResult?.leadingHypothesis, uncertainty[0]);

    return Object.freeze({
      reportId,
      navigationId,
      subject,
      verdict,
      summary,
      timeline: Object.freeze(timelineEntries),
      observations: Object.freeze(observations),
      supportingEvidence: Object.freeze(supportingEvidence),
      contradictions: Object.freeze(contradictions),
      hypotheses: Object.freeze(hypotheses),
      counterfactuals: Object.freeze(counterfactuals),
      modelAssessment,
      uncertainty: Object.freeze(uncertainty),
      limitations: Object.freeze(limitations),
      generatedAt,
    });
  }

  private summarizeEventPayload(payload: Readonly<Record<string, unknown>>): string {
    if (!payload) return 'Recorded activity';
    const safe = this.sanitizePayload(payload);
    if (safe.price !== undefined && safe.displayedBasePrice !== undefined) {
      return `Base price displayed at $${safe.price}`;
    }
    if (safe.feeAppeared) {
      return `Fee "${safe.feeName || 'Platform Fee'}" ($${safe.feeAmount ?? 0}) added to total`;
    }
    if (safe.isProgression || safe.action === 'checkout_continue') {
      return 'User proceeded past cart review / checkout progression';
    }
    if (safe.userSelectedShippingTier) {
      return `User selected shipping tier: ${safe.shippingTier || 'custom'}`;
    }
    if (safe.userSelectedAddon) {
      return 'User added optional upgrade item';
    }
    if (safe.disclosureText) {
      return `Fee disclosure displayed: "${this.sanitizeString(String(safe.disclosureText))}"`;
    }
    return Object.keys(safe).length > 0
      ? Object.entries(safe).map(([k, v]) => `${k}: ${v}`).join(', ')
      : 'Activity observed';
  }

  private formatHypothesis(h: CompetingHypothesis): HypothesisExplanation {
    return Object.freeze({
      hypothesisId: h.id,
      type: h.type,
      category: h.category,
      status: h.status,
      confidence: h.confidence,
      evaluationSummary: h.rationale,
      rejectedReason: h.rejectedReason,
    });
  }

  private synthesizeUncertainty(
    res: VerdictResolution,
    cfSource?: CounterfactualAnalysisResult,
    contradictions?: EvidenceReference[]
  ): UncertaintyStatement[] {
    const statements: UncertaintyStatement[] = [];

    if (contradictions && contradictions.length > 0) {
      statements.push(
        Object.freeze({
          level: 'CONTRADICTORY_EVIDENCE',
          statement: 'Contradictory evidence detected in the observation graph; deceptive claims cannot be confirmed.',
          primaryFactor: 'Hard conflict in observed claim signals.',
        })
      );
      return statements;
    }

    if (res.confidence >= 0.80 && cfSource?.aggregateResult === 'SUPPORTED') {
      statements.push(
        Object.freeze({
          level: 'STRONG_EVIDENCE',
          statement: 'High evidence support based on consistent multi-stage progression and refuted alternatives.',
          primaryFactor: 'Progression-dependent fee introduction corroborated by counterfactual diff.',
        })
      );
    } else if (res.confidence >= 0.50) {
      statements.push(
        Object.freeze({
          level: 'MODERATE_EVIDENCE',
          statement: 'Moderate evidence support: primary hypothesis is plausible, but some competing interpretations remain partially unverified.',
          primaryFactor: 'Competing explanations partially open or pending user interaction signals.',
        })
      );
    } else {
      statements.push(
        Object.freeze({
          level: 'INSUFFICIENT_EVIDENCE',
          statement: 'Insufficient evidence to establish a conclusive pattern.',
          primaryFactor: 'Observed events do not form an unbroken causal chain.',
        })
      );
    }

    return statements;
  }

  private buildExecutiveSummary(
    verdict: ForensicReportVerdict,
    leadingHyp?: CompetingHypothesis | null,
    uncertainty?: UncertaintyStatement
  ): string {
    if (verdict.type === 'DECEPTIVE_COMMERCE' || verdict.type === 'DECEPTIVE_PRICING') {
      return `Vigil observed a progression-dependent price delta. Evidence supports ${leadingHyp?.type || 'deceptive fee introduction'}. Confidence level: ${uncertainty?.level || 'MODERATE'}.`;
    }
    return `Analysis concluded with verdict ${verdict.type}. ${verdict.summary}`;
  }
}
