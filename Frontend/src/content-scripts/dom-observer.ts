import { VigilDOMEventBus } from '../observation/event-bus';
import { OBSERVER_DEBOUNCE_MS } from '../shared/constants';

let unsubscribe: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startObserver(scanCallback: () => void): void {
  stopObserver();
  VigilDOMEventBus.start();

  unsubscribe = VigilDOMEventBus.subscribe((events) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
      stopObserver();
      return;
    }

    let shouldScan = false;
    for (const event of events) {
      if (event.target instanceof HTMLElement && event.target.hasAttribute('data-vigil-overlay')) {
        continue;
      }
      shouldScan = true;
      break;
    }

    if (shouldScan) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        // In V4 Phase 2, this will pass semantic regions down, but for Phase 1 P0, 
        // we just throttle via the unified Event Bus
        scanCallback();
      }, OBSERVER_DEBOUNCE_MS);
    }
  });
}

export function stopObserver(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
