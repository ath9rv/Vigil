// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { VigilDOMEventBus } from '../observation/event-bus';
import { querySelectorAllDeep } from '../content-scripts/dom-utils';
import { taskScheduler } from './scheduler';
import { performanceGovernor } from './governor';
import { metricsCollector } from './metrics';

describe('Vigil Phase 2: Hostile Performance Stress Fixtures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    performanceGovernor.reset();
    metricsCollector.reset();
    taskScheduler.clear();
  });

  it('absorbs a 10,000 mutation storm without thread lockup or unhandled exceptions', async () => {
    VigilDOMEventBus.start();

    const startTime = performance.now();
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Generate 10,000 rapid DOM mutations
    for (let i = 0; i < 10000; i++) {
      const p = document.createElement('p');
      p.textContent = `Storm item ${i}`;
      container.appendChild(p);
    }

    const elapsed = performance.now() - startTime;
    // Fast generation check
    expect(elapsed).toBeLessThan(1000);

    // Let coalescing flush
    await new Promise(r => setTimeout(r, 200));

    const snapshot = metricsCollector.getSnapshot();
    // Verify mutations were counted and coalesced
    expect(snapshot.mutation_callbacks_count).toBeGreaterThan(0);
    expect(snapshot.nodes_received_count).toBeGreaterThan(0);

    VigilDOMEventBus.stop();
  });

  it('traverses deep nested shadow tree (10 levels) without exceeding depth limit or stack overflow', () => {
    let currentRoot: Document | Element | ShadowRoot = document.body;

    // Construct a 10-level deep open shadow DOM hierarchy
    for (let level = 0; level < 10; level++) {
      const host = document.createElement('div');
      host.className = `shadow-host-level-${level}`;
      if (currentRoot instanceof Document) {
        document.body.appendChild(host);
      } else {
        currentRoot.appendChild(host);
      }

      // In jsdom, attachShadow creates open shadowRoot
      const sr = host.attachShadow({ mode: 'open' });
      const inner = document.createElement('span');
      inner.className = 'deep-target';
      inner.textContent = `Target at level ${level}`;
      sr.appendChild(inner);

      currentRoot = sr;
    }

    const scanStart = performance.now();
    const matches = querySelectorAllDeep('.deep-target', document.body);
    const scanDuration = performance.now() - scanStart;

    // Verified: all 10 levels pierced safely
    expect(matches.length).toBe(10);
    // Traversal latency must stay well within the 30ms budget
    expect(scanDuration).toBeLessThan(30.0);
  });

  it('handles mixed adversarial workload under PerformanceGovernor without crashing', async () => {
    // 1. Trigger severe load
    performanceGovernor.reportCycle({
      mutationsInWindow: 1200,
      windowDurationMs: 500,
      scanDurationMs: 45.0,
    });

    expect(performanceGovernor.getState()).toBe('DEGRADED');

    // 2. Schedule mixed tasks
    let p0Executed = false;
    let p1Executed = false;
    let p3Executed = false;

    await taskScheduler.schedule('P0_CRITICAL', 'security-defense', () => {
      p0Executed = true;
    });

    await taskScheduler.schedule('P1_PRIVACY', 'tracker-defense', () => {
      p1Executed = true;
    });

    if (performanceGovernor.shouldExecute('P3_ENRICHMENT')) {
      await taskScheduler.schedule('P3_ENRICHMENT', 'legal-audit', () => {
        p3Executed = true;
      });
    }

    // Critical security & privacy MUST execute
    expect(p0Executed).toBe(true);
    expect(p1Executed).toBe(true);
    // Non-critical P3 enrichment was successfully shed under DEGRADED mode
    expect(p3Executed).toBe(false);
  });
});
