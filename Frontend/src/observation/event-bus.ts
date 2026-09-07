/**
 * Vigil DOM Event Bus
 * 
 * Replaces multiple scattered MutationObservers with a single, highly efficient 
 * observation pipeline. It intercepts DOM mutations, deduplicates them, 
 * identifies the semantic regions affected, and dispatches granular events 
 * to subscribed detectors (e.g. Consent, Dark Patterns, Countdown).
 */

export type VigilDOMEventType = 'NODE_ADDED' | 'SUBTREE_CHANGED' | 'TEXT_CHANGED' | 'ATTRIBUTE_CHANGED';
export type SemanticRegion = 'CONSENT' | 'CHECKOUT' | 'LOGIN' | 'GENERAL' | 'UNKNOWN';

export interface VigilDOMEvent {
  type: VigilDOMEventType;
  target: Element | Node;
  region: SemanticRegion;
  timestamp: number;
}

type EventSubscriber = (events: VigilDOMEvent[]) => void;

class VigilDOMEventBusImpl {
  private observer: MutationObserver | null = null;
  private subscribers: EventSubscriber[] = [];
  private coalesceTimeout: number | null = null;
  private pendingMutations: MutationRecord[] = [];

  public subscribe(callback: EventSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  public start(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      this.pendingMutations.push(...mutations);
      
      if (this.coalesceTimeout === null) {
        // Coalesce mutations over a short window to prevent SPA render-storms
        this.coalesceTimeout = window.setTimeout(() => this.flush(), 150);
      }
    });

    const body = document.documentElement || document.body;
    if (body) {
      this.observer.observe(body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'src']
      });
    }
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.coalesceTimeout !== null) {
      window.clearTimeout(this.coalesceTimeout);
      this.coalesceTimeout = null;
    }
    this.pendingMutations = [];
  }

  private flush(): void {
    this.coalesceTimeout = null;
    
    if (this.pendingMutations.length === 0 || this.subscribers.length === 0) return;

    // Deduplicate and normalize mutations
    const events = this.normalize(this.pendingMutations);
    this.pendingMutations = [];

    if (events.length > 0) {
      this.subscribers.forEach(sub => {
        try {
          sub(events);
        } catch (err) {
          console.error('[Vigil EventBus] Subscriber error:', err);
        }
      });
    }
  }

  private normalize(mutations: MutationRecord[]): VigilDOMEvent[] {
    const affectedNodes = new Set<Node>();
    const events: VigilDOMEvent[] = [];
    const timestamp = Date.now();

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && !affectedNodes.has(node)) {
            affectedNodes.add(node);
            events.push({
              type: 'NODE_ADDED',
              target: node,
              region: this.identifySemanticRegion(node as Element),
              timestamp
            });
          }
        });
      } else if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (!affectedNodes.has(target)) {
          affectedNodes.add(target);
          events.push({
            type: 'TEXT_CHANGED',
            target: target,
            region: target.parentElement ? this.identifySemanticRegion(target.parentElement) : 'UNKNOWN',
            timestamp
          });
        }
      } else if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (!affectedNodes.has(target)) {
          affectedNodes.add(target);
          events.push({
            type: 'ATTRIBUTE_CHANGED',
            target: target,
            region: this.identifySemanticRegion(target as Element),
            timestamp
          });
        }
      }
    }

    return events;
  }

  private identifySemanticRegion(el: Element): SemanticRegion {
    // Lightweight heuristic to group mutations by functional area without expensive queries
    const str = (el.className + ' ' + el.id).toLowerCase();
    if (str.includes('cart') || str.includes('checkout') || str.includes('buy')) return 'CHECKOUT';
    if (str.includes('consent') || str.includes('cookie') || str.includes('banner')) return 'CONSENT';
    if (str.includes('login') || str.includes('auth') || str.includes('password')) return 'LOGIN';
    if (el.tagName === 'FOOTER' || str.includes('footer')) return 'GENERAL';
    
    return 'UNKNOWN';
  }
}

export const VigilDOMEventBus = new VigilDOMEventBusImpl();
