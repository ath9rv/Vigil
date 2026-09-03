import { describe, expect, it } from 'vitest';
import { extractActivityCounter, isFakeCaptchaNotificationScam, isRecognizedIdentityProvider, sameSiteOrSubdomain } from './finding-quality';

describe('finding evidence gates', () => {
  it('does not confuse a normal CAPTCHA with a notification scam', () => {
    expect(isFakeCaptchaNotificationScam("Verify you are not a robot")).toBe(false);
    expect(isFakeCaptchaNotificationScam('Verify you are human. Click Allow to continue.')).toBe(true);
  });

  it('allows first-party and recognised SSO credential endpoints', () => {
    expect(sameSiteOrSubdomain('https://app.example.com', 'https://login.example.com/session')).toBe(true);
    expect(isRecognizedIdentityProvider('tenant.us.auth0.com')).toBe(true);
    expect(isRecognizedIdentityProvider('credential-stealer.example')).toBe(false);
  });

  it('extracts only an explicit live-activity counter', () => {
    expect(extractActivityCounter('18 people are viewing this')).toBe(18);
    expect(extractActivityCounter('This item is in high demand')).toBeNull();
  });
});
