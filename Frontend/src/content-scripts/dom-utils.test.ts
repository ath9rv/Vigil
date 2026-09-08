// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  querySelectorAllDeep,
  querySelectorDeep,
  safeQuerySelectorAllDeep,
  safeQuerySelectorDeep,
  collectButtonsDeep,
  isInsideShadowRoot,
} from './dom-utils';

describe('DOM Utilities — Shadow DOM Piercing', () => {
  beforeEach(() => {
    // Clean up any existing DOM
    document.body.innerHTML = '';
  });

  it('querySelectorAllDeep finds elements in light DOM', () => {
    const div = document.createElement('div');
    div.className = 'test-target';
    document.body.appendChild(div);

    const results = querySelectorAllDeep('.test-target');
    expect(results.length).toBe(1);
    expect(results[0]).toBe(div);
  });

  it('querySelectorAllDeep pierces open shadow roots', () => {
    const host = document.createElement('div');
    host.id = 'shadow-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    inner.className = 'shadow-target';
    shadow.appendChild(inner);

    const results = querySelectorAllDeep('.shadow-target');
    expect(results.length).toBe(1);
    expect(results[0]).toBe(inner);
  });

  it('querySelectorAllDeep finds elements nested in multiple shadow roots', () => {
    const host1 = document.createElement('div');
    host1.id = 'host1';
    document.body.appendChild(host1);

    const shadow1 = host1.attachShadow({ mode: 'open' });
    const host2 = document.createElement('div');
    host2.id = 'host2';
    shadow1.appendChild(host2);

    const shadow2 = host2.attachShadow({ mode: 'open' });
    const deep = document.createElement('p');
    deep.className = 'deep-target';
    shadow2.appendChild(deep);

    const results = querySelectorAllDeep('.deep-target');
    expect(results.length).toBe(1);
    expect(results[0]).toBe(deep);
  });

  it('querySelectorAllDeep does not pierce closed shadow roots', () => {
    const host = document.createElement('div');
    host.id = 'closed-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('span');
    inner.className = 'closed-target';
    shadow.appendChild(inner);

    // Closed shadow roots should NOT be traversable
    const results = querySelectorAllDeep('.closed-target');
    expect(results.length).toBe(0);
  });

  it('querySelectorAllDeep returns empty array for invalid selectors', () => {
    const results = querySelectorAllDeep('::invalid::selector::');
    expect(results).toEqual([]);
  });

  it('querySelectorAllDeep deduplicates elements', () => {
    const div = document.createElement('div');
    div.className = 'dedup-test';
    document.body.appendChild(div);

    // Run twice to ensure no duplication
    const results = querySelectorAllDeep('.dedup-test');
    expect(results.length).toBe(1);
  });

  it('querySelectorDeep returns first match or null', () => {
    const div = document.createElement('div');
    div.className = 'single-target';
    document.body.appendChild(div);

    const found = querySelectorDeep('.single-target');
    expect(found).toBe(div);

    const notFound = querySelectorDeep('.nonexistent');
    expect(notFound).toBeNull();
  });

  it('querySelectorDeep pierces shadow roots', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('button');
    inner.id = 'shadow-button';
    shadow.appendChild(inner);

    const found = querySelectorDeep('#shadow-button');
    expect(found).toBe(inner);
  });

  it('safeQuerySelectorAllDeep returns empty array on error', () => {
    // Should not throw even with an invalid root
    const results = safeQuerySelectorAllDeep(document, '::invalid::');
    expect(results).toEqual([]);
  });

  it('safeQuerySelectorAllDeep returns HTMLElement[] from shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const btn = document.createElement('button');
    btn.className = 'safe-test';
    shadow.appendChild(btn);

    const results = safeQuerySelectorAllDeep(document, '.safe-test');
    expect(results.length).toBe(1);
    expect(results[0]).toBeInstanceOf(HTMLElement);
  });

  it('safeQuerySelectorDeep returns null on error', () => {
    const result = safeQuerySelectorDeep(document, '::invalid::');
    expect(result).toBeNull();
  });

  it('collectButtonsDeep finds buttons in shadow roots', () => {
    const host = document.createElement('div');
    host.className = 'banner';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const btn1 = document.createElement('button');
    btn1.textContent = 'Reject All';
    shadow.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.textContent = 'Accept All';
    shadow.appendChild(btn2);

    const buttons = collectButtonsDeep(host);
    expect(buttons.length).toBe(2);
    expect(buttons.some((b) => b.textContent?.includes('Reject'))).toBe(true);
    expect(buttons.some((b) => b.textContent?.includes('Accept'))).toBe(true);
  });

  it('isInsideShadowRoot detects elements inside shadow roots', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);

    expect(isInsideShadowRoot(inner)).toBe(true);
  });

  it('isInsideShadowRoot returns false for light DOM elements', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(isInsideShadowRoot(div)).toBe(false);
  });
});
