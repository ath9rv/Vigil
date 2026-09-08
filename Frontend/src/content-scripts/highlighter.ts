import type { Finding } from '../shared/types';
import { HIGHLIGHT_COLORS, HIGHLIGHT_BORDER_COLORS } from '../shared/constants';

let overlays: HTMLElement[] = [];

export function highlightFinding(finding: Finding): void {
  const element = document.querySelector(finding.elementSelector) as HTMLElement;
  if (!element) return;

  const rect = finding.elementRect || element.getBoundingClientRect();
  
  const overlay = document.createElement('div');
  overlay.setAttribute('data-vigil-overlay', 'true');
  
  const sevKey = (finding.severity || 'OBSERVED').toLowerCase() as keyof typeof HIGHLIGHT_COLORS;
  const bgColor = HIGHLIGHT_COLORS[sevKey] || HIGHLIGHT_COLORS.low;
  const borderColor = HIGHLIGHT_BORDER_COLORS[sevKey] || HIGHLIGHT_BORDER_COLORS.low;

  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.backgroundColor = bgColor;
  overlay.style.border = `2px solid ${borderColor}`;
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'none';
  overlay.style.boxSizing = 'border-box';

  const tooltip = document.createElement('div');
  const icon = finding.severity === 'CRITICAL' ? '🛑' : finding.severity === 'CONFIRMED' ? '⚠️' : 'ℹ️';
  tooltip.textContent = `${icon} ${finding.ruleName}`;
  tooltip.style.position = 'absolute';
  tooltip.style.top = '-20px';
  tooltip.style.left = '0';
  tooltip.style.backgroundColor = borderColor;
  tooltip.style.color = 'white';
  tooltip.style.fontSize = '12px';
  tooltip.style.padding = '2px 4px';
  tooltip.style.borderRadius = '2px';
  tooltip.style.whiteSpace = 'nowrap';
  tooltip.style.pointerEvents = 'none';
  
  overlay.appendChild(tooltip);
  document.body.appendChild(overlay);
  overlays.push(overlay);
}

export function clearHighlights(): void {
  overlays.forEach(overlay => overlay.remove());
  overlays = [];
}

export function highlightAllFindings(findings: Finding[]): void {
  clearHighlights();
  findings.forEach(highlightFinding);
}

// Listen for highlight requests
chrome.runtime.onMessage.addListener((message, sender) => {
  if (chrome.runtime?.id && sender?.id && sender.id !== chrome.runtime.id) {
    console.warn('[Vigil Security] Message rejected in highlighter: untrusted sender.id', sender.id);
    return;
  }
  if (message.type === 'HIGHLIGHT_REQUEST') {
    chrome.storage.local.get(['findings_cache'], (result) => {
      const cache = result.findings_cache || {};
      const domain = window.location.hostname;
      const findings: Finding[] = cache[domain] || [];
      const finding = findings.find((f: Finding) => f.id === message.findingId);
      if (finding) {
        highlightFinding(finding);
      }
    });
  } else if (message.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights();
  } else if (message.type === 'VIGIL_HIGHLIGHT_TEXT') {
    locateAndHighlightText(message.text, message.ruleName);
  }
});

function locateAndHighlightText(rawText: string, ruleName?: string): boolean {
  if (!rawText || !rawText.trim()) return false;

  const cleanTarget = rawText.trim().replace(/\s+/g, ' ');
  const targetSnippet = cleanTarget.substring(0, Math.min(50, cleanTarget.length)).toLowerCase();

  // 1. Try DOM TreeWalker (most reliable across multi-element nodes)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentNode: Node | null;
  let matchedElement: HTMLElement | null = null;

  while ((currentNode = walker.nextNode())) {
    const nodeText = (currentNode.textContent || '').replace(/\s+/g, ' ').toLowerCase();
    if (nodeText.includes(targetSnippet) || (targetSnippet.length > 25 && targetSnippet.includes(nodeText) && nodeText.length > 20)) {
      matchedElement = currentNode.parentElement;
      break;
    }
  }

  // 2. If not found via exact snippet, search paragraphs / list items for high word overlap
  if (!matchedElement) {
    const searchWords = cleanTarget.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 6);
    if (searchWords.length >= 2) {
      const candidates = Array.from(document.querySelectorAll('p, li, div, dt, dd, section'));
      for (const el of candidates) {
        const text = (el.textContent || '').toLowerCase();
        const matches = searchWords.filter(w => text.includes(w));
        if (matches.length >= Math.min(3, searchWords.length)) {
          matchedElement = el as HTMLElement;
          break;
        }
      }
    }
  }

  // 3. Fallback to native window.find if available
  if (!matchedElement && typeof (window as any).find === 'function') {
    try {
      window.getSelection()?.removeAllRanges();
      const win = window as any;
      const found = win.find(cleanTarget.substring(0, 45), false, false, true, false, true, false);
      if (found) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          matchedElement = sel.getRangeAt(0).startContainer.parentElement;
        }
      }
    } catch {}
  }

  if (!matchedElement) {
    console.warn('Vigil: Could not locate text excerpt on this page DOM:', targetSnippet);
    return false;
  }

  // 4. Highlight and scroll into view
  matchedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Create high-visibility animated overlay badge
  const rect = matchedElement.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute('data-vigil-overlay', 'true');
  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY - 6}px`;
  overlay.style.left = `${rect.left + window.scrollX - 6}px`;
  overlay.style.width = `${rect.width + 12}px`;
  overlay.style.height = `${rect.height + 12}px`;
  overlay.style.border = '3px solid #f59e0b';
  overlay.style.backgroundColor = 'rgba(245, 158, 11, 0.20)';
  overlay.style.borderRadius = '8px';
  overlay.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.7)';
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'none';
  overlay.style.transition = 'opacity 1.5s ease-out';

  const badge = document.createElement('div');
  badge.textContent = `🛡️ Vigil: Flagged Legal Term ${ruleName ? `(${ruleName})` : ''}`;
  badge.style.position = 'absolute';
  badge.style.top = '-26px';
  badge.style.left = '0';
  badge.style.backgroundColor = '#b45309';
  badge.style.color = '#ffffff';
  badge.style.fontSize = '12px';
  badge.style.fontWeight = 'bold';
  badge.style.padding = '3px 8px';
  badge.style.borderRadius = '4px';
  badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  badge.style.whiteSpace = 'nowrap';
  overlay.appendChild(badge);

  document.body.appendChild(overlay);
  overlays.push(overlay);

  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 1500);
  }, 6000);

  return true;
}

window.addEventListener('popstate', clearHighlights);
window.addEventListener('beforeunload', clearHighlights);
