// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterventionTransaction } from './transaction';
import { blastRadiusEstimator } from './blast-radius';

describe('Vigil Phase 4: Adversarial Intervention Test Laboratory', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('A. Mutation during verification: catches dimension collapse and aborts', () => {
    const el = document.createElement('div');
    el.id = 'banner';
    el.style.width = '200px';
    el.style.height = '50px';
    document.body.appendChild(el);

    // Mock bounding box before mutation
    let currentHeight = 50;
    vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      width: 200,
      height: currentHeight,
      top: 0,
      left: 0,
      right: 200,
      bottom: currentHeight,
      toJSON: () => {},
    }));

    const transaction = new InterventionTransaction({
      element: el,
      ruleId: 'M1-TEST',
      navigationId: 'nav-test',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: {
        styles: { opacity: '0.3' },
        attributes: { 'data-neutralized': 'true' },
      },
    });

    transaction.snapshot();
    transaction.apply();

    // Adversarial event: page script immediately collapses element height to 0
    currentHeight = 0;

    const check = transaction.verify();
    expect(check.result).toBe('FAIL');
    expect(transaction.record.state).toBe('ROLLED_BACK');
  });

  it('B. Node replacement: transitions to ABORTED_STALE and leaves replacement untouched', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const oldEl = document.createElement('div');
    oldEl.id = 'old-widget';
    oldEl.textContent = 'Old Urgency Timer';
    container.appendChild(oldEl);

    const transaction = new InterventionTransaction({
      element: oldEl,
      ruleId: 'M1-TEST',
      navigationId: 'nav-test',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: {
        styles: { opacity: '0.3' },
        attributes: { 'data-neutralized': 'true' },
      },
    });

    transaction.snapshot();

    // React/Vue replacement event: unmounts oldEl and mounts replacement
    container.removeChild(oldEl);
    const newEl = document.createElement('div');
    newEl.id = 'new-widget';
    newEl.textContent = 'Replacement Component';
    container.appendChild(newEl);

    // Verify staleness
    const isStale = transaction.checkStaleness();
    expect(isStale).toBe(true);
    expect(transaction.record.state).toBe('ABORTED_STALE');

    // Attempting rollback must not touch the new node
    transaction.rollback('Stale test');
    expect(newEl.hasAttribute('data-neutralized')).toBe(false);
    expect(newEl.style.opacity).toBe('');
  });

  it('C. Navigation during transaction: aborts as ABORTED_STALE', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const transaction = new InterventionTransaction({
      element: el,
      ruleId: 'M1-TEST',
      navigationId: 'nav-route-1',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: { styles: { opacity: '0.3' }, attributes: {} },
    });

    transaction.snapshot();

    // SPA navigation event occurs, advancing current navigation to nav-route-2
    const isStale = transaction.checkStaleness('nav-route-2');
    expect(isStale).toBe(true);
    expect(transaction.record.state).toBe('ABORTED_STALE');
    expect(transaction.record.staleReason).toContain('Navigation drift detected');
  });

  it('D. Origin drift: aborts as ABORTED_STALE', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const transaction = new InterventionTransaction({
      element: el,
      ruleId: 'M1-TEST',
      navigationId: 'nav-test',
      origin: 'https://site-a.com',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: { styles: {}, attributes: {} },
    });

    const isStale = transaction.checkStaleness(undefined, 'https://site-b.com');
    expect(isStale).toBe(true);
    expect(transaction.record.state).toBe('ABORTED_STALE');
    expect(transaction.record.staleReason).toContain('Origin drift detected');
  });

  it('E. Expiration: transitions to ABORTED_STALE after 5 seconds', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.appendChild(el);

    const transaction = new InterventionTransaction({
      element: el,
      ruleId: 'M1-TEST',
      navigationId: 'nav-test',
      safetyClass: 'SAFE',
      compatibilityLevel: 1,
      detectionConfidence: 'HIGH',
      plan: { styles: {}, attributes: {} },
    });

    // Advance clock by 5001ms
    vi.advanceTimersByTime(5001);

    const isStale = transaction.checkStaleness();
    expect(isStale).toBe(true);
    expect(transaction.record.state).toBe('ABORTED_STALE');
    expect(transaction.record.staleReason).toContain('5-second lifetime limit');
  });

  it('F. Keyword isolation: blog post containing "checkout" or "payment" is NOT classified as BLOCKED', () => {
    const article = document.createElement('article');
    article.className = 'blog-post';
    article.innerHTML = `
      <h1>How our checkout and payment architecture works</h1>
      <p>In this guide, we discuss cart mechanics and subscribe flows.</p>
      <div class="read-timer">Estimated read time: 5 minutes</div>
    `;
    document.body.appendChild(article);

    const readTimer = article.querySelector('.read-timer')!;
    const assessment = blastRadiusEstimator.assess(readTimer);

    // Must NOT be classified as BLOCKED merely because parent text/class contains checkout/payment
    expect(assessment.safetyClass).not.toBe('BLOCKED');
    expect(assessment.hasPaymentOrAuth).toBe(false);
  });
});
