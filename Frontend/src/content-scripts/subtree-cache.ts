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
   * Computes a lightweight structural fingerprint of a node and its immediate children.
   * Avoids deep string concatenation; focuses on element identity, class, tag, and text length.
   */
  public computeFingerprint(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return `T:${node.textContent?.length || 0}:${node.textContent?.slice(0, 16) || ''}`;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const childCount = el.childNodes.length;
      const className = el.className && typeof el.className === 'string' ? el.className.slice(0, 32) : '';
      const id = el.id ? `#${el.id}` : '';
      const textSample = (el.textContent || '').slice(0, 32);
      return `E:${el.tagName}:${id}:${className}:${childCount}:${textSample}`;
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
