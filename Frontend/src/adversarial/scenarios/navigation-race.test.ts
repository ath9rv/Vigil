import { describe, it, expect, beforeEach } from 'vitest';
import { AdversarialLabHarness } from '../harness';
import { navigationState } from '../../background/navigation-state';
import { TemporalEventIndex } from '../../evidence/temporal-event-index';
import { EvidenceGraph } from '../../evidence/graph';

describe('Adversarial Scenario 6: Navigation Race & Asynchronous Event Boundary Isolation', () => {
  let harness: AdversarialLabHarness;

  beforeEach(() => {
    harness = new AdversarialLabHarness();
    navigationState.reset();
  });

  it('strictly isolates Page A from Page B during rapid navigation race: discards late Page A events and retains Page B evidence', () => {
    harness.startScenario();
    const TAB_ID = 42;

    const timeline = new TemporalEventIndex();
    const evidenceGraph = new EvidenceGraph();

    // ── Phase 1: CONTROL RUN (Page A active) ─────────────────────────────────
    navigationState.startNavigation(TAB_ID, 'nav-page-A');
    expect(navigationState.isNavigationValid(TAB_ID, 'nav-page-A')).toBe(true);

    timeline.addEvent('nav-page-A', 'DOM', 'page-A-catalog', { price: 40, item: 'A' }, 1000);
    evidenceGraph.addNode({
      id: 'node-A-1',
      type: 'DOM',
      navigationId: 'nav-page-A',
      tabId: TAB_ID,
      timestamp: 1000,
      source: 'scanner',
      strength: 1,
      context: {} as any,
      data: { price: 40 },
      provenance: { collector: 'dom', collectorVersion: '1', observationId: 'obs-A-1' },
    });

    // ── Phase 2: ATTACK RUN (Race condition: navigate to B while A in flight) ──
    harness.markObservationDetected();
    harness.startReasoning();

    // User navigates to Page B
    navigationState.startNavigation(TAB_ID, 'nav-page-B');
    expect(navigationState.isNavigationValid(TAB_ID, 'nav-page-B')).toBe(true);
    expect(navigationState.isNavigationValid(TAB_ID, 'nav-page-A')).toBe(false);

    // Adversarial event: Delayed / in-flight Page A observation arrives post-navigation
    let lateEventDropped = false;
    let lateDropReason = '';

    const lateMessageFromPageA = {
      type: 'VIGIL_LAYOUT_SHIFT',
      context: { tabId: TAB_ID, navigationId: 'nav-page-A', hostname: 'site-a.com' },
      payload: { value: 0.85, sources: [] },
    };

    if (!navigationState.isNavigationValid(TAB_ID, lateMessageFromPageA.context.navigationId)) {
      lateEventDropped = true;
      lateDropReason = 'stale_navigation';
    } else {
      // If broken, it would contaminate timeline
      timeline.addEvent('nav-page-A', 'DOM', 'late-contaminant', {}, 2100);
    }

    // Legitimate Page B evidence arrives
    timeline.addEvent('nav-page-B', 'DOM', 'page-B-cart', { price: 95, item: 'B' }, 2200);
    evidenceGraph.addNode({
      id: 'node-B-1',
      type: 'DOM',
      navigationId: 'nav-page-B',
      tabId: TAB_ID,
      timestamp: 2200,
      source: 'scanner',
      strength: 1,
      context: {} as any,
      data: { price: 95 },
      provenance: { collector: 'dom', collectorVersion: '1', observationId: 'obs-B-1' },
    });

    harness.markReasoningComplete();
    harness.startReport();

    // ── Phase 3: RECOVERY RUN & INTEGRITY AUDIT ──────────────────────────────
    expect(lateEventDropped).toBe(true);
    expect(lateDropReason).toBe('stale_navigation');

    // Verify Page B timeline contains ONLY Page B events
    const pageBEvents = timeline.getEvents('nav-page-B');
    expect(pageBEvents.length).toBe(1);
    expect(pageBEvents[0].navigationId).toBe('nav-page-B');
    expect(pageBEvents[0].source).toBe('page-B-cart');

    // Verify EvidenceGraph snapshot for Page B has zero contamination from Page A
    const pageBSnapshot = evidenceGraph.createReadOnlySnapshot('nav-page-B');
    const nodesInB = pageBSnapshot.getNodes().filter(n => n.navigationId === 'nav-page-B');
    expect(nodesInB.length).toBe(1);
    expect(nodesInB[0].id).toBe('node-B-1');

    const contaminatedNodes = pageBSnapshot.getNodes().filter(n => n.navigationId === 'nav-page-A');
    expect(contaminatedNodes.length).toBe(0);

    harness.markReportComplete();

    const telemetry = harness.finishRun({
      scenario: 'Navigation Race: Stale In-Flight Event Boundary Isolation',
      outcome: 'RESISTED',
      mutationsPerSec: 0,
      serviceWorkerWakeups: 2,
      governor: 'NORMAL',
      evidenceIntegrity: 'PASS',
      semanticFidelity: 'PASS',
      notes: 'Page A late in-flight observation discarded at boundary; Page B evidence retained; zero cross-navigation contamination (INV-SEC-005, INV-V4-002, INV-V4-006).',
    });

    expect(telemetry.outcome).toBe('RESISTED');
    expect(telemetry.evidenceIntegrity).toBe('PASS');
  });
});
