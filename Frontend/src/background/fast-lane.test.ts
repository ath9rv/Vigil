import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleFastLaneAlert } from './fast-lane';
import { Finding } from '../shared/types';

describe('Background Worker Fast-Lane Emergency Alert Engine', () => {
  let storageMock: Record<string, any> = {};
  let notificationMock: any = null;
  let badgeTextMock: any = null;
  let badgeColorMock: any = null;
  let tabsSendMessageMock: any = null;

  beforeEach(() => {
    storageMock = {};
    notificationMock = null;
    badgeTextMock = null;
    badgeColorMock = null;
    tabsSendMessageMock = null;

    (globalThis as any).chrome = {
      notifications: {
        create: vi.fn((opts: any) => {
          notificationMock = opts;
        })
      },
      action: {
        setBadgeText: vi.fn((opts: any) => {
          badgeTextMock = opts;
        }),
        setBadgeBackgroundColor: vi.fn((opts: any) => {
          badgeColorMock = opts;
        })
      },
      tabs: {
        sendMessage: vi.fn(async (tabId: number, msg: any) => {
          tabsSendMessageMock = { tabId, msg };
          return true;
        })
      },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageMock[key] })),
          set: vi.fn(async (obj: any) => {
            Object.assign(storageMock, obj);
          })
        }
      }
    };
  });

  it('triggers zero-network priority 2 notifications for critical phishing alerts', async () => {
    const fakeFinding: Finding = {
      id: 'crit-01',
      ruleId: 'M2-001',
      ruleName: 'domain_similarity',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Lookalike domain mimicking banking portal',
      elementSelector: 'body',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 1, navigationId: 'https://example.com', origin: 'https://example.com', hostname: 'example.com', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://example.com/login',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 42);

    expect(notificationMock).toBeDefined();
    expect(notificationMock.priority).toBe(2);
    expect(notificationMock.title).toContain('Vigil Security Alert');
    expect(notificationMock.message).toContain('example.com');
  });

  it('updates extension action badge with red exclamation mark on affected tab', async () => {
    const fakeFinding: Finding = {
      id: 'crit-02',
      ruleId: 'M2-005',
      ruleName: 'form_action_mismatch',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Credential exfiltration detected',
      elementSelector: 'form',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 1, navigationId: 'https://fake-login.com/auth', origin: 'https://fake-login.com', hostname: 'fake-login.com', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://fake-login.com/auth',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 101);

    expect(badgeTextMock).toEqual({ text: '!', tabId: 101 });
    expect(badgeColorMock).toEqual({ color: '#ef4444', tabId: 101 });
  });

  it('appends alert events into local fast-lane audit log', async () => {
    const fakeFinding: Finding = {
      id: 'crit-03',
      ruleId: 'M2-003',
      ruleName: 'phishing_clone',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Phishing clone page',
      elementSelector: 'form',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 1, navigationId: 'https://arnazon.in/signin', origin: 'https://arnazon.in', hostname: 'arnazon.in', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://arnazon.in/signin',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 7);

    expect(storageMock.fast_lane_alerts).toBeDefined();
    expect(storageMock.fast_lane_alerts.length).toBe(1);
    expect(storageMock.fast_lane_alerts[0].domain).toBe('arnazon.in');
  });

  it('dispatches SHOW_EMERGENCY_ALERT to affected tab for in-page Ambient Shield intervention', async () => {
    const fakeFinding: Finding = {
      id: 'crit-04',
      ruleId: 'M2-005',
      ruleName: 'credential_theft',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Credential submission to unauthorized external domain',
      elementSelector: 'form#login',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 10, navigationId: 'https://deceptive-portal.net', origin: 'https://deceptive-portal.net', hostname: 'deceptive-portal.net', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://deceptive-portal.net',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 10);

    expect(tabsSendMessageMock).toBeDefined();
    expect(tabsSendMessageMock.tabId).toBe(10);
    expect(tabsSendMessageMock.msg.type).toBe('SHOW_EMERGENCY_ALERT');
    expect(tabsSendMessageMock.msg.alert.type).toBe('CRITICAL_SECURITY');
    expect(tabsSendMessageMock.msg.alert.title).toContain('Vigil Critical Security Alert');
    expect(tabsSendMessageMock.msg.alert.message).toContain('Credential submission');
  });

  it('does NOT dispatch in-page emergency alert for non-critical findings', async () => {
    const nonCritFinding: Finding = {
      id: 'med-01',
      ruleId: 'M1-001',
      ruleName: 'urgency_timer',
      module: 'M1',
      severity: 'SUGGESTIVE',
      confidenceState: 'OBSERVED',
      statuteRef: '',
      explanation: 'Countdown timer on product page',
      elementSelector: '.timer',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 10, navigationId: 'https://shop.com', origin: 'https://shop.com', hostname: 'shop.com', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: false, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://shop.com',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(nonCritFinding, 10);

    // Desktop notification still triggered, but in-page emergency alert is blocked by eligibility policy
    expect(tabsSendMessageMock).toBeNull();
  });

  it('gracefully suppresses in-page emergency alert on internal chrome:// pages', async () => {
    const chromePageFinding: Finding = {
      id: 'crit-chrome',
      ruleId: 'M2-005',
      ruleName: 'credential_theft',
      module: 'M2',
      severity: 'CRITICAL',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Critical event on chrome internal page',
      elementSelector: 'body',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      context: {
        scan: { tabId: 10, navigationId: 'chrome://settings', origin: 'chrome://settings', hostname: 'settings', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: true, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'chrome://settings',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(chromePageFinding, 10);

    expect(tabsSendMessageMock).toBeNull();
  });
});
