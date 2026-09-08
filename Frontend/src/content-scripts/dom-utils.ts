/**
 * Shared DOM traversal utilities for Vigil content scripts.
 * Provides Shadow DOM-piercing query functions used by the scanner,
 * cookie consent handler, and urgency neutralizer.
 */

/**
 * Searches the DOM deeply, piercing through open Shadow DOM boundaries.
 * Standard querySelectorAll cannot see inside Web Components. This ensures
 * no dark patterns or cookie banners can hide inside shadow roots.
 */
export function querySelectorAllDeep(
  selector: string,
  root: Document | Element | ShadowRoot = document
): Element[] {
  const results: Element[] = [];
  const queue: (Document | Element | ShadowRoot)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if ('querySelectorAll' in node) {
      try {
        results.push(...Array.from(node.querySelectorAll(selector)));
      } catch {
        // Invalid selector syntax — safely skip this root
        continue;
      }

      // Recurse into open shadow roots. Two sources:
      // 1. The node's OWN shadow root (the root element can itself be a
      //    web component host — e.g. collectButtonsDeep(hostElement)).
      // 2. Shadow roots of any descendants found via the wildcard scan.
      try {
        if (node instanceof Element && node.shadowRoot) {
          queue.push(node.shadowRoot);
        }
        const allElements = node.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          const sr = allElements[i].shadowRoot;
          if (sr) {
            queue.push(sr);
          }
        }
      } catch {}
    }
  }

  // Deduplicate (an element can appear in both light DOM and shadow DOM if re-projected)
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
  for (let i = 0; i < 10 && current; i++) {
    const parent: ParentNode | null = current.parentNode;
    if (parent && parent instanceof ShadowRoot) return true;
    current = parent instanceof Element ? parent : null;
  }
  return false;
}
