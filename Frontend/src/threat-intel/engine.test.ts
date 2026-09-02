import { describe, it, expect } from 'vitest';
import { evaluateUrlThreat } from './engine';

describe('Local Threat Intelligence Engine Verification (Zero External Egress)', () => {
  it('detects typosquatting domain impersonation with distance 1', async () => {
    const match = await evaluateUrlThreat('https://paypa1.com/signin');
    expect(match.status).toBe('KNOWN_PHISHING');
    expect(match.source).toBe('LOCAL_HEURISTIC');
    expect(match.confidence).toBe('HIGH');
    expect(match.details).toContain('Typosquatting');
  });

  it('detects Punycode / IDN homograph attack domains', async () => {
    const match = await evaluateUrlThreat('https://xn--pple-43d.com/auth');
    expect(match.status).toBe('KNOWN_PHISHING');
    expect(match.source).toBe('LOCAL_HEURISTIC');
    expect(match.details).toContain('Punycode / IDN homograph');
  });

  it('detects credential harvesting keyword combinations on unknown domains', async () => {
    const match = await evaluateUrlThreat('https://update-billing-secure.xyz/portal');
    expect(match.status).toBe('KNOWN_PHISHING');
    expect(match.confidence).toBe('MEDIUM');
    expect(match.details).toContain('credential harvesting');
  });

  it('passes known authentic domains as clean', async () => {
    const match = await evaluateUrlThreat('https://paypal.com/myaccount');
    expect(match.status).toBe('NO_KNOWN_THREAT');
    expect(match.confidence).toBe('HIGH');
    expect(match.details).toContain('Verified clean');
  });

  it('gracefully handles malformed URLs without throwing exceptions', async () => {
    const match = await evaluateUrlThreat('not-a-valid-url');
    expect(match.status).toBe('UNKNOWN');
    expect(match.details).toContain('Malformed URL');
  });
});
