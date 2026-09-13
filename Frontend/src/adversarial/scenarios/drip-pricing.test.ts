import { describe, it, expect, beforeEach } from 'vitest';
import { AdversarialLabHarness } from '../harness';
import { TemporalEventIndex } from '../../evidence/temporal-event-index';
import { CausalCandidateGenerator } from '../../evidence/causal-candidate';
import { HypothesisGraph } from '../../evidence/hypothesis-graph';
import { EvidenceGraph } from '../../evidence/graph';
import { ForensicReportBuilder } from '../../evidence/forensic-report/report-builder';
import { ForensicReportFormatter } from '../../evidence/forensic-report/report-formatter';

describe('Adversarial Scenario 1: Drip Pricing Detection & Forensic Accountability', () => {
  let harness: AdversarialLabHarness;

  beforeEach(() => {
    harness = new AdversarialLabHarness();
  });

  it('executes tri-phase control -> attack -> recovery cycle, refutes alternatives, and produces audited ForensicReport', () => {
    harness.startScenario();
    const navId = 'nav-drip-adv-01';
    const baseTimestamp = Date.UTC(2026, 8, 12, 12, 0, 0);

    const timeline = new TemporalEventIndex();
    const evidenceGraph = new EvidenceGraph();
    const candidateGenerator = new CausalCandidateGenerator();
    const hypothesisGraph = new HypothesisGraph(candidateGenerator);

    // ── Phase 1: CONTROL RUN (Base product browsing with transparent pricing) ──
    timeline.addEvent(
      navId,
      'DOM',
      'product-catalog',
      { displayedBasePrice: 50, price: 50, currency: 'USD' },
      baseTimestamp + 1000
    );
    evidenceGraph.addNode({
      id: `node-${navId}-1`,
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: baseTimestamp + 1000,
      source: 'scanner',
      strength: 1,
      context: {} as any,
      data: { price: 50 },
      provenance: { collector: 'dom', collectorVersion: '1', observationId: `obs-${navId}-1` },
    });

    // ── Phase 2: ATTACK RUN (Post-progression unannounced fee injection) ───────
    timeline.addEvent(
      navId,
      'USER_EVENT',
      'btn-checkout',
      { isProgression: true, action: 'checkout_continue' },
      baseTimestamp + 1600
    );

    timeline.addEvent(
      navId,
      'DOM',
      'checkout-summary',
      {
        feeAppeared: true,
        mandatoryPlatformFee: true,
        feeName: 'Mandatory Service & Handling Fee',
        feeAmount: 18,
        price: 68,
        currency: 'USD',
      },
      baseTimestamp + 2400
    );
    evidenceGraph.addNode({
      id: `node-${navId}-2`,
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: baseTimestamp + 2400,
      source: 'scanner',
      strength: 1,
      context: {} as any,
      data: { fee: 18, price: 68 },
      provenance: { collector: 'dom', collectorVersion: '1', observationId: `obs-${navId}-3` },
    });

    harness.markObservationDetected();
    harness.startReasoning();

    const snapshot = evidenceGraph.createReadOnlySnapshot(navId);

    // Evaluate competing hypotheses with counterfactual engine enabled
    const evalResult = hypothesisGraph.evaluate(navId, timeline, snapshot, {
      enableCounterfactual: true,
    });

    harness.markReasoningComplete();
    harness.startReport();

    // ── Phase 3: RECOVERY & ACCOUNTABILITY RUN ────────────────────────────────
    expect(evalResult.leadingHypothesis).not.toBeNull();
    expect(evalResult.leadingHypothesis?.type).toBe('DECEPTIVE_DRIP_PRICING');
    expect(evalResult.leadingHypothesis?.status).toBe('CONFIRMED');
    expect(evalResult.leadingHypothesis?.confidence).toBeGreaterThanOrEqual(0.90);

    // Competing alternatives systematically evaluated and refuted
    expect(evalResult.rejectedAlternatives.length).toBeGreaterThanOrEqual(2);
    const rejectedTypes = evalResult.rejectedAlternatives.map(h => h.type);
    expect(rejectedTypes).toContain('INNOCUOUS_SHIPPING_SELECTION');
    expect(rejectedTypes).toContain('INNOCUOUS_OPTIONAL_UPGRADE');

    // Counterfactual analysis verified bounded delta without simulation
    expect(evalResult.counterfactualAnalysis).toBeDefined();
    expect(evalResult.counterfactualAnalysis?.aggregateResult).toBe('SUPPORTED');
    expect(evalResult.counterfactualAnalysis?.evaluations.length).toBeGreaterThanOrEqual(1);

    // Audited CanonicalForensicReport generation
    const builder = new ForensicReportBuilder();
    const report = builder.buildReport({
      navigationId: navId,
      subject: { domain: 'shop-adversarial.com', url: 'https://shop-adversarial.com/checkout' },
      graph: snapshot,
      timeline,
      verdictResolution: {
        eligibility: 'ELIGIBLE',
        verdict: { type: 'DECEPTIVE_UI_PATTERN', summary: 'Unannounced mandatory $18 fee injected after checkout progression' },
        claimId: 'claim-drip-adv-01',
        confidence: evalResult.leadingHypothesis?.confidence ?? 0.92,
        supportingEvidenceIds: [`obs-${navId}-1`, `obs-${navId}-3`],
        contradictingEvidenceIds: [],
        rejectedInferences: rejectedTypes.map(t => ({
          claimPredicate: t,
          reason: 'Disproved by lack of user selection or tax disclosure',
          evidenceConsidered: [],
        })),
        explanation: evalResult.leadingHypothesis?.rationale ?? 'Drip pricing verified.',
      },
      hypothesisResult: evalResult,
      counterfactualResult: evalResult.counterfactualAnalysis,
    });

    expect(report.reportId).toMatch(/^VF-\d{4}-[0-9A-F]{6}$/);
    expect(report.verdict.confidence).toBe(evalResult.leadingHypothesis?.confidence);
    const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);
    expect(l1.nonIntentDisclaimer).toContain("does not establish the company's intent");
    expect(report.timeline.length).toBe(3);

    harness.markReportComplete();

    const telemetry = harness.finishRun({
      scenario: 'Drip Pricing: Unannounced post-progression fee injection',
      outcome: 'DETECTED',
      mutationsPerSec: 0,
      serviceWorkerWakeups: 1,
      governor: 'NORMAL',
      evidenceIntegrity: 'PASS',
      semanticFidelity: 'PASS',
      notes: `Generated audited report ${report.reportId}; refuted shipping/upgrades; isolated bounded delta ($18) with non-intent legal protection.`,
    });

    expect(telemetry.outcome).toBe('DETECTED');
  });
});
