import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTosDrService, getTosDrConsent, setTosDrConsent } from './tosdr-client';

describe('ToS;DR Privacy Five-Fold Behavioral Test Suite (Gate 2 Enforcement)', () => {
  let storageMock: Record<string, any> = {};

  beforeEach(() => {
    storageMock = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string | null) => {
            if (key === null) return storageMock;
            if (typeof key === 'string') return { [key]: storageMock[key] };
            return {};
          }),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(storageMock, obj);
          })
        }
      }
    };
    (globalThis as any).fetch = vi.fn();
  });

  it('TEST-TOSDR-01: Background Navigation without consent makes zero external requests', async () => {
    const result = await fetchTosDrService('example.com');
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('TEST-TOSDR-02: User declines consent -> zero external requests made', async () => {
    await setTosDrConsent('example.com', false);
    const result = await fetchTosDrService('example.com');
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('TEST-TOSDR-03: User grants consent -> exactly one intended query dispatched', async () => {
    await setTosDrConsent('example.com', true);

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parameters: {
          id: 101,
          name: 'Example Service',
          slug: 'example',
          rated: true,
          rating: 'B',
          points: [],
          urls: ['example.com']
        }
      })
    });

    const result = await fetchTosDrService('example.com');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Example Service');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('https://api.tosdr.org/service/v1/?url=example.com');
  });

  it('TEST-TOSDR-04: Consent query returns null when network fails or service returns error', async () => {
    await setTosDrConsent('error-site.com', true);
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const result = await fetchTosDrService('error-site.com');
    expect(result).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('TEST-TOSDR-05: Subsequent navigation/reload uses local cache with zero external queries', async () => {
    // Pre-populate cache
    storageMock['tosdr_example.com'] = {
      data: {
        id: 101,
        name: 'Cached Service',
        points: []
      },
      timestamp: Date.now()
    };
    await setTosDrConsent('example.com', true);

    const result = await fetchTosDrService('example.com');
    expect(result?.name).toBe('Cached Service');
    // Fetch should NOT be called because cache is valid
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
