import { showAmbientAlert } from './ambient-shield';

/**
 * Adversarial Defense & Behavioral Observer.
 * Defends against adversarial evasion techniques:
 * 1. Runtime Cross-Origin Form Submit Interception (credential misdirection)
 * 2. Split-Node Text Obfuscation De-mangling
 * 3. Synthetic Coercive Countdown Timer Detection
 */

export function initAdversarialObserver(): void {
  // ─── 1. Capture-Phase Form Submit Interception ──────────────────────────────
  // Intercepts form submits BEFORE they navigate or post, catching dynamically altered form actions
  document.addEventListener('submit', (e: Event) => {
    const form = e.target as HTMLFormElement;
    if (!form || !(form instanceof HTMLFormElement)) return;

    const hasPassword = !!form.querySelector('input[type="password"]');
    const rawAction = form.getAttribute('action') || form.action || '';
    
    if (rawAction && rawAction.startsWith('http')) {
      try {
        const actionUrl = new URL(rawAction, window.location.href);
        const currentHost = window.location.hostname;
        
        // Check for domain mismatch
        if (actionUrl.hostname !== currentHost && !actionUrl.hostname.endsWith(`.${currentHost}`)) {
          // If the form contains password or payment tokens, this is an immediate interception
          if (hasPassword) {
            e.preventDefault();
            e.stopPropagation();

            showAmbientAlert({
              id: 'form-mismatch-blocked',
              type: 'CRITICAL_SECURITY',
              title: 'Credential Theft Intercepted',
              message: `This login form was attempting to send your password to an external domain (${actionUrl.hostname}) instead of ${currentHost}.`,
              details: `Destination: ${actionUrl.href}`,
              primaryActionLabel: 'Proceed Anyway (Unsafe)',
              onPrimaryAction: () => {
                form.submit();
              }
            });
            return false;
          }
        }
      } catch {
        // Invalid URL, continue
      }
    }
  }, true); // Use capture phase to precede any page listeners

  // ─── 2. Synthetic Countdown Timer Observer ─────────────────────────────────
  // Detects dynamic countdown clocks that manipulate consumers with fake time pressure
  observeCountdownClocks();
}

/**
 * De-obfuscates text across adjacent inline nodes.
 * Catches evasion where words are broken across spans: <span>Acc</span><span>ount</span>
 */
export function extractDeobfuscatedText(root: Element): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textChunks: string[] = [];
  let node: Node | null;
  
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
      const val = node.nodeValue?.trim();
      if (val) {
        textChunks.push(val);
      }
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ');
}

/**
 * Monitors DOM mutations specifically tracking numeric second decrements (countdown traps).
 */
function observeCountdownClocks(): void {
  const timerRegex = /\b(\d{1,2}):(\d{2}):?(\d{2})?\b/;
  const observedTimers = new WeakMap<Element, { lastVal: string; decrementCount: number }>();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target as HTMLElement;
      if (!target || !target.textContent) continue;

      const text = target.textContent.trim();
      const match = text.match(timerRegex);

      if (match && match[0].length <= 8) {
        const timeStr = match[0];
        const state = observedTimers.get(target) || { lastVal: timeStr, decrementCount: 0 };

        if (state.lastVal !== timeStr) {
          state.decrementCount++;
          state.lastVal = timeStr;
          observedTimers.set(target, state);

          // If a timer has ticked down 3 times dynamically, flag it as an active urgency mechanism
          if (state.decrementCount === 3) {
            target.setAttribute('data-vigil-urgency-timer', 'true');
            // Log or trigger ambient badge if within an e-commerce checkout context
            const isCartOrCheckout = !!document.querySelector('[class*="cart"], [class*="checkout"], [id*="cart"], [id*="checkout"], button[class*="buy"], button[class*="pay"]');
            if (isCartOrCheckout) {
              showAmbientAlert({
                id: 'coercive-timer-detected',
                type: 'DARK_PATTERN',
                title: 'Manufactured Urgency Detected',
                message: 'This page is running a dynamic countdown timer to pressure your purchasing decision. Verify if the offer or reservation is truly expiring.',
                details: `Timer element: ${timeStr}`
              });
            }
          }
        }
      }
    }
  });

  const body = document.documentElement || document.body;
  if (body) {
    observer.observe(body, {
      characterData: true,
      childList: true,
      subtree: true
    });
  }
}
