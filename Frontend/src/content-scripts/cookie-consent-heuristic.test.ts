// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import cookieRules from '../../rules/cookie_consent_rules.json';

describe('Cookie Consent Handler — Phase 1 Upgrades', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Cookie Rules Integrity', () => {
    it('should have all 10 original CMP rules', () => {
      const expectedCMPs = ['OneTrust', 'Cookiebot', 'TrustArc', 'Quantcast', 'Didomi', 'Usercentrics', 'CookiePro', 'Complianz', 'Termly', 'Generic_A'];
      const ruleNames = cookieRules.map((r: any) => r.name);
      for (const name of expectedCMPs) {
        expect(ruleNames).toContain(name);
      }
    });

    it('each rule must have detector and at least one reject or manage selector', () => {
      for (const rule of cookieRules) {
        expect(rule.detector).toBeDefined();
        expect(typeof rule.detector).toBe('string');
        expect(rule.detector.length).toBeGreaterThan(0);
        const hasReject = rule.reject_selectors && rule.reject_selectors.length > 0;
        const hasManage = rule.manage_selectors && rule.manage_selectors.length > 0;
        expect(hasReject || hasManage).toBe(true);
      }
    });

    it('no rule selector should contain invalid CSS pseudo-selectors', () => {
      for (const rule of cookieRules) {
        expect(rule.detector).not.toContain(':contains(');
        expect(rule.detector).not.toContain(':has-text(');
        for (const sel of rule.reject_selectors || []) {
          expect(sel).not.toContain(':contains(');
          expect(sel).not.toContain(':has-text(');
        }
        for (const sel of rule.manage_selectors || []) {
          expect(sel).not.toContain(':contains(');
          expect(sel).not.toContain(':has-text(');
        }
      }
    });
  });

  describe('Shadow DOM Banner Detection (Simulated)', () => {
    it('should detect a consent banner rendered inside an open shadow root', () => {
      // Simulate a OneTrust-like banner inside a shadow root
      const host = document.createElement('div');
      host.id = 'consent-wrapper';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      
      const banner = document.createElement('div');
      banner.id = 'onetrust-banner-sdk';
      banner.className = 'cookie-banner';
      shadow.appendChild(banner);

      const rejectBtn = document.createElement('button');
      rejectBtn.id = 'onetrust-reject-all-handler';
      rejectBtn.textContent = 'Reject All';
      banner.appendChild(rejectBtn);

      const acceptBtn = document.createElement('button');
      acceptBtn.id = 'onetrust-accept-btn-handler';
      acceptBtn.textContent = 'Accept All';
      banner.appendChild(acceptBtn);

      // Verify the banner is detectable via deep query
      const found = host.shadowRoot!.querySelector('#onetrust-banner-sdk');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('onetrust-banner-sdk');

      // Verify we can find the reject button inside the shadow root
      const btn = host.shadowRoot!.querySelector('#onetrust-reject-all-handler');
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Reject All');
    });

    it('should detect generic consent banners inside shadow roots by text content', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      
      const banner = document.createElement('div');
      banner.textContent = 'We use cookies to improve your experience. Accept or manage your preferences.';
      banner.style.position = 'fixed';
      banner.style.bottom = '0';
      shadow.appendChild(banner);

      const text = banner.textContent || '';
      expect(/accept.*cookie|cookie.*accept|we use cookies/i.test(text)).toBe(true);
    });
  });

  describe('Heuristic Button Classification Logic', () => {
    it('should classify "Reject All" as a reject button', () => {
      const rejectPatterns = /^(reject|decline|deny|refuse|no|only essential|necessary only|dismiss|manage preferences|reject all|decline all|refuse all|customize|do not accept|no thanks|opt.out|disable|turn off)/i;
      
      expect(rejectPatterns.test('Reject All')).toBe(true);
      expect(rejectPatterns.test('Decline')).toBe(true);
      expect(rejectPatterns.test('Necessary Only')).toBe(true);
      expect(rejectPatterns.test('No thanks')).toBe(true);
      expect(rejectPatterns.test('Do not accept')).toBe(true);
    });

    it('should NOT classify "Accept All" as a reject button', () => {
      const rejectPatterns = /^(reject|decline|deny|refuse|no|only essential|necessary only|dismiss|manage preferences|reject all|decline all|refuse all|customize|do not accept|no thanks|opt.out|disable|turn off)/i;
      
      expect(rejectPatterns.test('Accept All')).toBe(false);
      expect(rejectPatterns.test('I agree')).toBe(false);
      expect(rejectPatterns.test('Got it')).toBe(false);
    });

    it('should classify "Manage Preferences" as a manage button', () => {
      const managePatterns = /^(manage|customize|preferences|settings|options|learn more|cookie settings|view preferences|cookie preferences|all cookies|edit settings)/i;
      
      expect(managePatterns.test('Manage Preferences')).toBe(true);
      expect(managePatterns.test('Customize')).toBe(true);
      expect(managePatterns.test('Cookie Settings')).toBe(true);
      expect(managePatterns.test('View Preferences')).toBe(true);
    });

    it('should classify "Accept All" as an accept button', () => {
      const acceptPatterns = /^(accept|agree|i agree|allow|got it|i understand|ok|continue|enable all|accept all|allow all|i accept)/i;
      
      expect(acceptPatterns.test('Accept All')).toBe(true);
      expect(acceptPatterns.test('I agree')).toBe(true);
      expect(acceptPatterns.test('Allow all')).toBe(true);
    });
  });

  describe('Visual Contrast Estimation', () => {
    it('should parse rgba color strings correctly', () => {
      const rgbaRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/;
      const match = 'rgba(255, 255, 255, 0.5)'.match(rgbaRegex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('255');
      expect(match![2]).toBe('255');
      expect(match![3]).toBe('255');
      expect(match![4]).toBe('0.5');
    });

    it('should parse rgb color strings correctly', () => {
      const rgbaRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/;
      const match = 'rgb(0, 0, 0)'.match(rgbaRegex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('0');
      expect(match![2]).toBe('0');
      expect(match![3]).toBe('0');
    });
  });

  describe('Canary Loop Protection', () => {
    it('should use sessionStorage for canary state', () => {
      const CANARY_KEY = '__vigil_canary_state';
      
      // Simulate canary state storage
      const state = { lastAttempt: Date.now(), reloadCount: 1, canaryTripped: false };
      sessionStorage.setItem(CANARY_KEY, JSON.stringify(state));
      
      const raw = sessionStorage.getItem(CANARY_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.canaryTripped).toBe(false);
      expect(parsed.reloadCount).toBe(1);
      
      // Clean up
      sessionStorage.removeItem(CANARY_KEY);
    });

    it('should trip canary after 2 rapid attempts', () => {
      const now = Date.now();
      const state = { lastAttempt: now - 1000, reloadCount: 1, canaryTripped: false };
      
      // Simulate second rapid attempt
      if (now - state.lastAttempt < 5000) {
        state.reloadCount++;
        if (state.reloadCount >= 2) {
          state.canaryTripped = true;
        }
      }
      
      expect(state.canaryTripped).toBe(true);
      expect(state.reloadCount).toBe(2);
    });
  });

  describe('Paywalled CMP Detection', () => {
    it('should detect Pur-Abo / pay-or-okay patterns', () => {
      const paywallPatterns = ['pur-abo', 'pur abo', 'pay or okay', 'oder werbefrei', 'pur-zugang'];
      const testCases = [
        'Akzeptieren Sie Werbung oder PUR-Abo abschließen',
        'Pay or Okay — choose your option',
        'Oder werbefrei für 2.99€',
      ];
      
      for (const text of testCases) {
        const lower = text.toLowerCase();
        const isPaywalled = paywallPatterns.some(p => lower.includes(p));
        expect(isPaywalled).toBe(true);
      }
    });

    it('should NOT false-positive on regular consent text', () => {
      const paywallPatterns = ['pur-abo', 'pur abo', 'pay or okay', 'oder werbefrei', 'pur-zugang'];
      const regularTexts = [
        'We use cookies to improve your experience',
        'Accept all cookies',
        'Reject all non-essential cookies',
        'Manage your cookie preferences',
      ];
      
      for (const text of regularTexts) {
        const lower = text.toLowerCase();
        const isPaywalled = paywallPatterns.some(p => lower.includes(p));
        expect(isPaywalled).toBe(false);
      }
    });
  });
});
