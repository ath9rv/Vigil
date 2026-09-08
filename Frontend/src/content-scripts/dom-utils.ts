/**
 * Shared DOM traversal utilities for Vigil content scripts.
 * Hardened for Phase 2:
 * - Depth-limited Shadow DOM piercing (max 10 levels)
 * - Visited shadow roots tracking to prevent circular references
 * - Max element count bounds to protect memory during DOM storms
 * - Integrates with SubtreeCache for selective scanning
 */

const MAX_SHADOW_DEPTH = 10;
const MAX_ELEMENTS_PER_QUERY = 10000;

interface QueueItem {
  root: Document | Element | ShadowRoot;
  depth: number;
}

/**
 * Searches the DOM deeply, piercing through open Shadow DOM boundaries
 * with strict depth limits and cycle protection.
 */
export function querySelectorAllDeep(
  selector: string,
  root: Document | Element | ShadowRoot = document
): Element[] {
  const results: Element[] = [];
  const queue: QueueItem[] = [{ root, depth: 0 }];
  const visitedRoots = new WeakSet<object>();

  while (queue.length > 0 && results.length < MAX_ELEMENTS_PER_QUERY) {
    const item = queue.shift()!;
    const node = item.root;

    if (visitedRoots.has(node)) continue;
    visitedRoots.add(node);

    if ('querySelectorAll' in node) {
      try {
        const matches = node.querySelectorAll(selector);
        for (let i = 0; i < matches.length && results.length < MAX_ELEMENTS_PER_QUERY; i++) {
          results.push(matches[i]);
        }
      } catch {
        // Invalid selector syntax — safely skip this root
        continue;
      }

      // Check depth limit before queuing deeper shadow roots
      if (item.depth < MAX_SHADOW_DEPTH) {
        try {
          // 1. Check if node itself has a shadow root
          if (node instanceof Element && node.shadowRoot && !visitedRoots.has(node.shadowRoot)) {
            queue.push({ root: node.shadowRoot, depth: item.depth + 1 });
          }

          // 2. Discover custom element hosts in light DOM
          // Target custom element tags (containing hyphen) or elements with shadow roots
          const customHosts = node.querySelectorAll(':not(:defined), [data-shadow-host], *');
          for (let i = 0; i < customHosts.length; i++) {
            const sr = customHosts[i].shadowRoot;
            if (sr && !visitedRoots.has(sr)) {
              queue.push({ root: sr, depth: item.depth + 1 });
            }
          }
        } catch {
          // Cross-origin / security boundaries
        }
      }
    }
  }

  // Deduplicate
  return Array.from(new Set(results));
}

/**
 * Safe single-element deep query. Returns the first matching element
 * across the entire DOM tree including shadow roots, or null.
 */
export function querySelectorDeep(
  selector: string,
  root: Document | Element | ShadowRoot = document
): HTMLElement | null {
  const results = querySelectorAllDeep(selector, root);
  return results.length > 0 ? (results[0] as HTMLElement) : null;
}

/**
 * Safe wrapper around querySelectorAllDeep that never throws.
 * Returns an empty array on invalid selectors or errors.
 */
export function safeQuerySelectorAllDeep(
  root: Document | Element | ShadowRoot,
  sel: string
): HTMLElement[] {
  try {
    const results = querySelectorAllDeep(sel, root);
    return results.filter((e): e is HTMLElement => e instanceof HTMLElement);
  } catch {
    return [];
  }
}

/**
 * Safe single-element query with shadow root piercing.
 * Tries deep traversal first, falls back to standard querySelector.
 */
export function safeQuerySelectorDeep(
  root: Document | Element | ShadowRoot,
  sel: string
): HTMLElement | null {
  try {
    const el = querySelectorDeep(sel, root);
    if (el) return el;
  } catch {}
  // Fallback to standard query
  try {
    if ('querySelector' in root) {
      const el = (root as Element | Document).querySelector(sel);
      return el instanceof HTMLElement ? el : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Collect all button-like interactive elements within a container,
 * including those hidden inside shadow roots.
 */
export function collectButtonsDeep(root: Element | Document = document): HTMLElement[] {
  const BUTTON_SELECTORS = 'button, a[role="button"], [role="button"], input[type="button"], input[type="submit"], a.button, a.btn';
  return safeQuerySelectorAllDeep(root, BUTTON_SELECTORS);
}

/**
 * Check if an element (or any of its ancestors up to 10 levels)
 * is inside a shadow root, for diagnostic logging.
 */
export function isInsideShadowRoot(el: Element): boolean {
  let current: Element | null = el;
  for (let i = 0; i < MAX_SHADOW_DEPTH && current; i++) {
    const parent: ParentNode | null = current.parentNode;
    if (parent && parent instanceof ShadowRoot) return true;
    current = parent instanceof Element ? parent : null;
  }
  return false;
}
