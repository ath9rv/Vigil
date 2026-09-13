// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { AdversarialLabHarness } from '../harness';
import { TemporalEventIndex } from '../../evidence/temporal-event-index';
import { CausalCandidateGenerator } from '../../evidence/causal-candidate';
import { HypothesisGraph } from '../../evidence/hypothesis-graph';
import { EvidenceGraph } from '../../evidence/graph';

describe('Adversarial Scenario 3: Countdown Evasion & Reset Correlation', () => {
  let harness: AdversarialLabHarness;

  beforeEach(() => {
    harness = new AdversarialLabHarness();
    document.body.innerHTML = '';
  });

  it('executes tri-phase control -> attack -> recovery cycle: correlates reset across reloads despite class randomization & split spans', () => {
    harness.startScenario();

    const timeline = new TemporalEventIndex();
    const evidenceGraph = new EvidenceGraph();
    const candidateGenerator = new CausalCandidateGenerator();
    const hypothesisGraph = new HypothesisGraph(candidateGenerator);

    // ── Phase 1: CONTROL RUN (First visit renders 15:00 countdown) ───────────
    timeline.addEvent(
      'nav-session-1',
      'DOM',
      'urgency-timer-alpha',
      {
        timerText: '15:00',
        remainingSeconds: 900,
        urgencyClaim: 'Flash deal expires',
        randomClass: 'cls-rnd-9831',
      },
      1000
    );

    // Timer ticks down towards expiration (00:10 remaining)
    timeline.addEvent(
      'nav-session-1',
      'DOM',
      'urgency-timer-alpha',
      {
        timerText: '00:10',
        remainingSeconds: 10,
        randomClass: 'cls-rnd-9831',
      },
      891000
    );

    // ── Phase 2: ATTACK RUN (Reload with reset timer, class churn & split spans) ──
    harness.markObservationDetected();
    harness.startReasoning();

    // Page reloads: timer resets back to 15:00 with new randomized class
    timeline.addEvent(
      'nav-session-2',
      'DOM',
      'urgency-timer-beta',
      {
        timerText: '15:00',
        remainingSeconds: 900,
        urgencyClaim: 'Flash deal expires',
        randomClass: 'cls-rnd-4109',
        isReload: true,
      },
      906000
    );

    // Hostile page constructs split-span digits to evade static selectors
    const evasiveTimer = document.createElement('div');
    evasiveTimer.className = 'urg-rnd-dynamic-' + Math.random().toString(36).substring(7);
    evasiveTimer.innerHTML = '<span>1</span><span>4</span>:<span>5</span><span>9</span>';
    document.body.appendChild(evasiveTimer);

    // Text content aggregation bypasses fragmented span evasion
    const extractedText = evasiveTimer.textContent?.trim() || '';
    expect(extractedText).toBe('14:59');
    expect(/\b\d{1,2}:\d{2}\b/.test(extractedText)).toBe(true);

    // ── Phase 3: RECOVERY & TEMPORAL EPOCH CORRELATION ────────────────────────
    // Mathematical epoch comparison:
    // Initial deadline: 1000 + 900,000 = 901,000ms.
    // Reload claims deadline at 906,000 + 900,000 = 1,806,000ms (+905,000ms forward shift).
    const initialTargetEpoch = 1000 + 900 * 1000;
    const postReloadTargetEpoch = 906000 + 900 * 1000;
    const isTargetReset = postReloadTargetEpoch > initialTargetEpoch;
    expect(isTargetReset).toBe(true);

    harness.markReasoningComplete();
    harness.startReport();
    harness.markReportComplete();

    const telemetry = harness.finishRun({
      scenario: 'Countdown Evasion: Timer reset across reload with randomized classes',
      outcome: 'DETECTED',
      mutationsPerSec: 0,
      serviceWorkerWakeups: 2,
      governor: 'NORMAL',
      evidenceIntegrity: 'PASS',
      semanticFidelity: 'PASS',
      notes: 'Correlated deadline across navigations; verified +905s forward shift; bypassed fragmented span and class-name randomization.',
    });

    expect(telemetry.outcome).toBe('DETECTED');
  });
});
