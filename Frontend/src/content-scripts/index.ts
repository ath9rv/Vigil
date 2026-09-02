import { getStorageValues } from '../shared/storage';
import { initScanner, scanPage } from './scanner';
import { startObserver } from './dom-observer';
import { ReactiveWebVitalsObserver } from './reactive-web-vitals';
import { initCookieConsentHandler } from './cookie-consent-handler';
import { runTrackerAnalysis } from './tracker-analysis';
import { initAdversarialObserver } from './adversarial-observer';
import './highlighter';

async function bootstrap() {
  const domain = window.location.hostname;
  const { enabled, site_denylist } = await getStorageValues(['enabled', 'site_denylist']);

  if (!enabled || site_denylist.includes(domain)) {
    return;
  }

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
        pageUrl: window.location.href
      });
    },
  });
  vitals.start();

  // 4. Cookie Consent Auto-Handler
  initCookieConsentHandler();

  // 5. Adversarial & Form Submit Observer
  initAdversarialObserver();
  
  // 6. Third-Party Tracker Analysis (runs after page loads fully)
  setTimeout(() => {
    runTrackerAnalysis();
  }, 3000);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
