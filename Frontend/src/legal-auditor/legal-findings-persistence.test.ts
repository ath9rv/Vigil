import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Finding } from '../shared/types';
import { atomicUpdateStorage } from '../shared/storage';

describe('Legal Findings Persistence & Cache Integrity', () => {
  let storageMock: Record<string, any> = {};

  beforeEach(() => {
    storageMock = {
      findings_cache: {},
      legal_findings_cache: {}
    };

    (globalThis as any).chrome = {
      runtime: {
        id: 'vigil-test-extension'
      },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | null) => {
            if (keys === null) return storageMock;
            if (typeof keys === 'string') return { [keys]: storageMock[keys] };
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              for (const k of keys) res[k] = storageMock[k];
              return res;
            }
            return storageMock;
          }),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(storageMock, obj);
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageMock[k];
          })
        }
      }
    };
  });

  const createDummyFinding = (id: string, category: 'LEGAL' | 'DARK_PATTERN'): Finding => ({
    id,
    ruleId: category === 'LEGAL' ? 'LEGAL-ARBITRATION' : 'M1-COUNTDOWN',
    ruleName: category === 'LEGAL' ? 'Arbitration' : 'Urgency',
    module: category === 'LEGAL' ? 'M3' : 'M1',
    category,
    severity: 'CONFIRMED',
    confidenceState: 'CONFIRMED',
    reviewStatus: 'CONFIRMED',
    statuteRef: 'CCPA § 1798.100',
    explanation: 'Test finding explanation',
    interpretation: 'Test interpretation',
    elementSelector: 'body',
    pageUrl: 'https://example.com',
    detectedAt: new Date().toISOString(),
    context: {
      scan: {
        tabId: 1,
        navigationId: 'nav-1',
        origin: 'https://example.com',
        hostname: 'example.com',
        startedAt: Date.now()
      },
      coverage: {
        dom: true,
        cookies: false,
        network: false,
        storage: false,
        crossSite: false,
        threatIntel: false,
        dynamicEvents: false
      }
    }
  });

  it('preserves existing legal findings when DOM scanner updates findings_cache', async () => {
    const domain = 'example.com';
    const initialLegalFinding = createDummyFinding('legal-1', 'LEGAL');

    // Store initial legal finding
    storageMock.findings_cache[domain] = [initialLegalFinding];
    storageMock.legal_findings_cache[domain] = [initialLegalFinding];

    // Simulate DOM scanner finishing a scan with only DOM findings
    const domFinding = createDummyFinding('dom-1', 'DARK_PATTERN');
    const allFindings = [domFinding];

    // Update findings_cache using atomic update logic
    await atomicUpdateStorage('findings_cache', (cache) => {
      const existingLegal = (cache[domain] || []).filter((f: Finding) => f.category === 'LEGAL');
      return {
        ...cache,
        [domain]: [...allFindings.filter((f: Finding) => f.category !== 'LEGAL'), ...existingLegal]
      };
    });

    const updated = storageMock.findings_cache[domain];
    expect(updated).toHaveLength(2);
    expect(updated.some((f: Finding) => f.id === 'legal-1')).toBe(true);
    expect(updated.some((f: Finding) => f.id === 'dom-1')).toBe(true);
  });

  it('keeps legal findings intact when DOM findings change or are cleared', async () => {
    const domain = 'store.test';
    const legalFinding = createDummyFinding('legal-2', 'LEGAL');

    storageMock.findings_cache[domain] = [legalFinding];

    // Simulate clean page DOM scan (0 DOM findings)
    await atomicUpdateStorage('findings_cache', (cache) => {
      const existingLegal = (cache[domain] || []).filter((f: Finding) => f.category === 'LEGAL');
      return {
        ...cache,
        [domain]: [...existingLegal]
      };
    });

    expect(storageMock.findings_cache[domain]).toHaveLength(1);
    expect(storageMock.findings_cache[domain][0].id).toBe('legal-2');
  });
});
