// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { SubtreeCache } from './subtree-cache';

describe('Vigil Phase 2: SubtreeCache & Incremental DOM Scanning', () => {
  let cache: SubtreeCache;

  beforeEach(() => {
    document.body.innerHTML = '';
    cache = SubtreeCache.getInstance();
  });

  it('computes stable structural fingerprints for elements', () => {
    const el = document.createElement('div');
    el.id = 'cart-container';
    el.className = 'cart checkout';
    el.textContent = 'Price: $10';
    document.body.appendChild(el);

    const fp1 = cache.computeFingerprint(el);
    const fp2 = cache.computeFingerprint(el);

    expect(fp1).toBe(fp2);
    expect(fp1).toContain('DIV');
    expect(fp1).toContain('cart-container');
  });

  it('skips re-analysis when structural fingerprint is unchanged', () => {
    const el = document.createElement('div');
    el.className = 'static-banner';
    el.textContent = 'Welcome to our store';
    document.body.appendChild(el);

    // Initial check: must analyze
    expect(cache.shouldAnalyze(el, 'detector-m1')).toBe(true);

    // Mark analyzed
    cache.markAnalyzed(el, 'detector-m1');

    // Immediate second check: skip analysis
    expect(cache.shouldAnalyze(el, 'detector-m1')).toBe(false);
  });

  it('triggers re-analysis when content or child nodes mutate', () => {
    const container = document.createElement('div');
    container.className = 'timer-box';
    container.textContent = '05:00';
    document.body.appendChild(container);

    cache.markAnalyzed(container, 'urgency-detector');
    expect(cache.shouldAnalyze(container, 'urgency-detector')).toBe(false);

    // Mutate text content
    container.textContent = '04:59';

    // Must re-analyze because structural fingerprint changed
    expect(cache.shouldAnalyze(container, 'urgency-detector')).toBe(true);
  });
});
