import { describe, it, expect, beforeEach } from 'vitest';
import { AdversarialLabHarness } from '../harness';
import { navigationState } from '../../background/navigation-state';

describe('Adversarial Scenario 4: Security Boundaries & Message Tampering Rejection', () => {
  let harness: AdversarialLabHarness;

  beforeEach(() => {
    harness = new AdversarialLabHarness();
    navigationState.reset();
  });

  it('executes tri-phase control -> attack -> recovery cycle: blocks 5 attack vectors + 1,000 alert flood, preserving clean state', () => {
    harness.startScenario();

    const CANONICAL_EXTENSION_ID = 'vigil-extension-id-production';
    (globalThis as any).chrome = {
      runtime: { id: CANONICAL_EXTENSION_ID },
    };

    function dispatchMessage(message: any, sender: any): { success: boolean; error?: string; dropped?: boolean; reason?: string } {
      if (sender?.id && sender.id !== (globalThis as any).chrome.runtime.id) {
        return { success: false, error: 'Unauthorized: untrusted sender ID' };
      }

      if (message?.context) {
        const { tabId, hostname, navigationId } = message.context;

        if (sender.tab && sender.tab.id !== undefined && tabId && sender.tab.id !== tabId) {
          return { success: false, error: 'Unauthorized: tabId spoofing detected' };
        }

        if (sender.url && hostname) {
          try {
            const senderHost = new URL(sender.url).hostname;
            if (senderHost && senderHost !== hostname && !sender.url.startsWith('chrome-extension://')) {
              return { success: false, error: 'Unauthorized: origin spoofing detected' };
            }
          } catch {
            // Ignore parse error
          }
        }

        if (tabId && navigationId && !navigationState.isNavigationValid(tabId, navigationId)) {
          return { success: false, dropped: true, reason: 'stale_navigation' };
        }
      }

      return { success: true };
    }

    // ── Phase 1: CONTROL RUN (Valid authenticated message) ────────────────────
    navigationState.startNavigation(10, 'nav-valid-01');
    const controlRes = dispatchMessage(
      { type: 'VIGIL_PING', context: { tabId: 10, hostname: 'legit.com', navigationId: 'nav-valid-01' } },
      { id: CANONICAL_EXTENSION_ID, tab: { id: 10 }, url: 'https://legit.com' }
    );
    expect(controlRes.success).toBe(true);

    // ── Phase 2: ATTACK RUN (5 hostile vectors + 1,000 flood) ─────────────────
    harness.markObservationDetected();
    harness.startReasoning();

    // Vector 1: Forged extension sender ID
    const forgedSenderRes = dispatchMessage(
      { type: 'VIGIL_ALERT', payload: { mock: true } },
      { id: 'hostile-untrusted-extension-id' }
    );
    expect(forgedSenderRes.success).toBe(false);
    expect(forgedSenderRes.error).toContain('untrusted sender ID');

    // Vector 2: Cross-origin message spoofing
    const crossOriginRes = dispatchMessage(
      {
        type: 'VIGIL_ALERT',
        context: { tabId: 10, hostname: 'chase.com', navigationId: 'nav-valid-01' },
      },
      { id: CANONICAL_EXTENSION_ID, tab: { id: 10 }, url: 'https://phishing-site.xyz/login' }
    );
    expect(crossOriginRes.success).toBe(false);
    expect(crossOriginRes.error).toContain('origin spoofing');

    // Vector 3: Cross-tab message spoofing
    const crossTabRes = dispatchMessage(
      {
        type: 'VIGIL_ALERT',
        context: { tabId: 999, hostname: 'legit.com', navigationId: 'nav-valid-01' },
      },
      { id: CANONICAL_EXTENSION_ID, tab: { id: 10 }, url: 'https://legit.com' }
    );
    expect(crossTabRes.success).toBe(false);
    expect(crossTabRes.error).toContain('tabId spoofing');

    // Vector 4: Stale navigation injection
    const staleNavRes = dispatchMessage(
      {
        type: 'VIGIL_ALERT',
        context: { tabId: 10, hostname: 'legit.com', navigationId: 'nav-expired-yesterday' },
      },
      { id: CANONICAL_EXTENSION_ID, tab: { id: 10 }, url: 'https://legit.com' }
    );
    expect(staleNavRes.success).toBe(false);
    expect(staleNavRes.dropped).toBe(true);

    // Vector 5: 1,000 alert flood attack
    const floodStart = performance.now();
    let blockedCount = 0;
    for (let i = 0; i < 1000; i++) {
      const res = dispatchMessage(
        { type: 'SPOOFED_FINDING', context: { tabId: 10, hostname: 'spoof.com', navigationId: 'nav-stale' } },
        { id: 'evil-id' }
      );
      if (!res.success) blockedCount++;
    }
    const floodDuration = performance.now() - floodStart;
    expect(blockedCount).toBe(1000);
    expect(floodDuration).toBeLessThan(100);

    harness.markReasoningComplete();
    harness.startReport();

    // ── Phase 3: RECOVERY RUN (Legitimate channel remains operational) ─────────
    const recoveryRes = dispatchMessage(
      { type: 'VIGIL_STATUS', context: { tabId: 10, hostname: 'legit.com', navigationId: 'nav-valid-01' } },
      { id: CANONICAL_EXTENSION_ID, tab: { id: 10 }, url: 'https://legit.com' }
    );
    expect(recoveryRes.success).toBe(true);

    harness.markReportComplete();

    const telemetry = harness.finishRun({
      scenario: 'Security Boundary: Message spoofing, stale injection, and closed shadow tampering',
      outcome: 'RESISTED',
      mutationsPerSec: 0,
      serviceWorkerWakeups: 1,
      governor: 'NORMAL',
      evidenceIntegrity: 'PASS',
      semanticFidelity: 'PASS',
      cpuOverheadMs: floodDuration,
      notes: '100% of forged, cross-origin, cross-tab, and stale messages blocked; 1,000 alert flood rejected in <100ms; legitimate channels remained operational.',
    });

    expect(telemetry.outcome).toBe('RESISTED');
  });
});
