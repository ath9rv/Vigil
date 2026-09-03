import { describe, it, expect } from 'vitest';
import { CANCELLATION_URLS } from '../shared/constants';

describe('Subscription Trap Defeater & 1-Click Cancellation Engine', () => {
  it('maintains verified direct cancellation URLs for high-friction subscription services', () => {
    const requiredServices = [
      'netflix.com',
      'amazon.com',
      'amazon.in',
      'spotify.com',
      'adobe.com',
      'nytimes.com',
      'discord.com',
      'linkedin.com'
    ];

    for (const service of requiredServices) {
      expect(CANCELLATION_URLS).toHaveProperty(service);
      const url = CANCELLATION_URLS[service];
      expect(url.startsWith('https://')).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it('provides country-specific cancellation paths for Amazon India and Global', () => {
    expect(CANCELLATION_URLS['amazon.in']).toBe('https://www.amazon.in/mc');
    expect(CANCELLATION_URLS['amazon.com']).toBe('https://www.amazon.com/mc');
  });

  it('bypasses dark pattern cancellation mazes directly to account management endpoints', () => {
    const spotifyUrl = CANCELLATION_URLS['spotify.com'];
    expect(spotifyUrl).toContain('/cancel');

    const adobeUrl = CANCELLATION_URLS['adobe.com'];
    expect(adobeUrl).toContain('/plans');
  });
});
