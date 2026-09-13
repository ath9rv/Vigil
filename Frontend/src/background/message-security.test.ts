import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerMessageHandlers } from './message-router';
import { navigationState } from './navigation-state';

describe('Message Router Trust-Boundary Security Verification', () => {
  let messageListener: Function | null = null;

  beforeEach(() => {
    messageListener = null;
    navigationState.reset();

    (globalThis as any).chrome = {
      runtime: {
        id: 'vigil-extension-id',
        onMessage: {
          addListener: vi.fn((listener: Function) => {
            messageListener = listener;
          }),
        },
      },
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => {}),
        },
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
    };

    registerMessageHandlers();
  });

  it('rejects messages from untrusted sender IDs (external extension / app)', async () => {
    expect(messageListener).not.toBeNull();

    const sendResponse = vi.fn();
    const maliciousSender = {
      id: 'malicious-extension-id',
    };

    const isAsync = messageListener!({ type: 'SCAN_COMPLETE' }, maliciousSender, sendResponse);

    expect(isAsync).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Unauthorized: untrusted sender ID'),
      })
    );
  });

  it('blocks cross-tab message spoofing (reported tabId != sender.tab.id)', async () => {
    expect(messageListener).not.toBeNull();

    const sendResponse = vi.fn();
    const sender = {
      id: 'vigil-extension-id',
      tab: { id: 10 },
      url: 'https://bank.com',
    };

    const spoofedMessage = {
      type: 'SCAN_COMPLETE',
      findings: [],
      context: {
        tabId: 99, // Reporting tab 99 while coming from tab 10
        hostname: 'bank.com',
        navigationId: 'nav-1',
        origin: 'https://bank.com',
        startedAt: Date.now(),
      },
    };

    const isAsync = messageListener!(spoofedMessage, sender, sendResponse);

    expect(isAsync).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('tabId spoofing detected'),
      })
    );
  });

  it('blocks cross-origin message spoofing (reported hostname != sender.url host)', async () => {
    expect(messageListener).not.toBeNull();

    const sendResponse = vi.fn();
    const sender = {
      id: 'vigil-extension-id',
      tab: { id: 5 },
      url: 'https://evil-attacker.com/exploit',
    };

    const spoofedMessage = {
      type: 'SCAN_COMPLETE',
      findings: [],
      context: {
        tabId: 5,
        hostname: 'legitimate-bank.com', // Spoofing legitimate hostname
        navigationId: 'nav-bank',
        origin: 'https://legitimate-bank.com',
        startedAt: Date.now(),
      },
    };

    const isAsync = messageListener!(spoofedMessage, sender, sendResponse);

    expect(isAsync).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('origin spoofing detected'),
      })
    );
  });

  it('drops stale messages arriving from terminated or superseded navigations', async () => {
    expect(messageListener).not.toBeNull();

    // Start navigation A, then supersede with navigation B
    navigationState.startNavigation(1, 'nav-A');
    navigationState.startNavigation(1, 'nav-B');

    const sendResponse = vi.fn();
    const sender = {
      id: 'vigil-extension-id',
      tab: { id: 1 },
      url: 'https://site.com',
    };

    const staleMessage = {
      type: 'VIGIL_COOKIE_ACTION',
      action: 'REJECT_ALL',
      cmp: 'OneTrust',
      context: {
        tabId: 1,
        hostname: 'site.com',
        navigationId: 'nav-A', // Stale navigation!
        origin: 'https://site.com',
        startedAt: Date.now() - 5000,
      },
    };

    const isAsync = messageListener!(staleMessage, sender, sendResponse);

    expect(isAsync).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        dropped: true,
        reason: 'stale_navigation',
      })
    );
  });

  it('handles malformed context URLs without throwing uncaught exceptions', async () => {
    expect(messageListener).not.toBeNull();

    const sendResponse = vi.fn();
    const sender = {
      id: 'vigil-extension-id',
      tab: { id: 2 },
      url: 'invalid-url-scheme',
    };

    const message = {
      type: 'GET_STORAGE_DATA',
      key: 'enabled',
    };

    expect(() => {
      messageListener!(message, sender, sendResponse);
    }).not.toThrow();
  });
});
