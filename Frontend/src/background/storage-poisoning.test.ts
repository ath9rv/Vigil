import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleFastLaneAlert, MAX_FAST_LANE_ALERTS, FAST_LANE_TTL_MS } from './fast-lane';
import { Finding } from '../shared/types';

describe('Adversarial Storage Poisoning & Capacity Invariant Verification', () => {
  let storageMock: Record<string, any> = {};

  beforeEach(() => {
    storageMock = {};
    (globalThis as any).chrome = {
      notifications: {
        create: vi.fn(),
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageMock[key] })),
          set: vi.fn(async (obj: any) => {
            Object.assign(storageMock, obj);
          }),
        },
      },
    };
  });

  it('bounds storage array to MAX_FAST_LANE_ALERTS (50) under an alert flooding attack', async () => {
    for (let i = 0; i < 200; i++) {
      const fakeFinding: Finding = {
        id: 'flood-' + i,
        ruleId: 'M2-FLOOD',
        ruleName: 'Storage Flood',
        module: 'M2',
        severity: 'CRITICAL',
        confidenceState: 'CONFIRMED',
        statuteRef: '',
        explanation: 'Flood attempt ' + i,
        elementSelector: 'body',
        context: {
          scan: { tabId: i, navigationId: 'nav-' + i, origin: 'https://attacker.xyz', hostname: 'attacker.xyz', startedAt: Date.now() },
          evidence: [],
          coverage: { dom: true, threatIntel: true, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false },
        },
        pageUrl: 'https://attacker.xyz/path/' + i,
        detectedAt: new Date().toISOString(),
      };
      await handleFastLaneAlert(fakeFinding, i);
    }

    expect(storageMock.fast_lane_alerts).toBeDefined();
    expect(storageMock.fast_lane_alerts.length).toBe(MAX_FAST_LANE_ALERTS);
    expect(storageMock.fast_lane_alerts.length).toBeLessThanOrEqual(50);
    // Oldest entries were evicted (FIFO)
    expect(storageMock.fast_lane_alerts[0].finding.id).toBe('flood-150');
    expect(storageMock.fast_lane_alerts[49].finding.id).toBe('flood-199');
  });

  it('handles massive 100KB string payloads and malformed URLs without crashing', async () => {
    const hugeString = 'A'.repeat(100 * 1024);
    const hostileFinding: Finding = {
      id: hugeString.slice(0, 50),
      ruleId: 'M2-HOSTILE',
      ruleName: 'Hostile Input',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: hugeString,
      elementSelector: 'body',
      context: {
        scan: { tabId: 999, navigationId: 'not a url', origin: 'spoofed://fake', hostname: 'fake', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false },
      },
      pageUrl: 'javascript:alert(1)',
      detectedAt: 'invalid-date-format',
    };

    await expect(handleFastLaneAlert(hostileFinding, 123)).resolves.not.toThrow();
    expect(storageMock.fast_lane_alerts.length).toBe(1);
    expect(storageMock.fast_lane_alerts[0].domain).toBe('fake');
  });

  it('evicts stale alert entries exceeding 24h TTL during new insertions', async () => {
    const now = Date.now();
    const staleTime = new Date(now - (FAST_LANE_TTL_MS + 60000)).toISOString();
    const freshTime = new Date(now - 1000).toISOString();

    storageMock.fast_lane_alerts = [
      {
        finding: { id: 'stale-1' } as any,
        domain: 'stale1.com',
        timestamp: staleTime,
      },
      {
        finding: { id: 'stale-2' } as any,
        domain: 'stale2.com',
        timestamp: 'invalid-timestamp',
      },
      {
        finding: { id: 'fresh-1' } as any,
        domain: 'fresh1.com',
        timestamp: freshTime,
      },
    ];

    const newFinding: Finding = {
      id: 'new-1',
      ruleId: 'M2-001',
      ruleName: 'Phishing',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Active alert',
      elementSelector: 'html',
      pageUrl: 'https://newsite.com',
      detectedAt: new Date().toISOString(),
      context: {
        scan: { tabId: 5, navigationId: 'nav-new', origin: 'https://newsite.com', hostname: 'newsite.com', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: false, threatIntel: true, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false },
      },
    };

    await handleFastLaneAlert(newFinding, 5);

    expect(storageMock.fast_lane_alerts.length).toBe(2);
    expect(storageMock.fast_lane_alerts[0].domain).toBe('fresh1.com');
    expect(storageMock.fast_lane_alerts[1].domain).toBe('newsite.com');
  });
});
