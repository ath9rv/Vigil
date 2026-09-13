import type { Finding } from '../shared/types';
import { HIGHLIGHT_COLORS, HIGHLIGHT_BORDER_COLORS } from '../shared/constants';

export const BEACON_CONTAINER_ID = 'vigil-beacon-container';
let activeTimeoutIds: Array<ReturnType<typeof setTimeout>> = [];

export type LocateMethod = 'exact_selector' | 'exact_text' | 'word_overlap' | 'window_find';

export interface LocateResult {
  readonly success: boolean;
  readonly method?: LocateMethod;
  readonly confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly matchedElement?: HTMLElement;
}

export interface LocateTargetOptions {
  selector?: string;
  text?: string;
  ruleName?: string;
  findingId?: string;
  severity?: string;
}

interface InternalTargetMatch {
  element: HTMLElement;
  method: LocateMethod;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Searches the DOM for a target element using strict hierarchical fallback:
 * 1. Exact CSS selector query
 * 2. Exact normalized text snippet search on text nodes
 * 3. Bounded word-overlap match across structural semantic elements
 * 4. Native window.find fallback as last-resort compatibility
 */
export function findTargetElement(selector?: string, text?: string): InternalTargetMatch | null {
  // 1. Selector query (fastest, most precise for DOM scanner findings)
  if (selector && typeof selector === 'string' && selector.trim()) {
    try {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        return { element: el, method: 'exact_selector', confidence: 'HIGH' };
      }
    } catch {
      // Ignore invalid selector syntax from external or corrupted input
    }
  }

  // 2. Text-based search if excerpt/text is provided
  if (!text || !text.trim()) return null;

  const cleanTarget = text.trim().replace(/\s+/g, ' ');
  const targetSnippet = cleanTarget.substring(0, Math.min(50, cleanTarget.length)).toLowerCase();

  if (document.body) {
    // Tier 2: DOM TreeWalker exact snippet match
    if (targetSnippet.length >= 8) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;

      while ((currentNode = walker.nextNode())) {
        const nodeText = (currentNode.textContent || '').replace(/\s+/g, ' ').toLowerCase();
        if (nodeText.includes(targetSnippet) || (targetSnippet.length > 25 && targetSnippet.includes(nodeText) && nodeText.length > 20)) {
          if (currentNode.parentElement) {
            return { element: currentNode.parentElement, method: 'exact_text', confidence: 'HIGH' };
          }
        }
      }
    }

    // Tier 3: Bounded word overlap across structural semantic elements
    const searchWords = cleanTarget.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 6);
    if (searchWords.length >= 2) {
      const candidates = Array.from(document.querySelectorAll('p, li, div, dt, dd, section, span, h1, h2, h3, h4, form, label, article, blockquote'));
      for (const el of candidates) {
        const elText = (el.textContent || '').toLowerCase();
        const matches = searchWords.filter(w => elText.includes(w));
        const threshold = Math.max(2, Math.ceil(searchWords.length * 0.75));
        if (matches.length >= threshold) {
          return { element: el as HTMLElement, method: 'word_overlap', confidence: 'MEDIUM' };
        }
      }
    }

    // Tier 4: Native window.find fallback (last resort only)
    if (typeof (window as any).find === 'function') {
      try {
        window.getSelection()?.removeAllRanges();
        const win = window as any;
        const found = win.find(cleanTarget.substring(0, 40), false, false, true, false, true, false);
        if (found) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const rangeContainer = sel.getRangeAt(0).startContainer;
            const matched = rangeContainer.nodeType === Node.ELEMENT_NODE
              ? (rangeContainer as HTMLElement)
              : rangeContainer.parentElement;
            if (matched) {
              return { element: matched, method: 'window_find', confidence: 'LOW' };
            }
          }
        }
      } catch {
        // window.find may fail or be restricted in certain environments
      }
    }
  }

  return null;
}

/**
 * Ensures a single deterministic beacon container exists in document.body.
 * Replaces any existing container immediately to guarantee zero accumulated DOM state.
 */
function getOrCreateBeaconContainer(): HTMLElement {
  const existing = document.getElementById(BEACON_CONTAINER_ID);
  if (existing) {
    existing.remove();
  }

  const container = document.createElement('div');
  container.id = BEACON_CONTAINER_ID;
  container.setAttribute('aria-hidden', 'true');
  container.setAttribute('data-vigil-beacon-root', 'true');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '2147483647';

  document.body.appendChild(container);
  return container;
}

/**
 * Renders a temporary high-visibility visual beacon and scrolls the element into view.
 * Guarantees zero residual DOM state: completely removes the container after the 4-second animation.
 */
export function showTemporaryBeacon(element: HTMLElement, label?: string, severity?: string): HTMLElement {
  clearHighlights();

  // 1. Scroll smoothly into view (centered)
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 2. Focus element if focusable without user interaction disruption
  if (typeof element.focus === 'function') {
    try {
      element.focus({ preventScroll: true });
    } catch {}
  }

  // 3. Mount inside dedicated deterministic container
  const container = getOrCreateBeaconContainer();

  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-vigil-overlay', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY - 6}px`;
  overlay.style.left = `${rect.left + window.scrollX - 6}px`;
  overlay.style.width = `${Math.max(rect.width + 12, 24)}px`;
  overlay.style.height = `${Math.max(rect.height + 12, 24)}px`;

  const sevKey = (severity || 'OBSERVED').toLowerCase() as keyof typeof HIGHLIGHT_COLORS;
  const borderColor = HIGHLIGHT_BORDER_COLORS[sevKey] || '#f59e0b';
  const bgColor = HIGHLIGHT_COLORS[sevKey] || 'rgba(245, 158, 11, 0.20)';

  overlay.style.border = `3px solid ${borderColor}`;
  overlay.style.backgroundColor = bgColor;
  overlay.style.borderRadius = '8px';
  overlay.style.boxShadow = `0 0 25px ${borderColor}`;
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'none';
  overlay.style.transition = 'opacity 1.2s ease-out';

  // Badge label
  const badge = document.createElement('div');
  const badgeText = label ? `🛡️ Vigil: ${label}` : '🛡️ Vigil Flagged Evidence';
  badge.textContent = badgeText;
  badge.style.position = 'absolute';
  badge.style.top = '-26px';
  badge.style.left = '0';
  badge.style.backgroundColor = borderColor;
  badge.style.color = '#ffffff';
  badge.style.fontSize = '12px';
  badge.style.fontWeight = 'bold';
  badge.style.padding = '3px 8px';
  badge.style.borderRadius = '4px';
  badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  badge.style.whiteSpace = 'nowrap';
  badge.style.pointerEvents = 'none';
  overlay.appendChild(badge);

  container.appendChild(overlay);

  // Auto-fade after 4 seconds, remove container completely to leave ZERO residual DOM state
  const fadeTimer = setTimeout(() => {
    overlay.style.opacity = '0';
    const removeTimer = setTimeout(() => {
      clearHighlights();
    }, 1200);
    activeTimeoutIds.push(removeTimer);
  }, 4000);
  activeTimeoutIds.push(fadeTimer);

  return overlay;
}

/**
 * Unified locate and beacon function for finding cards and user actions.
 * Returns full result metadata (method, confidence, matchedElement).
 */
export function locateTarget(options: LocateTargetOptions): LocateResult {
  const match = findTargetElement(options.selector, options.text);
  if (!match) {
    return { success: false };
  }

  showTemporaryBeacon(match.element, options.ruleName, options.severity);
  return {
    success: true,
    method: match.method,
    confidence: match.confidence,
    matchedElement: match.element
  };
}

export function highlightFinding(finding: Finding): LocateResult {
  return locateTarget({
    selector: finding.elementSelector,
    text: finding.explanation,
    ruleName: finding.ruleName,
    severity: finding.severity
  });
}

/**
 * Clears all active beacons and timer queues, removing the container from the DOM.
 */
export function clearHighlights(): void {
  activeTimeoutIds.forEach(id => clearTimeout(id));
  activeTimeoutIds = [];
  const container = document.getElementById(BEACON_CONTAINER_ID);
  if (container) {
    container.remove();
  }
}

export function highlightAllFindings(findings: Finding[]): void {
  if (findings.length > 0) {
    highlightFinding(findings[0]);
  }
}

// Runtime message dispatcher
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (chrome.runtime?.id && sender?.id && sender.id !== chrome.runtime.id) {
      console.warn('[Vigil Security] Message rejected in highlighter: untrusted sender.id', sender.id);
      return;
    }

    if (message.type === 'LOCATE_ON_PAGE') {
      locateTarget({
        selector: message.selector,
        text: message.text,
        ruleName: message.ruleName,
        severity: message.severity,
        findingId: message.findingId
      });
    } else if (message.type === 'VIGIL_HIGHLIGHT_TEXT') {
      // Backward compatibility with previous text locator calls
      locateTarget({
        text: message.text,
        ruleName: message.ruleName
      });
    } else if (message.type === 'HIGHLIGHT_REQUEST') {
      // Backward compatibility with finding-id requests
      chrome.storage?.local?.get(['findings_cache'], (result) => {
        const cache = result?.findings_cache || {};
        const domain = window.location.hostname;
        const findings: Finding[] = cache[domain] || [];
        const finding = findings.find((f: Finding) => f.id === message.findingId);
        if (finding) {
          highlightFinding(finding);
        }
      });
    } else if (message.type === 'CLEAR_HIGHLIGHTS') {
      clearHighlights();
    }
  });
}

// Automatic cleanup on navigation events ensures zero residual DOM state across navigations
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', clearHighlights);
  window.addEventListener('beforeunload', clearHighlights);
  window.addEventListener('hashchange', clearHighlights);
}
