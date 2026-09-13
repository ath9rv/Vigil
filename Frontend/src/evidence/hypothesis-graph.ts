import type { ReadOnlyEvidenceGraph } from './graph';
import type { TemporalEventIndex } from './temporal-event-index';
import type { CausalCandidateGenerator, CausalCandidateOptions } from './causal-candidate';
import type {
  CompetingHypothesis,
  HypothesisEvaluationResult,
  CausalCandidate,
  TemporalEvent,
} from './v4/types';
import { CounterfactualEngine } from './counterfactual/counterfactual-engine';
import type { CounterfactualAnalysisResult } from './counterfactual/types';

export interface HypothesisGraphOptions extends CausalCandidateOptions {
  maxExecutionTimeMs?: number;
  enableCounterfactual?: boolean;
}

const DEFAULT_MAX_BUDGET_MS = 50;

/**
 * HypothesisGraph
 *
 * Evaluates competing hypotheses (Innocuous vs. Deceptive) against
 * deterministic causal candidates and read-only evidence snapshots.
 *
 * Enforces:
 * - Read-only intake: receives ReadOnlyEvidenceGraph exclusively (ADR-004).
 * - INV-V4-001: Every hypothesis references >= 1 immutable RawObservation.
 * - INV-V4-004: Exposes supporting evidence, contradictions, and rejected alternatives.
 * - INV-V4-009: Zero mutation of underlying evidence.
 * - INV-V4-010: Execution budget-bound and interruptible.
 * - INV-V4-011: Rejected alternatives preserved for forensic audit.
 */
export class HypothesisGraph {
  private counterfactualEngine: CounterfactualEngine;

  constructor(
    private candidateGenerator: CausalCandidateGenerator,
    counterfactualEngine?: CounterfactualEngine
  ) {
    this.counterfactualEngine = counterfactualEngine ?? new CounterfactualEngine();
  }

  /**
   * Evaluates all competing hypotheses for a specific navigation timeline.
   */
  public evaluate(
    navigationId: string,
    timeline: TemporalEventIndex,
    graph: ReadOnlyEvidenceGraph,
    options: HypothesisGraphOptions = {}
  ): HypothesisEvaluationResult {
    const startTime = performance.now();
    const budgetMs = options.maxExecutionTimeMs ?? DEFAULT_MAX_BUDGET_MS;

    const candidates = this.candidateGenerator.generateCandidates(navigationId, timeline, graph, options);
    const events = timeline.getEvents(navigationId);

    const activeHypotheses: CompetingHypothesis[] = [];
    const rejectedAlternatives: CompetingHypothesis[] = [];
    let governorYielded = false;

    // â”€â”€ Evaluate Drip Pricing Hypothesis Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (this.detectsPriceProgressionCandidates(candidates, events)) {
      if (performance.now() - startTime > budgetMs) {
        governorYielded = true;
      } else {
        const dripSuite = this.evaluateDripPricingSuite(navigationId, candidates, events);
        for (const h of dripSuite) {
          if (h.status === 'DISPROVED' || h.status === 'REJECTED_INSUFFICIENT_EVIDENCE') {
            rejectedAlternatives.push(h);
          } else {
            activeHypotheses.push(h);
          }
        }
      }
    }

    // â”€â”€ Determine Leading Hypothesis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    activeHypotheses.sort((a, b) => b.confidence - a.confidence);
    const leadingHypothesis = activeHypotheses.length > 0 ? activeHypotheses[0] : null;

    let counterfactualAnalysis: CounterfactualAnalysisResult | undefined;
    if (options.enableCounterfactual && leadingHypothesis && !governorYielded) {
      const elapsed = performance.now() - startTime;
      const remainingBudget = Math.max(5, budgetMs - elapsed);
      counterfactualAnalysis = this.counterfactualEngine.evaluateHypothesis(
        leadingHypothesis,
        navigationId,
        timeline,
        { maxBudgetMs: remainingBudget }
      );
    }

    return Object.freeze({
      navigationId,
      activeHypotheses: Object.freeze(activeHypotheses),
      leadingHypothesis,
      rejectedAlternatives: Object.freeze(rejectedAlternatives),
      timestamp: Date.now(),
      totalEvaluated: activeHypotheses.length + rejectedAlternatives.length,
      governorYielded,
      counterfactualAnalysis,
    });
  }

  /**
   * Checks if the candidates show a price or fee transition following a progression.
   */
  private detectsPriceProgressionCandidates(
    candidates: readonly CausalCandidate[],
    events: readonly TemporalEvent[]
  ): boolean {
    const hasTransition = candidates.some(
      c => c.relationship === 'STATE_TRANSITION' || c.relationship === 'USER_TRIGGERED'
    );
    const hasPriceEvents = events.some(
      e => e.payload?.price !== undefined || e.payload?.feeAppeared || e.payload?.addedText
    );
    return hasTransition && hasPriceEvents;
  }

  /**
   * Evaluates the competing hypotheses for drip pricing:
   * H_Deceptive: Drip Pricing (hidden fee revealed after progression)
   * H_Innocuous_Tax: Regional tax adjustment
   * H_Innocuous_Shipping: User-selected express shipping
   * H_Innocuous_Upgrade: User-selected product add-on
   */
  private evaluateDripPricingSuite(
    navigationId: string,
    candidates: readonly CausalCandidate[],
    events: readonly TemporalEvent[]
  ): CompetingHypothesis[] {
    const hypotheses: CompetingHypothesis[] = [];

    // Find state transition candidates
    const transitionCandidates = candidates.filter(
      c => c.relationship === 'STATE_TRANSITION' || c.relationship === 'USER_TRIGGERED'
    );
    const candidateIds = transitionCandidates.map(c => c.candidateId);

    // Extract evidentiary facts
    let userSelectedShipping = false;
    let userSelectedUpgrade = false;
    let separateTaxLineItemExists = false;
    let feeIsMandatory = false;
    let basePriceExistedAtT0 = false;
    let feeAppearedAtProgression = false;

    for (const e of events) {
      if (e.payload?.price !== undefined || e.payload?.displayedBasePrice !== undefined) {
        basePriceExistedAtT0 = true;
      }
      if (e.payload?.feeAppeared || e.payload?.mandatoryPlatformFee) {
        feeAppearedAtProgression = true;
        feeIsMandatory = true;
      }
      if (e.payload?.userSelectedShippingTier) {
        userSelectedShipping = true;
      }
      if (e.payload?.userSelectedAddon) {
        userSelectedUpgrade = true;
      }
      if (e.payload?.taxItemizedSeparately) {
        separateTaxLineItemExists = true;
      }
    }

    // 1. Evaluate H_Innocuous_Tax
    if (separateTaxLineItemExists) {
      hypotheses.push(Object.freeze({
        id: `hyp-tax-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_REGIONAL_TAX',
        category: 'INNOCUOUS',
        status: 'DISPROVED',
        confidence: 0.1,
        supportingCandidateIds: Object.freeze([]),
        contradictoryCandidateIds: Object.freeze(candidateIds),
        rationale: 'Regional tax is itemized separately as an independent line item; cannot explain unannounced fee.',
        rejectedReason: 'Contradicted by separate independent tax line item on checkout review.',
      }));
    } else {
      hypotheses.push(Object.freeze({
        id: `hyp-tax-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_REGIONAL_TAX',
        category: 'INNOCUOUS',
        status: 'PLAUSIBLE',
        confidence: 0.4,
        supportingCandidateIds: Object.freeze(candidateIds),
        contradictoryCandidateIds: Object.freeze([]),
        rationale: 'Fee may represent regional tax adjustments pending location confirmation.',
      }));
    }

    // 2. Evaluate H_Innocuous_Shipping
    if (userSelectedShipping) {
      hypotheses.push(Object.freeze({
        id: `hyp-shipping-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_SHIPPING_SELECTION',
        category: 'INNOCUOUS',
        status: 'CONFIRMED',
        confidence: 0.9,
        supportingCandidateIds: Object.freeze(candidateIds),
        contradictoryCandidateIds: Object.freeze([]),
        rationale: 'User explicitly selected a shipping tier; price delta directly corresponds to shipping option.',
      }));
    } else {
      hypotheses.push(Object.freeze({
        id: `hyp-shipping-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_SHIPPING_SELECTION',
        category: 'INNOCUOUS',
        status: 'DISPROVED',
        confidence: 0.05,
        supportingCandidateIds: Object.freeze([]),
        contradictoryCandidateIds: Object.freeze(candidateIds),
        rationale: 'No shipping tier interaction was recorded prior to fee appearance.',
        rejectedReason: 'Disproved: zero user shipping selection observed before fee delta.',
      }));
    }

    // 3. Evaluate H_Innocuous_Upgrade
    if (userSelectedUpgrade) {
      hypotheses.push(Object.freeze({
        id: `hyp-upgrade-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_OPTIONAL_UPGRADE',
        category: 'INNOCUOUS',
        status: 'CONFIRMED',
        confidence: 0.85,
        supportingCandidateIds: Object.freeze(candidateIds),
        contradictoryCandidateIds: Object.freeze([]),
        rationale: 'User affirmatively added an optional upgrade item.',
      }));
    } else {
      hypotheses.push(Object.freeze({
        id: `hyp-upgrade-${navigationId}`,
        navigationId,
        type: 'INNOCUOUS_OPTIONAL_UPGRADE',
        category: 'INNOCUOUS',
        status: 'DISPROVED',
        confidence: 0.05,
        supportingCandidateIds: Object.freeze([]),
        contradictoryCandidateIds: Object.freeze(candidateIds),
        rationale: 'No optional item was selected or added to cart by user.',
        rejectedReason: 'Disproved: zero cart additions or upgrades selected.',
      }));
    }

    // 4. Evaluate H_Deceptive_DripPricing
    if (basePriceExistedAtT0 && feeAppearedAtProgression && feeIsMandatory && !userSelectedShipping && !userSelectedUpgrade) {
      hypotheses.push(Object.freeze({
        id: `hyp-drip-${navigationId}`,
        navigationId,
        type: 'DECEPTIVE_DRIP_PRICING',
        category: 'DECEPTIVE',
        status: 'CONFIRMED',
        confidence: 0.92,
        supportingCandidateIds: Object.freeze(candidateIds),
        contradictoryCandidateIds: Object.freeze([]),
        rationale: 'Mandatory fee was absent from initial base price and only introduced following user progression. Competing alternatives (shipping, upgrades, taxes) have been refuted by structural evidence.',
      }));
    } else if (feeAppearedAtProgression) {
      hypotheses.push(Object.freeze({
        id: `hyp-drip-${navigationId}`,
        navigationId,
        type: 'DECEPTIVE_DRIP_PRICING',
        category: 'DECEPTIVE',
        status: 'PLAUSIBLE',
        confidence: 0.65,
        supportingCandidateIds: Object.freeze(candidateIds),
        contradictoryCandidateIds: Object.freeze([]),
        rationale: 'Unannounced fee appeared during progression, but some competing alternatives remain unverified.',
      }));
    }

    return hypotheses;
  }
}
