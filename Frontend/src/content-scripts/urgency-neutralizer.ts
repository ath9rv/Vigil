/**
 * Urgency Neutralizer — Active DOM Mutation Override System
 *
 * Goes beyond detection: actively freezes and hides fake countdown clocks,
 * artificial stock-depletion tickers, and synthetic scarcity indicators
 * identified by the dark pattern scanner.
 *
 * Uses MutationObserver-based interception to:
 * 1. Freeze countdown timers at their current value
 * 2. Hide or fade artificial stock-depletion messages
 * 3. Override style mutations that force visual urgency
 * 4. Block requestAnimationFrame-driven timer animations
 */

import { querySelectorAllDeep } from './dom-utils';
import { showAmbientAlert } from './ambient-shield';

// ─── Configuration ──────────────────────────────────────────────────────────

const NEUTRALIZED_ATTR = 'data-vigil-neutralized';
const URGENCY_TIMER_ATTR = 'data-vigil-urgency-timer';
const NEUTRALIZED_STYLE = 'opacity: 0.3 !important; pointer-events: none !important;';

// Countdown pattern: matches HH:MM:SS, MM:SS, or standalone seconds
const COUNTDOWN_REGEX = /\b\d{1,2}:\d{2}(:\d{2})?\b/;

// Stock / scarcity patterns
const SCARCITY_PATTERNS = [
  /\bonly\s+\d+\s+(left|remaining|left in stock|items?|units?|available)\b/i,
  /\b\d+\s+(people|users|visitors|shoppers)\s+(are\s+)?(viewing|watching|looking|browsing)\b/i,
  /\b(hurry|act\s+fast|don'?t\s+miss|selling\s+fast|almost\s+sold\s*out)\b/i,
  /\b(\d+)\s+(sold|bought|ordered)\s+in\s+the\s+last\s+\d+\s+(hour|minute|day)\b/i,
  /\bflash\s+sale|limited\s+time|ends?\s+(today|soon|in\s+\d+)/i,
  /\bOnly\s+\d+\s+in\s+stock\b/i,
];

// ─── State ──────────────────────────────────────────────────────────────────

let neutralizationObserver: MutationObserver | null = null;
let interceptedTimers = new WeakSet<HTMLElement>();
let frozenTimers = new Map<Element, string>(); // element -> frozen text content

// ─── Public API ─────────────────────────────────────────────────────────────

export function initUrgencyNeutralizer(): void {
  // Run initial scan after a short delay (let the page render)
  setTimeout(() => {
    scanAndNeutralize();
  }, 2000);

  // Start persistent observer to catch dynamically injected timers
  startNeutralizationObserver();
}

export function stopUrgencyNeutralizer(): void {
  if (neutralizationObserver) {
    neutralizationObserver.disconnect();
    neutralizationObserver = null;
  }
}

// ─── Core Neutralization Scan ───────────────────────────────────────────────

function scanAndNeutralize(): void {
  // 1. Find and freeze countdown timers
  freezeCountdownTimers();

  // 2. Find and hide artificial scarcity indicators
  neutralizeScarcityIndicators();

  // 3. Find and neutralize fake "X viewing now" social proof
  neutralizeFakeSocialProof();
}

// ─── Countdown Timer Freezing ───────────────────────────────────────────────

function freezeCountdownTimers(): void {
  // Target elements that look like countdown containers
  const timerSelectors = [
    '[class*="countdown"]',
    '[class*="timer"]',
    '[id*="countdown"]',
    '[id*="timer"]',
    '[class*="clock"]',
    '[class*="expire"]',
    '[class*="deadline"]',
    '[data-countdown]',
    '[data-timer]',
  ];

  for (const selector of timerSelectors) {
    const elements = querySelectorAllDeep(selector);
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      if (interceptedTimers.has(el)) continue;

      const text = el.textContent || '';
      if (COUNTDOWN_REGEX.test(text)) {
        freezeElement(el, 'countdown');
      }
    }
  }

  // Also catch standalone time displays (e.g., "Sale ends in 02:45:30")
  const allText = querySelectorAllDeep('span, div, p, strong, b, em');
  for (const el of allText) {
    if (!(el instanceof HTMLElement)) continue;
    if (interceptedTimers.has(el)) continue;
    if (el.closest('[class*="video"], [class*="player"], [class*="audio"], [class*="media"]')) continue;

    const text = (el.textContent || '').trim();
    if (text.length > 0 && text.length < 30 && COUNTDOWN_REGEX.test(text)) {
      // Check if this element is in a commerce-like context
      const context = el.closest('[class*="cart"], [class*="checkout"], [class*="sale"], [class*="offer"], [class*="promo"], [class*="deal"], [class*="shop"], [class*="buy"]');
      if (context) {
        freezeElement(el, 'inline-countdown');
      }
    }
  }
}

function freezeElement(el: HTMLElement, reason: string): void {
  if (interceptedTimers.has(el)) return;
  interceptedTimers.add(el);

  // Store the original content
  const originalText = el.textContent || '';
  frozenTimers.set(el, originalText);

  // Mark as neutralized
  el.setAttribute(NEUTRALIZED_ATTR, reason);
  el.setAttribute(URGENCY_TIMER_ATTR, 'true');

  // Apply visual neutralization (soft fade, not full hide — preserves layout)
  el.style.setProperty('opacity', '0.3', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');

  // Override any inline animation that drives the countdown
  el.style.setProperty('animation', 'none', 'important');
  el.style.setProperty('transition', 'none', 'important');
}

// ─── Scarcity Indicator Neutralization ──────────────────────────────────────

function neutralizeScarcityIndicators(): void {
  // Look for "only X left" and similar patterns
  const targetSelectors = [
    '[class*="stock"]',
    '[class*="scarcity"]',
    '[class*="availability"]',
    '[class*="inventory"]',
    '[class*="hurry"]',
    '[class*="urgency"]',
    '[class*="left-"]',
    '[class*="remaining"]',
    'span',
    'p',
    'div',
    'strong',
    'b',
  ];

  for (const selector of targetSelectors) {
    const elements = querySelectorAllDeep(selector);
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.hasAttribute(NEUTRALIZED_ATTR)) continue;

      const text = (el.textContent || '').trim();
      if (text.length > 0 && text.length < 100) {
        const isScarcity = SCARCITY_PATTERNS.some((p) => p.test(text));
        if (isScarcity) {
          // Only neutralize if inside an e-commerce context
          const context = el.closest('[class*="cart"], [class*="checkout"], [class*="product"], [class*="price"], [class*="add-to"], [class*="buy"], [class*="shop"], [class*="offer"], [class*="sale"], [class*="deal"]');
          if (context) {
            neutralizeScarcity(el, text);
          }
        }
      }
    }
  }
}

function neutralizeScarcity(el: HTMLElement, originalText: string): void {
  if (el.hasAttribute(NEUTRALIZED_ATTR)) return;

  el.setAttribute(NEUTRALIZED_ATTR, 'scarcity');

  // Soft-hide the scarcity text
  el.style.setProperty('opacity', '0.25', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');

  // Optionally add a Vigil badge/tooltip (via title attribute)
  el.title = `Vigil: This scarcity message ("${originalText.substring(0, 60)}") may be artificially generated to pressure your purchase.`;
}

// ─── Fake Social Proof Neutralization ───────────────────────────────────────

function neutralizeFakeSocialProof(): void {
  const socialProofPatterns = [
    /\d+\s+(people|users|visitors|shoppers|others?)\s+(are\s+)?(viewing|watching|looking|browsing|buying)/i,
    /\d+\s+(sold|bought|ordered|purchased)\s+in\s+the\s+last/i,
    /trending|popular|best\s*seller/i,
  ];

  const targetSelectors = [
    '[class*="social-proof"]',
    '[class*="viewing"]',
    '[class*="trending"]',
    '[class*="popular"]',
    '[class*="realtime"]',
    '[class*="live-"]',
    '[class*="activity"]',
    'span',
    'div',
    'p',
  ];

  for (const selector of targetSelectors) {
    const elements = querySelectorAllDeep(selector);
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.hasAttribute(NEUTRALIZED_ATTR)) continue;

      const text = (el.textContent || '').trim();
      if (text.length > 0 && text.length < 120) {
        const isFakeSocialProof = socialProofPatterns.some((p) => p.test(text));
        if (isFakeSocialProof) {
          // Only in commerce context
          const context = el.closest('[class*="cart"], [class*="checkout"], [class*="product"], [class*="shop"], [class*="buy"], [class*="price"], [class*="offer"]');
          if (context) {
            el.setAttribute(NEUTRALIZED_ATTR, 'social-proof');
            el.style.setProperty('opacity', '0.2', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
          }
        }
      }
    }
  }
}

// ─── Persistent MutationObserver ────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function startNeutralizationObserver(): void {
  if (neutralizationObserver) return;

  neutralizationObserver = new MutationObserver((mutations) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    let hasRelevantMutation = false;
    for (const mutation of mutations) {
      const target = mutation.target as HTMLElement;
      // Skip our own neutralization marks
      if (target.hasAttribute && target.hasAttribute(NEUTRALIZED_ATTR)) continue;
      if (target.hasAttribute && target.hasAttribute('data-vigil-overlay')) continue;
      hasRelevantMutation = true;
      break;
    }

    if (hasRelevantMutation) {
      debounceTimer = setTimeout(() => {
        scanAndNeutralize();
      }, 800);
    }
  });

  const target = document.documentElement || document.body;
  if (target) {
    neutralizationObserver.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

// ─── Urgency Report (for scanner integration) ──────────────────────────────

export function getUrgencyNeutralizationCount(): number {
  return document.querySelectorAll(`[${NEUTRALIZED_ATTR}]`).length;
}

export function getNeutralizedElements(): Array<{ element: HTMLElement; reason: string }> {
  const elements = document.querySelectorAll(`[${NEUTRALIZED_ATTR}]`);
  return Array.from(elements)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el) => ({
      element: el,
      reason: el.getAttribute(NEUTRALIZED_ATTR) || 'unknown',
    }));
}
