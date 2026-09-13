import { getStorageValues } from '../shared/storage';
import { initScanner, scanPage } from './scanner';
import { startObserver } from './dom-observer';
import { ReactiveWebVitalsObserver } from './reactive-web-vitals';
import { initCookieConsentHandler } from './cookie-consent-handler';
import { runTrackerAnalysis } from './tracker-analysis';
import { initAdversarialObserver } from './adversarial-observer';
import { initUrgencyNeutralizer } from './urgency-neutralizer';
import './highlighter';
import './ambient-shield';

async function bootstrap() {
  const domain = window.location.hostname;
  const { enabled, site_denylist } = await getStorageValues(['enabled', 'site_denylist']);

  if (!enabled || site_denylist.includes(domain)) {
    return;
  }

  chrome.runtime.sendMessage({
    type: 'NAVIGATION_STARTED',
    context: {
      tabId: 0,
      navigationId: window.location.href,
      origin: window.location.origin,
      hostname: window.location.hostname,
      startedAt: Date.now()
    }
  }).catch(() => {});

  // 1. Static/DOM Scanner
  initScanner();

  // 2. DOM Mutation Trigger
  startObserver(() => scanPage());

  // 3. Reactive Web Vitals (Pillar 2/3)
  const vitals = new ReactiveWebVitalsObserver({
    shiftThreshold: 0.08,
    burstThreshold: 0.20,
    onSuspiciousShift(signal) {
      chrome.runtime.sendMessage({
        type: 'VIGIL_LAYOUT_SHIFT',
        payload: {
          value: signal.value,
          sources: signal.sources.map((source) => ({
            selector: source.selector,
            movement: source.movement,
          })),
        },
        context: {
          tabId: 0,
          navigationId: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          startedAt: Date.now()
        }
      });
    },
  });
  vitals.start();

  // 4. Cookie Consent Auto-Handler
  initCookieConsentHandler();

  // 5. Adversarial & Form Submit Observer
  initAdversarialObserver();

  // 6. Urgency Neutralization (Active countdown/scarcity freeze)
  initUrgencyNeutralizer();

  // 7. Third-Party Tracker Analysis (runs after page loads fully)
  setTimeout(() => {
    runTrackerAnalysis();
  }, 3000);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
