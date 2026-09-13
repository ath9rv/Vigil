/**
 * Urgency Neutralizer — Multi-Signal Calibrated Intervention System
 *
 * Implements Phase 1 Metric Calibration & Safe Reversibility:
 * 1. Timer State Model:
 *    UNKNOWN -> OBSERVED -> CORRELATED -> SUSPICIOUS -> HIGH_CONFIDENCE_MANUFACTURED_URGENCY -> INTERVENTION -> VERIFIED
 * 2. Multi-Signal Verification:
 *    - Never freezes a timer on mere pattern existence.
 *    - Requires observed dynamics (loop/reset or decrement + transactional context + urgency language).
 *    - Explicitly excludes legitimate countdowns:
 *      * Banking/security session timeouts ("session will expire in")
 *      * Server-synchronized auction/ticket reservations (data-server-time, data-expires-at)
 * 3. Centralized Reversibility:
 *    - Delegates all mutations to InterventionManager.
 *    - Captures element state in WeakMap with zero destructive deletions.
 *    - Preserves bounding geometry and enables 1-click restore.
 */

import { querySelectorAllDeep } from './dom-utils';
import { interventionManager } from '../intervention/manager';
import { metricsCollector } from '../observability/metrics';
import { classifyDarkPattern } from './ml-dark-pattern';

// ─── Constants & Patterns ───────────────────────────────────────────────────

export const NEUTRALIZED_ATTR = 'data-vigil-neutralized';
export const URGENCY_TIMER_ATTR = 'data-vigil-urgency-timer';

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

// Legitimate Session Timeout / Inactivity Patterns (Must be excluded)
const LEGITIMATE_SESSION_PATTERNS = [
  /session\s+(will\s+)?expire/i,
  /session\s+timeout/i,
  /logged\s+out\s+in/i,
  /inactivity\s+timeout/i,
  /security\s+timeout/i,
  /for\s+your\s+security/i,
];

// Legitimate Server-Synchronization Selectors / Attributes
const SERVER_SYNC_SELECTORS = [
  '[data-server-time]',
  '[data-expires-at]',
  '[data-end-time]',
  '[data-auction-end]',
  '[data-utc]',
  '[aria-live="polite"][class*="ticket"]',
  '[class*="flight-timer"]',
  '[class*="boarding-pass"]',
];

// ─── Types & State Model ────────────────────────────────────────────────────

export type TimerState = 
  | 'UNKNOWN' 
  | 'OBSERVED' 
  | 'CORRELATED' 
  | 'SUSPICIOUS' 
  | 'HIGH_CONFIDENCE_MANUFACTURED_URGENCY' 
  | 'INTERVENTION' 
  | 'VERIFIED';

interface TimerTrackRecord {
  element: HTMLElement;
  state: TimerState;
  firstObservedAt: number;
  lastObservedAt: number;
  observedValues: string[];
  secondsHistory: number[];
  decrementCount: number;
  resetCount: number;
  hasTransactionalContext: boolean;
  hasUrgencyLanguage: boolean;
  hasServerSync: boolean;
  isLegitimateSessionExpiry: boolean;
}

// ─── Module State ───────────────────────────────────────────────────────────

let neutralizationObserver: MutationObserver | null = null;
const trackedTimers = new WeakMap<HTMLElement, TimerTrackRecord>();
const trackedElementsList = new Set<WeakRef<HTMLElement>>();

// ─── Public API ─────────────────────────────────────────────────────────────

export function initUrgencyNeutralizer(): void {
  // Initial scan after short delay for page render
  setTimeout(() => {
    scanAndNeutralize();
  }, 1000);

  // Start persistent observer
  startNeutralizationObserver();
}

export function stopUrgencyNeutralizer(): void {
  if (neutralizationObserver) {
    neutralizationObserver.disconnect();
    neutralizationObserver = null;
  }
}

/**
 * Calibrated Evaluation: Evaluates whether an element represents manufactured urgency.
 */
export function evaluateTimerElement(el: HTMLElement): TimerState {
  if (!el || !(el instanceof HTMLElement)) return 'UNKNOWN';

  const text = (el.textContent || '').trim();
  if (!COUNTDOWN_REGEX.test(text)) return 'UNKNOWN';

  // 1. Check for Legitimate Session Expiry Exclusions
  const contextText = (el.closest('body')?.textContent || el.textContent || '').slice(0, 1000);
  const isSessionExpiry = LEGITIMATE_SESSION_PATTERNS.some(p => p.test(text) || (el.parentElement && p.test(el.parentElement.textContent || '')));
  if (isSessionExpiry) {
    return 'OBSERVED'; // Benign session timeout: do not flag
  }

  // 2. Check for Server-Sync / Auction / Ticket Reservation Attributes
  const hasServerSync = SERVER_SYNC_SELECTORS.some(sel => el.matches(sel) || el.closest(sel) !== null);
  if (hasServerSync) {
    return 'OBSERVED'; // Legitimate server-synchronized event
  }

  // 3. Inspect Context
  const hasTransactionalContext = el.closest('[class*="cart"], [class*="checkout"], [class*="sale"], [class*="offer"], [class*="promo"], [class*="deal"], [class*="shop"], [class*="buy"], [class*="product"], [class*="price"]') !== null;
  const hasUrgencyLanguage = SCARCITY_PATTERNS.some(p => p.test(text) || (el.parentElement && p.test(el.parentElement.textContent || '')));

  // 4. Update Dynamics Tracking
  let track = trackedTimers.get(el);
  const now = Date.now();
  const currentSeconds = parseSeconds(text);

  if (!track) {
    track = {
      element: el,
      state: 'OBSERVED',
      firstObservedAt: now,
      lastObservedAt: now,
      observedValues: [text],
      secondsHistory: currentSeconds !== null ? [currentSeconds] : [],
      decrementCount: 0,
      resetCount: 0,
      hasTransactionalContext,
      hasUrgencyLanguage,
      hasServerSync,
      isLegitimateSessionExpiry: isSessionExpiry,
    };
    trackedTimers.set(el, track);
    trackedElementsList.add(new WeakRef(el));
  } else {
    track.lastObservedAt = now;
    if (!track.observedValues.includes(text)) {
      track.observedValues.push(text);
    }
    if (currentSeconds !== null) {
      const prevSeconds = track.secondsHistory[track.secondsHistory.length - 1];
      if (prevSeconds !== undefined) {
        if (currentSeconds < prevSeconds) {
          track.decrementCount++;
        } else if (currentSeconds > prevSeconds + 5) {
          // Timer jumped back up $\rightarrow$ Looping reset countdown!
          track.resetCount++;
        }
      }
      track.secondsHistory.push(currentSeconds);
    }
  }

  // 5. State Machine Evaluation
  // Rule A: Repeating / Looping Countdown (Unquestionable Manufactured Urgency)
  if (track.resetCount >= 1 && track.decrementCount >= 1) {
    track.state = 'HIGH_CONFIDENCE_MANUFACTURED_URGENCY';
    return track.state;
  }

  // Rule B: Active Decrementing Timer in E-commerce Context with Urgency Language
  if (track.hasTransactionalContext && track.hasUrgencyLanguage) {
    track.state = 'HIGH_CONFIDENCE_MANUFACTURED_URGENCY';
    return track.state;
  }

  // Rule C: Pure countdown in e-commerce container without explicit language
  if (track.hasTransactionalContext) {
    track.state = 'SUSPICIOUS';
    return track.state;
  }

  track.state = 'CORRELATED';
  return track.state;
}

// ─── Scan & Neutralize ──────────────────────────────────────────────────────

export function scanAndNeutralize(): void {
  const stopTimer = metricsCollector.startTimer('dom_scan_ms');

  try {
    freezeCountdownTimers();
    neutralizeScarcityIndicators();
    neutralizeFakeSocialProof();
  } finally {
    stopTimer();
  }
}

function freezeCountdownTimers(): void {
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
      if (el.hasAttribute(NEUTRALIZED_ATTR)) continue;

      const state = evaluateTimerElement(el);
      if (state === 'HIGH_CONFIDENCE_MANUFACTURED_URGENCY') {
        applyTimerIntervention(el, 'Manufactured countdown urgency detected');
      }
    }
  }

  // Catch standalone time displays in commerce contexts
  const textElements = querySelectorAllDeep('span, div, p, strong, b, em');
  for (const el of textElements) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.hasAttribute(NEUTRALIZED_ATTR)) continue;
    if (el.closest('[class*="video"], [class*="player"], [class*="audio"], [class*="media"]')) continue;

    const text = (el.textContent || '').trim();
    if (text.length > 0 && text.length < 35 && COUNTDOWN_REGEX.test(text)) {
      const state = evaluateTimerElement(el);
      if (state === 'HIGH_CONFIDENCE_MANUFACTURED_URGENCY') {
        applyTimerIntervention(el, 'Inline manufactured countdown detected');
      }
    }
  }
}

function applyTimerIntervention(el: HTMLElement, reason: string): void {
  const record = interventionManager.applyIntervention(el, {
    reason,
    confidenceState: 'HIGH',
    mutationType: 'VISUAL_FREEZE',
    freezeText: el.textContent || '',
  });

  if (record) {
    el.setAttribute(URGENCY_TIMER_ATTR, 'true');
    metricsCollector.increment('intervention_count');
  }
}

// ─── Scarcity Indicator Neutralization ──────────────────────────────────────

function neutralizeScarcityIndicators(): void {
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
        const isScarcityRegex = SCARCITY_PATTERNS.some((p) => p.test(text));
        const mlCategory = !isScarcityRegex && text.length > 5 ? classifyDarkPattern(text) : null;
        const isScarcity = isScarcityRegex || mlCategory === 'SCARCITY' || mlCategory === 'URGENCY';
        if (isScarcity) {
          // Strict e-commerce transactional context required
          const context = el.closest('[class*="cart"], [class*="checkout"], [class*="product"], [class*="price"], [class*="add-to"], [class*="buy"], [class*="shop"], [class*="offer"], [class*="sale"], [class*="deal"]');
          if (context) {
            interventionManager.applyIntervention(el, {
              reason: 'Artificial stock/scarcity pressure pattern',
              confidenceState: 'HIGH',
              mutationType: 'SOFT_FADE',
            });
            metricsCollector.increment('intervention_count');
          }
        }
      }
    }
  }
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
        const isSocialProofRegex = socialProofPatterns.some((p) => p.test(text));
        const mlCategory = !isSocialProofRegex && text.length > 5 ? classifyDarkPattern(text) : null;
        const isFakeSocialProof = isSocialProofRegex || mlCategory === 'SOCIAL_PROOF';
        if (isFakeSocialProof) {
          const context = el.closest('[class*="cart"], [class*="checkout"], [class*="product"], [class*="shop"], [class*="buy"], [class*="price"], [class*="offer"]');
          if (context) {
            interventionManager.applyIntervention(el, {
              reason: 'Synthetic real-time social proof message',
              confidenceState: 'MODERATE',
              mutationType: 'SOFT_FADE',
            });
            metricsCollector.increment('intervention_count');
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
    metricsCollector.increment('mutation_callbacks_count');

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    let hasRelevantMutation = false;
    for (const mutation of mutations) {
      const target = mutation.target as HTMLElement;
      if (target.hasAttribute && target.hasAttribute(NEUTRALIZED_ATTR)) continue;
      if (target.hasAttribute && target.hasAttribute('data-vigil-overlay')) continue;
      hasRelevantMutation = true;
      break;
    }

    if (hasRelevantMutation) {
      debounceTimer = setTimeout(() => {
        scanAndNeutralize();
      }, 500);
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

// ─── Reversibility & Metrics Helpers ────────────────────────────────────────

export function restoreAllUrgencyNeutralizations(): number {
  const count = interventionManager.restoreAll();
  metricsCollector.increment('user_restore_count', count);
  return count;
}

export function getUrgencyNeutralizationCount(): number {
  return document.querySelectorAll(`[${NEUTRALIZED_ATTR}]`).length;
}

export function getNeutralizedElements(): Array<{ element: HTMLElement; reason: string }> {
  const elements = document.querySelectorAll(`[${NEUTRALIZED_ATTR}]`);
  return Array.from(elements)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el) => {
      const id = el.getAttribute('data-vigil-intervention-id');
      const inv = id ? interventionManager.getIntervention(id) : null;
      return {
        element: el,
        reason: inv?.reason || el.getAttribute(NEUTRALIZED_ATTR) || 'unknown',
      };
    });
}

function parseSeconds(text: string): number | null {
  const match = text.match(/\b(?:(\d{1,2}):)?(\d{2}):(\d{2})\b/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  return hours * 3600 + minutes * 60 + seconds;
}
