import { describe, it, expect } from 'vitest';
import { AsyncMutex } from './storage';

describe('Storage Concurrency & Lost-Update Verification', () => {
  it('unserialized concurrent read-modify-write causes lost updates', async () => {
    let sharedState: Record<string, number> = {};
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Simulate 50 concurrent tabs updating without mutex
    await Promise.all(
      Array.from({ length: 50 }).map(async (_, i) => {
        const domain = `tab-${i}.com`;
        // Read
        const current = { ...sharedState };
        await delay(Math.random() * 5); // Simulates async I/O gap
        // Write
        current[domain] = i;
        sharedState = current;
      })
    );

    // Because of races, sharedState will NOT have 50 keys
    expect(Object.keys(sharedState).length).toBeLessThan(50);
  });

  it('AsyncMutex guarantees zero lost updates across 50 concurrent operations', async () => {
    let sharedState: Record<string, number> = {};
    const mutex = new AsyncMutex();
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Simulate 50 concurrent tabs updating WITH mutex
    await Promise.all(
      Array.from({ length: 50 }).map(async (_, i) => {
        const domain = `tab-${i}.com`;
        await mutex.runExclusive(async () => {
          const current = { ...sharedState };
          await delay(Math.random() * 5);
          current[domain] = i;
          sharedState = current;
        });
      })
    );

    // With mutex, EXACTLY 50 keys are preserved with 0 lost updates
    expect(Object.keys(sharedState).length).toBe(50);
    for (let i = 0; i < 50; i++) {
      expect(sharedState[`tab-${i}.com`]).toBe(i);
    }
  });
});
