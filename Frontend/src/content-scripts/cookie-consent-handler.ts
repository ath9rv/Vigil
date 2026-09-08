import rules from '../../rules/cookie_consent_rules.json';
import { showAmbientAlert } from './ambient-shield';
import {
  querySelectorAllDeep,
  querySelectorDeep,
  safeQuerySelectorAllDeep,
  safeQuerySelectorDeep,
  collectButtonsDeep,
  isInsideShadowRoot,
} from './dom-utils';

// ─── Generic CMP Selectors (pierce Shadow DOM) ────────────────────────────

const GENERIC_SELECTORS = [
  '[class*="cookie"][class*="banner"]',
  '[class*="cookie"][class*="consent"]',
  '[id*="cookie-consent"]',
  '[class*="gdpr"]',
  'div[class*="cc-"]',
  '[class*="CookieConsent"]',
  '[class*="cookie-notice"]',
  '[class*="consent-banner"]',
  '[id*="consent-banner"]',
  '[class*="consent-modal"]',
  '[class*="privacy-banner"]',
];

const TEXT_PATTERNS = /accept.*cookie|cookie.*accept|we use cookies|this site uses cookies|cookie policy|by continuing|cookie notice/i;

// ─── Button Classification Patterns ────────────────────────────────────────

const REJECT_PATTERNS = /^(reject|decline|deny|refuse|no|only essential|necessary only|dismiss|manage preferences|reject all|decline all|refuse all|customize|do not accept|no thanks|opt.out|disable|turn off)/i;
const MANAGE_PATTERNS = /^(manage|customize|preferences|settings|options|learn more|cookie settings|view preferences|cookie preferences|all cookies|edit settings)/i;
const ACCEPT_PATTERNS = /^(accept|agree|i agree|allow|got it|i understand|ok|continue|enable all|accept all|allow all|i accept)/i;

// ─── Dark Pattern Heuristic Weights ────────────────────────────────────────

interface ButtonHeuristic {
  element: HTMLElement;
  text: string;
  isReject: boolean;
  isManage: boolean;
  isAccept: boolean;
  score: number; // higher = better candidate for "the privacy-preserving choice"
}

const CANARY_STORAGE_KEY = '__vigil_canary_state';

interface CanaryState {
  lastAttempt: number;
  reloadCount: number;
  canaryTripped: boolean;
}

let actionTaken = false;

export function initCookieConsentHandler(): void {
  // Check Canary Loop state
  const canary = getCanaryState();
  if (canary.canaryTripped) {
    console.warn('Vigil Cookie Canary: Breakage loop detected on this origin. Falling back to cosmetic shield.');
    setTimeout(() => {
      runCosmeticHiderFallback();
    }, 1000);
    return;
  }

  setTimeout(() => {
    runDetection();
    setupObserver();
  }, 1500);
}

// ─── Canary Loop Protection ─────────────────────────────────────────────────

function getCanaryState(): CanaryState {
  try {
    const raw = sessionStorage.getItem(CANARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.lastAttempt < 5000) {
        return parsed;
      }
    }
  } catch {}
  return { lastAttempt: 0, reloadCount: 0, canaryTripped: false };
}

function updateCanaryAttempt(): void {
  try {
    const state = getCanaryState();
    const now = Date.now();
    if (now - state.lastAttempt < 5000) {
      state.reloadCount++;
      if (state.reloadCount >= 2) {
        state.canaryTripped = true;
      }
    } else {
      state.reloadCount = 1;
    }
    state.lastAttempt = now;
    sessionStorage.setItem(CANARY_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Paywalled CMP Detection ───────────────────────────────────────────────

function isPaywalledCMP(banner: HTMLElement): boolean {
  const text = (banner.textContent || '').toLowerCase();
  return (
    text.includes('pur-abo') ||
    text.includes('pur abo') ||
    text.includes('pay or okay') ||
    text.includes('oder werbefrei') ||
    text.includes('pur-zugang')
  );
}

// ─── Cosmetic Shield (Fallback) ────────────────────────────────────────────

function cosmeticShield(banner: HTMLElement, name: string): void {
  banner.style.setProperty('display', 'none', 'important');
  banner.style.setProperty('visibility', 'hidden', 'important');
  banner.style.setProperty('pointer-events', 'none', 'important');
  document.documentElement.style.setProperty('overflow', 'auto', 'important');
  document.body.style.setProperty('overflow', 'auto', 'important');

  reportAction('AUTO_REJECTED', `${name} (Cosmetic Shield)`);
  actionTaken = true;

  showAmbientAlert({
    id: 'canary-loop-shield',
    type: 'CANARY_BREAKAGE',
    title: 'Vigil Breakage Canary',
    message: 'To prevent an infinite page-reload loop, Vigil silently hid this consent dialog without breaking site navigation.',
  });
}

// ─── Main Detection Pipeline ───────────────────────────────────────────────

function runDetection(): void {
  if (actionTaken) return;

  // Phase A: Check known CMPs via shadow-piercing queries
  for (const cmp of rules) {
    // Try the primary detector — pierce through shadow roots
    const banner = safeQuerySelectorDeep(document, cmp.detector);
    if (banner) {
      if (isPaywalledCMP(banner)) {
        reportAction('BANNER_DETECTED', `${cmp.name} (Paywalled / Pur-Abo)`);
        actionTaken = true;
        return;
      }
      handleKnownCMP(cmp, banner);
      return;
    }
  }

  // Phase B: Check generic patterns (shadow-piercing)
  const genericBanner = findGenericBannerDeep();
  if (genericBanner) {
    if (isPaywalledCMP(genericBanner)) {
      reportAction('BANNER_DETECTED', 'Generic (Paywalled)');
      actionTaken = true;
      return;
    }
    handleGenericBanner(genericBanner);
    return;
  }

  // Phase C: Heuristic DOM Engine for unknown CMPs
  const heuristicResult = runHeuristicCMPEngine();
  if (heuristicResult) {
    reportAction('AUTO_REJECTED', `Heuristic (${heuristicResult.cmpName})`);
    actionTaken = true;
  }
}

// ─── Shadow-DOM-Aware Banner Discovery ─────────────────────────────────────

function findGenericBannerDeep(): HTMLElement | null {
  // 1. Try known generic selectors with shadow DOM piercing
  for (const sel of GENERIC_SELECTORS) {
    const el = querySelectorDeep(sel);
    if (el) return el;
  }

  // 2. Text-based heuristic across shadow roots
  const allDivs = querySelectorAllDeep('div, section, aside, [role="dialog"]');
  for (let i = 0; i < allDivs.length; i++) {
    const div = allDivs[i] as HTMLElement;
    const text = div.textContent || '';
    if (text.length > 0 && text.length < 800 && TEXT_PATTERNS.test(text)) {
      const rect = div.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0 && rect.bottom <= window.innerHeight + 100) {
        // Additional heuristic: must contain at least one interactive button
        const buttons = collectButtonsDeep(div);
        if (buttons.length >= 1) {
          return div;
        }
      }
    }
  }
  return null;
}

// ─── Known CMP Handler (Shadow-Piercing) ───────────────────────────────────

function handleKnownCMP(cmp: any, banner: HTMLElement): void {
  updateCanaryAttempt();

  const shadowNote = isInsideShadowRoot(banner) ? ' (Shadow DOM)' : '';

  // Strategy: Reject → Manage → Toggle Off → Save
  for (const sel of cmp.reject_selectors) {
    // Try inside banner first, then globally (some CMPs render buttons at body level)
    const btn = safeQuerySelectorDeep(banner, sel) || safeQuerySelectorDeep(document, sel);
    if (btn) {
      btn.click();
      reportAction('AUTO_REJECTED', `${cmp.name}${shadowNote}`);
      actionTaken = true;
      return;
    }
  }

  // Try Manage
  for (const sel of cmp.manage_selectors) {
    const btn = safeQuerySelectorDeep(banner, sel) || safeQuerySelectorDeep(document, sel);
    if (btn) {
      btn.click();
      setTimeout(() => {
        if (cmp.toggle_off) {
          const toggles = safeQuerySelectorAllDeep(document, cmp.toggle_off);
          toggles.forEach((t) => t.click());
        }
        for (const saveSel of cmp.save_selectors) {
          const saveBtn = safeQuerySelectorDeep(document, saveSel);
          if (saveBtn) {
            saveBtn.click();
            break;
          }
        }
        reportAction('AUTO_REJECTED', `${cmp.name}${shadowNote}`);
      }, 1000);
      actionTaken = true;
      return;
    }
  }

  reportAction('BANNER_DETECTED', `${cmp.name}${shadowNote}`);
  actionTaken = true;
}

// ─── Generic Banner Handler (Shadow-Piercing) ──────────────────────────────

function handleGenericBanner(banner: HTMLElement): void {
  updateCanaryAttempt();

  // Collect all buttons from the banner (including shadow DOM children)
  const buttons = collectButtonsDeep(banner);

  // Phase 1: Look for a clear reject/decline button
  for (const btn of buttons) {
    const text = getButtonLabel(btn);
    if (REJECT_PATTERNS.test(text)) {
      btn.click();
      reportAction('AUTO_REJECTED', 'Generic (Shadow-Pierced)');
      actionTaken = true;
      return;
    }
  }

  // Phase 2: Look for manage/customize to disable everything
  for (const btn of buttons) {
    const text = getButtonLabel(btn);
    if (MANAGE_PATTERNS.test(text)) {
      btn.click();
      reportAction('BANNER_DETECTED', 'Generic (Manage)');
      actionTaken = true;
      return;
    }
  }

  reportAction('BANNER_DETECTED', 'Generic');
  actionTaken = true;
}

// ─── Heuristic CMP Engine (Unknown CMPs) ───────────────────────────────────
/**
 * Fallback engine that analyzes the DOM for likely cookie consent banners
 * that aren't matched by any known CMP rule. Uses button heuristics:
 * position, color contrast, text semantics, and visual weight to find
 * the privacy-preserving action.
 */
function runHeuristicCMPEngine(): { cmpName: string } | null {
  // Find the best candidate banner via heuristics
  const candidateBanners = findHeuristicBannerCandidates();
  if (candidateBanners.length === 0) return null;

  for (const banner of candidateBanners) {
    const buttons = collectButtonsDeep(banner);
    if (buttons.length === 0) continue;

    // Classify each button
    const heuristics: ButtonHeuristic[] = [];
    for (const btn of buttons) {
      const heuristic = classifyButton(btn);
      if (heuristic) {
        heuristics.push(heuristic);
      }
    }

    if (heuristics.length === 0) continue;

    // Pick the best privacy-preserving button
    const bestReject = heuristics
      .filter((h) => h.isReject || h.isManage)
      .sort((a, b) => b.score - a.score)[0];

    if (bestReject) {
      updateCanaryAttempt();
      bestReject.element.click();
      actionTaken = true;
      return { cmpName: `Heuristic-${bestReject.isReject ? 'Reject' : 'Manage'}` };
    }
  }

  return null;
}

function findHeuristicBannerCandidates(): HTMLElement[] {
  const candidates: Array<{ element: HTMLElement; score: number }> = [];

  // Look for fixed/sticky bottom/top overlays with consent-like text
  const allElements = querySelectorAllDeep('div, section, aside, nav');
  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;

    const style = window.getComputedStyle(el);
    const position = style.position;
    const isOverlay = position === 'fixed' || position === 'sticky';
    if (!isOverlay) continue;

    const rect = el.getBoundingClientRect();
    // Must be reasonably sized and positioned at top or bottom
    if (rect.height < 50 || rect.width < 200) continue;
    const isBottom = rect.bottom >= window.innerHeight - 120;
    const isTop = rect.top <= 120;
    if (!isBottom && !isTop) continue;

    // Must contain consent-related text
    const text = el.textContent || '';
    const hasConsentText = TEXT_PATTERNS.test(text) || /consent|privacy|cookie|gdpr|ccpa/i.test(text);
    if (!hasConsentText) continue;

    // Must have interactive buttons
    const buttons = collectButtonsDeep(el);
    if (buttons.length < 2) continue; // Most CMPs have at least Accept + Reject/Manage

    // Score based on z-index, button count, and text match quality
    let score = 0;
    const zIndex = parseInt(style.zIndex || '0', 10);
    if (zIndex > 100) score += 30;
    if (zIndex > 1000) score += 20;
    if (buttons.length >= 3) score += 10;
    if (text.length < 500) score += 5; // Compact banners are more likely consent
    if (/cookie|consent|gdpr/i.test(text)) score += 15;

    candidates.push({ element: el, score });
  }

  // Sort by heuristic score (highest first)
  return candidates.sort((a, b) => b.score - a.score).map((c) => c.element);
}

function classifyButton(btn: HTMLElement): ButtonHeuristic | null {
  const text = getButtonLabel(btn);
  if (!text || text.length === 0 || text.length > 100) return null;

  const lowerText = text.toLowerCase().trim();

  const isReject = REJECT_PATTERNS.test(lowerText);
  const isManage = MANAGE_PATTERNS.test(lowerText);
  const isAccept = ACCEPT_PATTERNS.test(lowerText);

  // Skip buttons that are clearly "Accept" — we want the privacy-preserving option
  if (isAccept && !isReject && !isManage) return null;

  let score = 0;

  // Base score for being a reject/manage candidate
  if (isReject) score += 50;
  if (isManage) score += 30;

  // Visual weight analysis: smaller/lower-contrast buttons are often the "reject"
  // option that dark patterns try to suppress — we WANT these
  const style = window.getComputedStyle(btn);
  const fontSize = parseFloat(style.fontSize) || 14;
  const opacity = parseFloat(style.opacity) || 1;
  const fontWeight = parseInt(style.fontWeight || '400', 10) || 400;

  // Dark patterns make reject buttons smaller and lighter
  if (fontSize <= 13) score += 10;
  if (opacity < 0.8) score += 15;
  if (fontWeight <= 400) score += 5;

  // Check color contrast: if button text is very similar to background,
  // it's been deliberately de-emphasized (interface interference pattern)
  const bgColor = style.backgroundColor;
  const textColor = style.color;
  if (bgColor && textColor) {
    const contrast = estimateContrast(bgColor, textColor);
    if (contrast < 2.5) score += 20; // Very low contrast = deliberately hidden
  }

  // Reject button that's visually suppressed is even more important to click
  if (isReject && opacity < 0.8) score += 10;

  // Manage/Customize is second-best option
  if (isManage) score += 10;

  return {
    element: btn,
    text,
    isReject,
    isManage,
    isAccept,
    score,
  };
}

// ─── Button Label Extraction (Shadow-DOM Aware) ────────────────────────────

function getButtonLabel(btn: HTMLElement): string {
  // Try textContent first (works for both light and shadow DOM)
  const text = btn.textContent?.trim() || '';
  // Also check input value for <input type="button">
  const value = (btn as HTMLInputElement).value || '';
  // Also check aria-label
  const ariaLabel = btn.getAttribute('aria-label') || '';
  // Also check title attribute
  const title = btn.getAttribute('title') || '';

  // Return the first non-empty label
  return text || value || ariaLabel || title;
}

// ─── Color Contrast Estimation ─────────────────────────────────────────────

function parseColor(color: string): [number, number, number, number] | null {
  // Handle rgb() / rgba()
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10),
      rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    ];
  }
  return null;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function estimateContrast(bgColor: string, textColor: string): number {
  const bg = parseColor(bgColor);
  const fg = parseColor(textColor);
  if (!bg || !fg) return 7; // Assume good contrast if can't parse
  const l1 = relativeLuminance(bg[0], bg[1], bg[2]);
  const l2 = relativeLuminance(fg[0], fg[1], fg[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Reporting ─────────────────────────────────────────────────────────────

function reportAction(action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER', cmp: string | null): void {
  const domain = window.location.hostname;
  chrome.storage.local.set({
    vigil_cookie_action: {
      domain,
      action,
      cmp,
      timestamp: Date.now(),
    },
  });

  chrome.runtime
    .sendMessage({
      type: 'VIGIL_COOKIE_ACTION',
      domain,
      action,
      cmp,
    })
    .catch(() => {});
}

// ─── MutationObserver Setup ────────────────────────────────────────────────

let timeoutId: number | null = null;

function setupObserver(): void {
  const observer = new MutationObserver(() => {
    if (actionTaken) {
      observer.disconnect();
      return;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      runDetection();
    }, 500);
  });

  const targetNode = document.documentElement || document.body;
  if (targetNode) {
    observer.observe(targetNode, { childList: true, subtree: true });
  }
}

// ─── Fallback Cosmetic Hider (Canary Loop) ─────────────────────────────────

function runCosmeticHiderFallback(): void {
  if (actionTaken) return;
  for (const cmp of rules) {
    const banner = safeQuerySelectorDeep(document, cmp.detector);
    if (banner) {
      cosmeticShield(banner, cmp.name);
      return;
    }
  }
  const genericBanner = findGenericBannerDeep();
  if (genericBanner) {
    cosmeticShield(genericBanner, 'Generic');
  }
}
