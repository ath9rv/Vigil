// Custom types to handle LayoutShift PerformanceEntries
export interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources: Array<{
    node?: Node;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  }>;
}

export interface LayoutShiftSignal {
  timestamp: number;
  value: number;
  hadRecentInput: boolean;
  sources: Array<{
    selector: string;
    previous: DOMRectReadOnly;
    current: DOMRectReadOnly;
    movement: number;
  }>;
}

export interface WebVitalsConfig {
  shiftThreshold?: number;
  burstWindowMs?: number;
  burstThreshold?: number;
  onSuspiciousShift?: (signal: LayoutShiftSignal) => void;
}

const DEFAULTS: Required<WebVitalsConfig> = {
  shiftThreshold: 0.08,
  burstWindowMs: 1000,
  burstThreshold: 0.20,
  onSuspiciousShift: () => {},
};

function elementSelector(node: Node | null | undefined): string {
  if (!(node instanceof Element)) {
    return "unknown";
  }

  const tag = node.tagName.toLowerCase();

  if (node.id) {
    return `${tag}#${CSS.escape(node.id)}`;
  }

  const classes = Array.from(node.classList)
    .slice(0, 3)
    .map((c) => CSS.escape(c))
    .join(".");

  return classes ? `${tag}.${classes}` : tag;
}

function rectMovement(
  previous: DOMRectReadOnly,
  current: DOMRectReadOnly
): number {
  const dx = current.left - previous.left;
  const dy = current.top - previous.top;

  return Math.sqrt(dx * dx + dy * dy);
}

export class ReactiveWebVitalsObserver {
  private observer: PerformanceObserver | null = null;
  private cumulativeShift = 0;
  private windowStart = performance.now();
  private config: Required<WebVitalsConfig>;

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      ...DEFAULTS,
      ...config,
    };
  }

  start(): void {
    if (!("PerformanceObserver" in window)) {
      return;
    }

    if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      return;
    }

    this.observer = new PerformanceObserver((list) => {
      this.handleEntries(list.getEntries());
    });

    try {
      this.observer.observe({
        type: "layout-shift",
        buffered: true,
      });
      console.log("🛡️ Vigil V2: Reactive Web Vitals Observer started.");
    } catch (e) {
      console.warn("Vigil: Failed to start PerformanceObserver", e);
    }
  }

  private handleEntries(entries: PerformanceEntry[]): void {
    const now = performance.now();

    if (now - this.windowStart > this.config.burstWindowMs) {
      this.cumulativeShift = 0;
      this.windowStart = now;
    }

    for (const entry of entries) {
      const shift = entry as LayoutShift;

      // Ignore shifts associated with direct user input.
      if (shift.hadRecentInput) {
        continue;
      }

      this.cumulativeShift += shift.value;

      const signal: LayoutShiftSignal = {
        timestamp: performance.now(),
        value: shift.value,
        hadRecentInput: shift.hadRecentInput,
        sources: [],
      };

      for (const source of shift.sources ?? []) {
        signal.sources.push({
          selector: elementSelector(source.node),
          previous: source.previousRect,
          current: source.currentRect,
          movement: rectMovement(source.previousRect, source.currentRect),
        });
      }

      // If the shift is large or the burst crosses threshold, trigger correlator
      if (shift.value >= this.config.shiftThreshold || this.cumulativeShift >= this.config.burstThreshold) {
        this.config.onSuspiciousShift(signal);
      }
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
