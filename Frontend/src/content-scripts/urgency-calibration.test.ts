// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateTimerElement, scanAndNeutralize, restoreAllUrgencyNeutralizations } from './urgency-neutralizer';
import { interventionManager } from '../intervention/manager';

describe('Vigil Phase 1: Multi-Signal Urgency Calibration & False-Positive Elimination', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
  });

  // ─── Negative Control 1: Banking Session Expiry ───────────────────────────
  it('excludes banking/security session timeouts from intervention', () => {
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'session-warning';
    sessionDiv.textContent = 'For your security, your session will expire in 04:59';
    document.body.appendChild(sessionDiv);

    const state = evaluateTimerElement(sessionDiv);
    expect(state).toBe('OBSERVED'); // Stays benign OBSERVED, never escalates to MANUFACTURED_URGENCY

    scanAndNeutralize();
    expect(sessionDiv.hasAttribute('data-vigil-neutralized')).toBe(false);
  });

  // ─── Negative Control 2: Server-Synchronized Ticket Hold ─────────────────
  it('excludes server-synchronized ticketing timers with data-server-time', () => {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'ticket-hold-timer';
    ticketDiv.setAttribute('data-server-time', '2026-09-08T12:00:00Z');
    ticketDiv.setAttribute('data-expires-at', '1700003600');
    ticketDiv.textContent = 'Seats held for 09:45';
    document.body.appendChild(ticketDiv);

    const state = evaluateTimerElement(ticketDiv);
    expect(state).toBe('OBSERVED');

    scanAndNeutralize();
    expect(ticketDiv.hasAttribute('data-vigil-neutralized')).toBe(false);
  });

  // ─── Negative Control 3: Live Auction Timer ──────────────────────────────
  it('excludes live auction countdowns with data-auction-end', () => {
    const auctionDiv = document.createElement('div');
    auctionDiv.className = 'auction-clock';
    auctionDiv.setAttribute('data-auction-end', '1700007200');
    auctionDiv.textContent = 'Bidding closes in 01:30:00';
    document.body.appendChild(auctionDiv);

    const state = evaluateTimerElement(auctionDiv);
    expect(state).toBe('OBSERVED');

    scanAndNeutralize();
    expect(auctionDiv.hasAttribute('data-vigil-neutralized')).toBe(false);
  });

  // ─── Positive Case 1: Looping Reset Countdown (Manufactured Urgency) ─────
  it('escalates to HIGH_CONFIDENCE_MANUFACTURED_URGENCY when countdown loops back up', () => {
    const cart = document.createElement('div');
    cart.className = 'checkout-cart';
    const timer = document.createElement('div');
    timer.className = 'countdown-timer';
    cart.appendChild(timer);
    document.body.appendChild(cart);

    // Tick 1: Starts at 00:05
    timer.textContent = '00:05';
    evaluateTimerElement(timer);

    // Tick 2: Counts down to 00:01
    timer.textContent = '00:01';
    evaluateTimerElement(timer);

    // Tick 3: Jumps back up to 02:00 (Looping Reset!)
    timer.textContent = '02:00';
    const state = evaluateTimerElement(timer);

    expect(state).toBe('HIGH_CONFIDENCE_MANUFACTURED_URGENCY');

    scanAndNeutralize();
    expect(timer.hasAttribute('data-vigil-neutralized')).toBe(true);

    // Rollback works
    const restoredCount = restoreAllUrgencyNeutralizations();
    expect(restoredCount).toBeGreaterThanOrEqual(1);
    expect(timer.hasAttribute('data-vigil-neutralized')).toBe(false);
  });

  // ─── Positive Case 2: Transactional Context + Urgency Pressure ───────────
  it('escalates when countdown has transactional context and pressure language', () => {
    const container = document.createElement('div');
    container.className = 'checkout-panel';

    const text = document.createElement('p');
    text.textContent = 'Hurry! Flash sale deal ends in';
    container.appendChild(text);

    const timer = document.createElement('span');
    timer.className = 'timer';
    timer.textContent = '10:00';
    container.appendChild(timer);
    document.body.appendChild(container);

    const state = evaluateTimerElement(timer);
    expect(state).toBe('HIGH_CONFIDENCE_MANUFACTURED_URGENCY');
  });
});
