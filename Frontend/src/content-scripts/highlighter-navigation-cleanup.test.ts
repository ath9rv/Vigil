// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  locateTarget,
  findTargetElement,
  clearHighlights,
  showTemporaryBeacon,
  BEACON_CONTAINER_ID
} from './highlighter';

describe('Vigil Highlighter Lifecycle, Navigation Cleanup & Deterministic Container', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    clearHighlights();
  });

  afterEach(() => {
    clearHighlights();
    vi.useRealTimers();
  });

  it('locate A -> locate B cleanly replaces A beacon with B beacon without accumulating state', () => {
    document.body.innerHTML = `
      <div id="target-a">Evidence A</div>
      <div id="target-b">Evidence B</div>
    `;

    const elA = document.getElementById('target-a') as HTMLElement;
    const elB = document.getElementById('target-b') as HTMLElement;
    elA.scrollIntoView = vi.fn();
    elB.scrollIntoView = vi.fn();

    const resA = locateTarget({ selector: '#target-a', ruleName: 'Rule A' });
    expect(resA.success).toBe(true);
    expect(resA.method).toBe('exact_selector');

    const containersA = document.querySelectorAll(`#${BEACON_CONTAINER_ID}`);
    expect(containersA.length).toBe(1);
    expect(containersA[0].textContent).toContain('Rule A');

    // Trigger second location
    const resB = locateTarget({ selector: '#target-b', ruleName: 'Rule B' });
    expect(resB.success).toBe(true);
    expect(resB.method).toBe('exact_selector');

    const containersB = document.querySelectorAll(`#${BEACON_CONTAINER_ID}`);
    expect(containersB.length).toBe(1);
    expect(containersB[0].textContent).toContain('Rule B');
    expect(containersB[0].textContent).not.toContain('Rule A');
  });

  it('navigation events (popstate, beforeunload, hashchange) completely clear beacon and leave zero residual DOM state', () => {
    document.body.innerHTML = `<div id="target">Sensitive Clause</div>`;
    const target = document.getElementById('target') as HTMLElement;
    target.scrollIntoView = vi.fn();

    locateTarget({ selector: '#target', ruleName: 'Arbitration' });
    expect(document.getElementById(BEACON_CONTAINER_ID)).not.toBeNull();

    // Fire popstate navigation event
    window.dispatchEvent(new Event('popstate'));
    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();

    // Re-trigger and fire beforeunload
    locateTarget({ selector: '#target', ruleName: 'Arbitration' });
    expect(document.getElementById(BEACON_CONTAINER_ID)).not.toBeNull();
    window.dispatchEvent(new Event('beforeunload'));
    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();

    // Re-trigger and fire hashchange
    locateTarget({ selector: '#target', ruleName: 'Arbitration' });
    expect(document.getElementById(BEACON_CONTAINER_ID)).not.toBeNull();
    window.dispatchEvent(new Event('hashchange'));
    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();
  });

  it('missing selector and missing text returns false without throwing exceptions or mounting beacons', () => {
    document.body.innerHTML = `<div>Normal Page</div>`;

    const result = locateTarget({});
    expect(result.success).toBe(false);
    expect(result.matchedElement).toBeUndefined();
    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();

    const emptyResult = locateTarget({ selector: '#non-existent-id', text: '' });
    expect(emptyResult.success).toBe(false);
    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();
  });

  it('records correct method and confidence for exact selector, exact text, and word overlap', () => {
    document.body.innerHTML = `
      <div id="exact-box">Exact Element</div>
      <p class="arbitration-clause">Users expressly waive any right to participate in a class action lawsuit.</p>
      <section class="cancellation-policy">
        Subscriptions will renew automatically each billing cycle unless cancelled forty-eight hours prior.
      </section>
    `;

    // 1. Exact selector
    const match1 = findTargetElement('#exact-box');
    expect(match1).not.toBeNull();
    expect(match1?.method).toBe('exact_selector');
    expect(match1?.confidence).toBe('HIGH');

    // 2. Exact text match
    const match2 = findTargetElement(undefined, 'expressly waive any right to participate in a class action');
    expect(match2).not.toBeNull();
    expect(match2?.method).toBe('exact_text');
    expect(match2?.confidence).toBe('HIGH');

    // 3. Bounded word overlap match (selector missing, text slightly rephrased)
    const match3 = findTargetElement('#missing-id', 'subscriptions renew automatically unless cancelled');
    expect(match3).not.toBeNull();
    expect(match3?.method).toBe('word_overlap');
    expect(match3?.confidence).toBe('MEDIUM');
  });

  it('beacon has pointer-events: none, aria-hidden: true, and auto-cleans up after 4s', () => {
    document.body.innerHTML = `<div id="target">Content</div>`;
    const target = document.getElementById('target') as HTMLElement;
    target.scrollIntoView = vi.fn();

    showTemporaryBeacon(target, 'Test Rule');

    const container = document.getElementById(BEACON_CONTAINER_ID);
    expect(container).not.toBeNull();
    expect(container?.getAttribute('aria-hidden')).toBe('true');
    expect(container?.style.pointerEvents).toBe('none');

    // Advance 4000ms: fade starts
    vi.advanceTimersByTime(4000);
    // Advance 1200ms: container completely removed from DOM
    vi.advanceTimersByTime(1200);

    expect(document.getElementById(BEACON_CONTAINER_ID)).toBeNull();
    expect(document.body.innerHTML).toBe('<div id="target">Content</div>');
  });
});
