/**
 * Vigil Subtree & Node Fingerprint Cache
 *
 * Prevents redundant DOM scans by maintaining a WeakMap of analyzed nodes.
 * When a mutation occurs, only subtrees whose structural fingerprint has changed
 * are scheduled for analysis.
 */

export interface NodeAnalysisRecord {
  fingerprint: string;
  lastAnalyzed: number;
  detectorsRun: Set<string>;
  childCount: number;
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

const SENSITIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const SENSITIVE_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);
const SENSITIVE_AUTOCOMPLETE = new Set([
  'cc-number', 'cc-csc', 'cc-exp', 'cc-type',
  'new-password', 'current-password', 'one-time-code'
]);
const SENSITIVE_PATTERNS = /password|secret|credit|card|cvv|token|auth/i;

export function isSensitiveNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement ? isSensitiveNode(node.parentElement) : false;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (SENSITIVE_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable || el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') return true;
    const role = el.getAttribute('role');
    if (role && SENSITIVE_ROLES.has(role)) return true;
    const autocomplete = el.getAttribute('autocomplete');
    if (autocomplete && SENSITIVE_AUTOCOMPLETE.has(autocomplete.toLowerCase())) return true;
    const type = el.getAttribute('type');
    if (type === 'password') return true;
    const name = el.getAttribute('name');
    if (name && SENSITIVE_PATTERNS.test(name)) return true;
    const id = el.id;
    if (id && SENSITIVE_PATTERNS.test(id)) return true;
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && SENSITIVE_PATTERNS.test(ariaLabel)) return true;
  }
  return false;
}

export class SubtreeCache {
  private static instance: SubtreeCache | null = null;

  // WeakMap prevents memory leaks when nodes are detached from the DOM
  private cache = new WeakMap<Node, NodeAnalysisRecord>();

  public static getInstance(): SubtreeCache {
    if (!SubtreeCache.instance) {
      SubtreeCache.instance = new SubtreeCache();
    }
    return SubtreeCache.instance;
  }

  /**
   * Computes a lightweight, privacy-preserving structural fingerprint of a node.
   * Avoids storing raw text strings; uses 32-bit one-way hashes and redacts sensitive inputs.
   */
  public computeFingerprint(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      if (isSensitiveNode(node)) {
        return 'T:REDACTED';
      }
      const text = (node.textContent || '').trim().slice(0, 64);
      return `T:${text.length}:${djb2Hash(text)}`;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const childCount = el.childNodes.length;
      const className = el.className && typeof el.className === 'string' ? el.className.slice(0, 32) : '';
      const id = el.id ? `#${el.id}` : '';
      let textHash = 'REDACTED';
      if (!isSensitiveNode(el)) {
        const text = (el.textContent || '').trim().slice(0, 64);
        textHash = text.length > 0 ? djb2Hash(text).toString() : '0';
      }
      return `E:${el.tagName}:${id}:${className}:${childCount}:${textHash}`;
    }

    return `N:${node.nodeType}`;
  }

  /**
   * Determines if a node needs re-analysis for a given detector.
   * Returns true if never analyzed or if the structural fingerprint has changed.
   */
  public shouldAnalyze(node: Node, detectorId: string, ttlMs: number = 2000): boolean {
    const currentFingerprint = this.computeFingerprint(node);
    const record = this.cache.get(node);

    if (!record) {
      return true; // Never analyzed
    }

    if (record.fingerprint !== currentFingerprint) {
      return true; // Node structure or content changed
    }

    if (!record.detectorsRun.has(detectorId)) {
      return true; // This specific detector hasn't evaluated this node
    }

    // If analyzed recently and fingerprint unchanged, skip
    const elapsed = Date.now() - record.lastAnalyzed;
    return elapsed > ttlMs;
  }

  /**
   * Marks a node as analyzed by a specific detector with its current fingerprint.
   */
  public markAnalyzed(node: Node, detectorId: string): void {
    const currentFingerprint = this.computeFingerprint(node);
    const existing = this.cache.get(node);

    if (existing) {
      existing.fingerprint = currentFingerprint;
      existing.lastAnalyzed = Date.now();
      existing.detectorsRun.add(detectorId);
      existing.childCount = node.childNodes.length;
    } else {
      this.cache.set(node, {
        fingerprint: currentFingerprint,
        lastAnalyzed: Date.now(),
        detectorsRun: new Set([detectorId]),
        childCount: node.childNodes.length,
      });
    }
  }

  /**
   * Clears analysis state for a node (e.g. after direct mutation).
   */
  public invalidate(node: Node): void {
    this.cache.delete(node);
  }
}

export const subtreeCache = SubtreeCache.getInstance();
