import type { Finding } from '../shared/types';
import { HIGHLIGHT_COLORS, HIGHLIGHT_BORDER_COLORS } from '../shared/constants';

let overlays: HTMLElement[] = [];

export function highlightFinding(finding: Finding): void {
  const element = document.querySelector(finding.elementSelector) as HTMLElement;
  if (!element) return;

  const rect = finding.elementRect || element.getBoundingClientRect();
  
  const overlay = document.createElement('div');
  overlay.setAttribute('data-vigil-overlay', 'true');
  
  const sevKey = (finding.severity || 'low').toLowerCase() as keyof typeof HIGHLIGHT_COLORS;
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
  const icon = finding.severity === 'severe' ? '🛑' : finding.severity === 'high' ? '⚠️' : 'ℹ️';
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
chrome.runtime.onMessage.addListener((message) => {
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
    // Find text on page and scroll to it
    const text = message.text;
    if (!text) return;
    
    // Simple window.find (native browser text search)
    // Clear selection first
    window.getSelection()?.removeAllRanges();
    const win = window as any;
    const found = typeof win.find === 'function' ? win.find(text, false, false, true, false, true, false) : false;
    
    if (!found && typeof win.find === 'function') {
      // Fallback: try finding a shorter substring if it's too long
      const excerpt = text.substring(0, 100);
      win.find(excerpt, false, false, true, false, true, false);
    }
    
    // Highlight the selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = `${rect.top + window.scrollY - 5}px`;
      overlay.style.left = `${rect.left + window.scrollX - 5}px`;
      overlay.style.width = `${rect.width + 10}px`;
      overlay.style.height = `${rect.height + 10}px`;
      overlay.style.backgroundColor = 'rgba(255, 215, 0, 0.4)'; // Golden highlight
      overlay.style.border = '2px solid orange';
      overlay.style.borderRadius = '4px';
      overlay.style.zIndex = '2147483647';
      overlay.style.pointerEvents = 'none';
      overlay.style.transition = 'opacity 2s';
      
      document.body.appendChild(overlay);
      overlays.push(overlay);
      
      // Scroll into view
      window.scrollTo({
        top: rect.top + window.scrollY - (window.innerHeight / 2),
        behavior: 'smooth'
      });
      
      // Fade out after 5 seconds
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 2000);
      }, 5000);
    }
  }
});

window.addEventListener('popstate', clearHighlights);
window.addEventListener('beforeunload', clearHighlights);
