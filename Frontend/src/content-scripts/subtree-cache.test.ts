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

  it('redacts sensitive inputs, passwords, and credit card fields from fingerprints', () => {
    // Password input
    const pwd = document.createElement('input');
    pwd.type = 'password';
    pwd.value = 'SuperSecret123!';
    document.body.appendChild(pwd);

    const pwdFp = cache.computeFingerprint(pwd);
    expect(pwdFp).toContain('REDACTED');
    expect(pwdFp).not.toContain('SuperSecret123!');

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.value = 'Confidential private message';
    document.body.appendChild(textarea);

    const txtFp = cache.computeFingerprint(textarea);
    expect(txtFp).toContain('REDACTED');
    expect(txtFp).not.toContain('Confidential');

    // Credit card field
    const ccInput = document.createElement('input');
    ccInput.setAttribute('autocomplete', 'cc-number');
    ccInput.id = 'card-number';
    document.body.appendChild(ccInput);

    const ccFp = cache.computeFingerprint(ccInput);
    expect(ccFp).toContain('REDACTED');

    // ContentEditable container
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.textContent = 'Secret user note';
    document.body.appendChild(editable);

    const editFp = cache.computeFingerprint(editable);
    expect(editFp).toContain('REDACTED');
    expect(editFp).not.toContain('Secret user note');
  });

  it('stores one-way integer hashes rather than raw page text in fingerprints', () => {
    const el = document.createElement('div');
    el.textContent = 'Limited time offer! Sale ends in 5 minutes';
    document.body.appendChild(el);

    const fp = cache.computeFingerprint(el);
    // Fingerprint should contain tag and hash, NOT the literal promotional text
    expect(fp).toContain('DIV');
    expect(fp).not.toContain('Limited time offer');
    expect(fp).not.toContain('Sale ends');
  });
});
