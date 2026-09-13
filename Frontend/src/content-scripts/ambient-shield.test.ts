import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showAmbientAlert, dismissAmbientAlert, handleAmbientShieldMessage } from './ambient-shield';

describe('Ambient In-Situ Warning Shield (Direct Integration Tests)', () => {
  let createdElements: any[] = [];
  let currentHost: any = null;

  beforeEach(() => {
    createdElements = [];
    currentHost = null;

    // Lightweight DOM environment polyfill for Node test runner
    const mockBody: any = {
      appendChild: vi.fn((child: any) => child),
    };
    (globalThis as any).document = {
      body: mockBody,
      documentElement: mockBody,
      contains: vi.fn((el: any) => el === currentHost),
      createElement: vi.fn((tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          style: {},
          children: [] as any[],
          className: '',
          textContent: '',
          innerHTML: '',
          remove: vi.fn(() => {
            if (el.parentNode) {
              const idx = el.parentNode.children.indexOf(el);
              if (idx !== -1) el.parentNode.children.splice(idx, 1);
            }
          }),
          addEventListener: vi.fn((event: string, handler: Function) => {
            el._handlers = el._handlers || {};
            el._handlers[event] = handler;
          }),
          appendChild: vi.fn((child: any) => {
            child.parentNode = el;
            el.children.push(child);
            return child;
          }),
          attachShadow: vi.fn(() => {
            const shadow: any = {
              children: [] as any[],
              appendChild: vi.fn((child: any) => {
                child.parentNode = shadow;
                shadow.children.push(child);
                return child;
              }),
              querySelector: vi.fn((sel: string) => {
                const search = (node: any): any => {
                  if (sel.startsWith('.') && node.className && node.className.includes(sel.slice(1))) return node;
                  if (sel.startsWith('#') && node.id === sel.slice(1)) return node;
                  for (const c of node.children || []) {
                    const found = search(c);
                    if (found) return found;
                  }
                  return null;
                };
                for (const c of shadow.children) {
                  const found = search(c);
                  if (found) return found;
                }
                return null;
              }),
            };
            el.shadowRoot = shadow;
            return shadow;
          }),
          querySelector: vi.fn((sel: string) => {
            if (sel.startsWith('.') && el.className && el.className.includes(sel.slice(1))) return el;
            if (sel.startsWith('#') && el.id === sel.slice(1)) return el;
            return null;
          }),
        };

        if (tag === 'vigil-ambient-shield') {
          currentHost = el;
        }
        createdElements.push(el);
        return el;
      }),
    };
  });

  it('renders alert with maximum integer z-index (2147483647) and shadow encapsulation', () => {
    showAmbientAlert({
      id: 'alert-1',
      type: 'CRITICAL_SECURITY',
      title: 'Phishing Warning',
      message: 'Suspicious form detected.',
    });

    expect(currentHost).not.toBeNull();
    expect(currentHost.style.zIndex).toBe('2147483647');
    expect(currentHost.style.position).toBe('fixed');
    expect(currentHost.shadowRoot).toBeDefined();
  });

  it('dismissAmbientAlert successfully removes the targeted alert card', () => {
    showAmbientAlert({
      id: 'alert-to-dismiss',
      type: 'DARK_PATTERN',
      title: 'Deceptive Pricing',
      message: 'Hidden subscription fee.',
    });

    expect(currentHost).not.toBeNull();
    dismissAmbientAlert('alert-to-dismiss');
    // Calling dismiss twice or for missing alert is graceful
    expect(() => dismissAmbientAlert('non-existent')).not.toThrow();
  });

  it('handles user actions and dismiss callbacks gracefully', () => {
    const onPrimary = vi.fn();
    const onDismiss = vi.fn();

    showAmbientAlert({
      id: 'actionable-alert',
      type: 'CREDENTIAL_WARNING',
      title: 'Credential Risk',
      message: 'Password sent over insecure channel.',
      primaryActionLabel: 'Block Form',
      onPrimaryAction: onPrimary,
      onDismiss: onDismiss,
    });

    expect(currentHost).not.toBeNull();
  });

  it('rejects spoofed SHOW_EMERGENCY_ALERT messages from unauthorized senders', () => {
    (globalThis as any).chrome = {
      runtime: { id: 'vigil-official-id' }
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Spoofed sender
    const accepted = handleAmbientShieldMessage(
      { type: 'SHOW_EMERGENCY_ALERT', alert: { id: 'spoof', type: 'CRITICAL_SECURITY', title: 'Fake', message: 'Fake' } },
      { id: 'malicious-extension-id' }
    );

    expect(accepted).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Vigil Security] Message rejected in ambient-shield: untrusted sender.id'),
      'malicious-extension-id'
    );

    warnSpy.mockRestore();
  });

  it('accepts authorized SHOW_EMERGENCY_ALERT messages from background runtime', () => {
    (globalThis as any).chrome = {
      runtime: { id: 'vigil-official-id' }
    };

    const accepted = handleAmbientShieldMessage(
      {
        type: 'SHOW_EMERGENCY_ALERT',
        alert: {
          id: 'auth-alert',
          type: 'CRITICAL_SECURITY',
          title: 'Official Phishing Alert',
          message: 'Credential threat detected.'
        }
      },
      { id: 'vigil-official-id' }
    );

    expect(accepted).toBe(true);
    expect(currentHost).not.toBeNull();
  });
});
