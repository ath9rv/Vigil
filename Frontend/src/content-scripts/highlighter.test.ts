// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findTargetElement,
  showTemporaryBeacon,
  locateTarget,
  clearHighlights,
  highlightFinding
} from './highlighter';
import type { Finding } from '../shared/types';

describe('Vigil Highlighter & In-Page Beacon Locator Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    clearHighlights();
  });

  afterEach(() => {
    clearHighlights();
    vi.useRealTimers();
  });

  it('locates elements by exact CSS selector', () => {
    document.body.innerHTML = `
      <div id="main">
        <form id="login-form" class="auth-box">
          <input type="password" id="pwd" />
        </form>
      </div>
    `;

    const match = findTargetElement('#login-form');
    expect(match).not.toBeNull();
    expect(match?.element.id).toBe('login-form');
    expect(match?.method).toBe('exact_selector');
  });

  it('falls back to text search if selector is missing or not found', () => {
    document.body.innerHTML = `
      <div>
        <p class="legal-clause">Users agree to binding arbitration and waive class action lawsuits.</p>
      </div>
    `;

    const match = findTargetElement('#missing-selector', 'binding arbitration and waive class action');
    expect(match).not.toBeNull();
    expect(match?.element.textContent).toContain('binding arbitration');
    expect(match?.method).toBe('exact_text');
  });

  it('falls back to word overlap for slightly modified text', () => {
    document.body.innerHTML = `
      <div>
        <div class="terms">This subscription renews automatically every month unless cancelled forty-eight hours prior.</div>
      </div>
    `;

    const match = findTargetElement(undefined, 'subscription renews automatically unless cancelled');
    expect(match).not.toBeNull();
    expect(match?.element.textContent).toContain('subscription renews');
    expect(match?.method).toBe('word_overlap');
  });

  it('scrolls matched element into view and creates temporary beacon overlay', () => {
    document.body.innerHTML = `
      <div id="target" style="width: 100px; height: 50px;">Target Element</div>
    `;
    const target = document.getElementById('target') as HTMLElement;
    target.scrollIntoView = vi.fn();
    target.focus = vi.fn();

    const overlay = showTemporaryBeacon(target, 'Fake Urgency Countdown', 'HIGH');

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('data-vigil-overlay')).toBe('true');
    expect(overlay.textContent).toContain('Fake Urgency Countdown');
    expect(document.body.contains(overlay)).toBe(true);
  });

  it('automatically fades and removes the beacon after 4 seconds', () => {
    document.body.innerHTML = `
      <div id="target">Content</div>
    `;
    const target = document.getElementById('target') as HTMLElement;
    target.scrollIntoView = vi.fn();

    const overlay = showTemporaryBeacon(target, 'Test Rule');
    expect(document.body.contains(overlay)).toBe(true);

    // Fast-forward 4000ms: opacity transition starts
    vi.advanceTimersByTime(4000);
    expect(overlay.style.opacity).toBe('0');

    // Fast-forward another 1200ms: element removed from DOM
    vi.advanceTimersByTime(1200);
    expect(document.body.contains(overlay)).toBe(false);
  });

  it('clears previous overlay when a new locateTarget is triggered', () => {
    document.body.innerHTML = `
      <div id="first">First</div>
      <div id="second">Second</div>
    `;
    const first = document.getElementById('first') as HTMLElement;
    const second = document.getElementById('second') as HTMLElement;
    first.scrollIntoView = vi.fn();
    second.scrollIntoView = vi.fn();

    locateTarget({ selector: '#first', ruleName: 'First Rule' });
    const overlaysBefore = document.querySelectorAll('[data-vigil-overlay]');
    expect(overlaysBefore.length).toBe(1);

    locateTarget({ selector: '#second', ruleName: 'Second Rule' });
    const overlaysAfter = document.querySelectorAll('[data-vigil-overlay]');
    expect(overlaysAfter.length).toBe(1);
    expect(overlaysAfter[0].textContent).toContain('Second Rule');
  });

  it('highlightFinding locates and highlights using finding metadata', () => {
    document.body.innerHTML = `
      <div id="countdown" class="urgent-box">Offer expires in 04:59</div>
    `;
    const cd = document.getElementById('countdown') as HTMLElement;
    cd.scrollIntoView = vi.fn();

    const finding: Finding = {
      id: 'f-1',
      ruleId: 'M1-001',
      ruleName: 'fake_urgency',
      module: 'M1',
      severity: 'CONFIRMED',
      confidenceState: 'CONFIRMED',
      statuteRef: '',
      explanation: 'Offer expires in 04:59',
      elementSelector: '#countdown',
      elementRect: { top: 10, left: 10, width: 100, height: 30 },
      context: {
        scan: { tabId: 1, navigationId: 'https://shop.com', origin: 'https://shop.com', hostname: 'shop.com', startedAt: Date.now() },
        evidence: [],
        coverage: { dom: true, threatIntel: false, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
      },
      pageUrl: 'https://shop.com',
      detectedAt: new Date().toISOString()
    };

    highlightFinding(finding);
    const overlay = document.querySelector('[data-vigil-overlay]');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('fake_urgency');
  });
});
