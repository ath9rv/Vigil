import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleFastLaneAlert } from './fast-lane';
import { Finding } from '../shared/types';

describe('Background Worker Fast-Lane Emergency Alert Engine', () => {
  let storageMock: Record<string, any> = {};
  let notificationMock: any = null;
  let badgeTextMock: any = null;
  let badgeColorMock: any = null;

  beforeEach(() => {
    storageMock = {};
    notificationMock = null;
    badgeTextMock = null;
    badgeColorMock = null;

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
      severity: 'severe',
      confidenceState: 'confirmed',
      statuteRef: '',
      explanation: 'Lookalike domain mimicking banking portal',
      elementSelector: 'body',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      pageUrl: 'https://paypa1.com/login',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 42);

    expect(notificationMock).toBeDefined();
    expect(notificationMock.priority).toBe(2);
    expect(notificationMock.title).toContain('Vigil Security Alert');
    expect(notificationMock.message).toContain('paypa1.com');
  });

  it('updates extension action badge with red exclamation mark on affected tab', async () => {
    const fakeFinding: Finding = {
      id: 'crit-02',
      ruleId: 'M2-005',
      ruleName: 'form_action_mismatch',
      module: 'M2',
      severity: 'severe',
      confidenceState: 'confirmed',
      statuteRef: '',
      explanation: 'Credential exfiltration detected',
      elementSelector: 'form',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
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
      severity: 'severe',
      confidenceState: 'confirmed',
      statuteRef: '',
      explanation: 'Phishing clone page',
      elementSelector: 'form',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      pageUrl: 'https://arnazon.in/signin',
      detectedAt: new Date().toISOString()
    };

    await handleFastLaneAlert(fakeFinding, 7);

    expect(storageMock.fast_lane_alerts).toBeDefined();
    expect(storageMock.fast_lane_alerts.length).toBe(1);
    expect(storageMock.fast_lane_alerts[0].domain).toBe('arnazon.in');
  });
});
