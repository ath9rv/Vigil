import { OBSERVER_DEBOUNCE_MS } from '../shared/constants';

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startObserver(scanCallback: () => void): void {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
      stopObserver();
      return;
    }

    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLElement && mutation.target.hasAttribute('data-vigil-overlay')) {
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
        scanCallback();
      }, OBSERVER_DEBOUNCE_MS);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'src']
  });
}

export function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
