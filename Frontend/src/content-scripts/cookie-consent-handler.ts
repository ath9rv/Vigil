import rules from '../../rules/cookie_consent_rules.json';
import { showAmbientAlert } from './ambient-shield';

const GENERIC_SELECTORS = [
  '[class*="cookie"][class*="banner"]',
  '[class*="cookie"][class*="consent"]',
  '[id*="cookie-consent"]',
  '[class*="gdpr"]',
  'div[class*="cc-"]',
  '[class*="CookieConsent"]'
];

const TEXT_PATTERNS = /accept.*cookie|cookie.*accept|we use cookies|this site uses cookies/i;

const REJECT_PATTERNS = /^(reject|decline|deny|refuse|no|only essential|necessary only|dismiss)/i;
const MANAGE_PATTERNS = /^(manage|customize|preferences|settings|options|learn more|cookie settings)/i;

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
    message: 'To prevent an infinite page-reload loop, Vigil silently hid this consent dialog without breaking site navigation.'
  });
}

function safeQuerySelector(root: ParentNode, sel: string): HTMLElement | null {
  try {
    const el = root.querySelector(sel);
    return el instanceof HTMLElement ? el : null;
  } catch {
    return null;
  }
}

function safeQuerySelectorAll(root: ParentNode, sel: string): HTMLElement[] {
  try {
    return Array.from(root.querySelectorAll(sel)).filter((e): e is HTMLElement => e instanceof HTMLElement);
  } catch {
    return [];
  }
}

function runCosmeticHiderFallback(): void {
  if (actionTaken) return;
  for (const cmp of rules) {
    const banner = safeQuerySelector(document, cmp.detector);
    if (banner) {
      cosmeticShield(banner, cmp.name);
      return;
    }
  }
  const genericBanner = findGenericBanner();
  if (genericBanner) {
    cosmeticShield(genericBanner, 'Generic');
  }
}

function runDetection(): void {
  if (actionTaken) return;
  
  // 1. Check known CMPs
  for (const cmp of rules) {
    const banner = safeQuerySelector(document, cmp.detector);
    if (banner) {
      if (isPaywalledCMP(banner)) {
        reportAction('BANNER_DETECTED', `${cmp.name} (Paywalled / Pur-Abo)`);
        actionTaken = true;
        return;
      }
      handleCMP(cmp, banner);
      return;
    }
  }

  // 2. Check generic patterns
  const genericBanner = findGenericBanner();
  if (genericBanner) {
    if (isPaywalledCMP(genericBanner)) {
      reportAction('BANNER_DETECTED', 'Generic (Paywalled)');
      actionTaken = true;
      return;
    }
    handleGeneric(genericBanner);
  }
}

function findGenericBanner(): HTMLElement | null {
  for (const sel of GENERIC_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLElement) return el;
    } catch {}
  }
  
  const divs = document.querySelectorAll('div, section');
  for (let i = 0; i < divs.length; i++) {
    const div = divs[i];
    if (div.textContent && div.textContent.length < 500 && TEXT_PATTERNS.test(div.textContent)) {
      const rect = div.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0 && rect.bottom <= window.innerHeight + 100) {
        return div as HTMLElement;
      }
    }
  }
  return null;
}

function handleCMP(cmp: any, banner: HTMLElement): void {
  updateCanaryAttempt();

  // Strategy: Reject -> Manage
  for (const sel of cmp.reject_selectors) {
    const btn = safeQuerySelector(banner, sel) || safeQuerySelector(document, sel);
    if (btn) {
      btn.click();
      reportAction('AUTO_REJECTED', cmp.name);
      actionTaken = true;
      return;
    }
  }
  
  // Try Manage
  for (const sel of cmp.manage_selectors) {
    const btn = safeQuerySelector(banner, sel) || safeQuerySelector(document, sel);
    if (btn) {
      btn.click();
      setTimeout(() => {
        if (cmp.toggle_off) {
          const toggles = safeQuerySelectorAll(document, cmp.toggle_off);
          toggles.forEach(t => t.click());
        }
        for (const saveSel of cmp.save_selectors) {
          const saveBtn = safeQuerySelector(document, saveSel);
          if (saveBtn) {
            saveBtn.click();
            break;
          }
        }
        reportAction('AUTO_REJECTED', cmp.name);
      }, 1000);
      actionTaken = true;
      return;
    }
  }
  
  reportAction('BANNER_DETECTED', cmp.name);
  actionTaken = true;
}

function handleGeneric(banner: HTMLElement): void {
  updateCanaryAttempt();

  const buttons = banner.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
  let rejected = false;
  
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const text = (btn.textContent || (btn as HTMLInputElement).value || '').trim();
    if (REJECT_PATTERNS.test(text)) {
      (btn as HTMLElement).click();
      reportAction('AUTO_REJECTED', 'Generic');
      rejected = true;
      actionTaken = true;
      return;
    }
  }
  
  if (!rejected) {
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').trim();
      if (MANAGE_PATTERNS.test(text)) {
        (btn as HTMLElement).click();
        reportAction('BANNER_DETECTED', 'Generic');
        actionTaken = true;
        return;
      }
    }
  }
  
  reportAction('BANNER_DETECTED', 'Generic');
  actionTaken = true;
}

function reportAction(action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER', cmp: string | null): void {
  const domain = window.location.hostname;
  chrome.storage.local.set({ 
    vigil_cookie_action: { 
      domain, 
      action,
      cmp,
      timestamp: Date.now()
    }
  });
  
  chrome.runtime.sendMessage({ 
    type: 'VIGIL_COOKIE_ACTION', 
    domain, 
    action, 
    cmp 
  }).catch(() => {});
}

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
