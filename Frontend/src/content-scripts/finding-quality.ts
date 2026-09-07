/**
 * Evidence gates used by the DOM scanner.  These are intentionally
 * conservative: a browser extension can observe a page, but it cannot infer
 * a publisher's intent or prove what a visitor saw before this page load.
 */

const IDENTITY_PROVIDER_HOSTS = [
  'accounts.google.com', 'login.microsoftonline.com', 'login.live.com',
  'appleid.apple.com', 'github.com', 'auth0.com', 'okta.com', 'onelogin.com'
];

function hostname(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

import { isSameSite } from '../shared/domain-intelligence';

export function sameSiteOrSubdomain(first: string, second: string): boolean {
  const a = hostname(first) || first.toLowerCase();
  const b = hostname(second) || second.toLowerCase();
  return isSameSite(a, b);
}

export function isRecognizedIdentityProvider(host: string): boolean {
  const normalized = host.toLowerCase();
  return IDENTITY_PROVIDER_HOSTS.some(provider => isSameSite(normalized, provider));
}

/** A real CAPTCHA is not a scam. Scam pages typically pair CAPTCHA copy with
 * instructions to grant notifications or execute a browser/terminal command. */
export function isFakeCaptchaNotificationScam(text: string): boolean {
  const hasCaptchaCopy = /verify you are (human|not a robot)|i'?m not a robot/i.test(text);
  const hasDangerousInstruction = /click (allow|permit) (to continue|to verify|when prompted)|allow notifications?|press (windows|win)\s*\+\s*r|press ctrl\s*\+\s*(v|r)|paste (this|the) command/i.test(text);
  return hasCaptchaCopy && hasDangerousInstruction;
}

/** A visually quiet decline button is meaningful only relative to an obvious
 * accept button in the same dialog/banner. */
export function isVisuallySuppressedComparedToAccept(
  decline: Element,
  candidates: Element[],
  getStyle: (element: Element) => CSSStyleDeclaration = window.getComputedStyle
): boolean {
  const accept = candidates.find(candidate =>
    /^(accept|accept all|allow|agree|continue|yes)$/i.test((candidate.textContent || '').trim())
  );
  if (!accept) return false;

  const declineStyle = getStyle(decline);
  const acceptStyle = getStyle(accept);
  const declineOpacity = Number.parseFloat(declineStyle.opacity || '1');
  const acceptOpacity = Number.parseFloat(acceptStyle.opacity || '1');
  const declineFont = Number.parseFloat(declineStyle.fontSize || '0');
  const acceptFont = Number.parseFloat(acceptStyle.fontSize || '0');
  const declineRect = decline.getBoundingClientRect();
  const acceptRect = accept.getBoundingClientRect();

  return declineOpacity < Math.min(0.55, acceptOpacity * 0.7)
    || (acceptFont > 0 && declineFont > 0 && declineFont / acceptFont < 0.8)
    || (acceptRect.width > 0 && declineRect.width / acceptRect.width < 0.55);
}

export function hasCommerceContext(element: Element): boolean {
  const context = [element.textContent || '', document.body.textContent || ''].join(' ').toLowerCase();
  const hasPurchaseControl = Array.from(document.querySelectorAll('button, input[type="submit"], a'))
    .some(control => /add to (cart|bag)|buy now|checkout|place order|book now/i.test(control.textContent || (control as HTMLInputElement).value || ''));
  return hasPurchaseControl && /(?:₹|\$|€|£|\b(?:price|sale|offer|discount|checkout|order)\b)/i.test(context);
}

export function extractActivityCounter(text: string): number | null {
  const match = text.match(/\b(\d{1,6})\s+(?:people|others)\s+(?:are\s+)?(?:looking|viewing|watching)|\b(\d{1,6})\s+booked\b/i);
  return match ? Number(match[1] || match[2]) : null;
}
