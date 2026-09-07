import { describe, it, expect } from 'vitest';
import { classifyCookie, parseDocumentCookies } from './cookie-classifier';

describe('Cookie & Tracker Classification Engine', () => {
  it('should accurately classify Google Analytics cookies', () => {
    const ga = classifyCookie('_ga', 'GA1.2.123456789.1234567890', 'india.gov.in');
    expect(ga.category).toBe('ANALYTICS');
    expect(ga.provider).toContain('Google Analytics');
    expect(ga.risk).toBe('SUGGESTIVE');

    const gid = classifyCookie('_gid', 'GA1.2.987654321.0987654321', 'india.gov.in');
    expect(gid.category).toBe('ANALYTICS');
    expect(gid.provider).toContain('Google Analytics');
  });

  it('should identify high-risk advertising and tracking cookies', () => {
    const fbp = classifyCookie('_fbp', 'fb.1.123456789.987654321', 'example.com');
    expect(fbp.category).toBe('MARKETING');
    expect(fbp.risk).toBe('CONFIRMED');
    expect(fbp.provider).toContain('Facebook');

    const muid = classifyCookie('MUID', '0123456789ABCDEF', 'example.com');
    expect(muid.category).toBe('MARKETING');
    expect(muid.risk).toBe('CONFIRMED');
  });

  it('should classify essential security, bot protection, and session tokens as safe', () => {
    const cf = classifyCookie('__cf_bm', 'some_token_hash', 'india.gov.in');
    expect(cf.category).toBe('ESSENTIAL');
    expect(cf.risk).toBe('OBSERVED');
    expect(cf.provider).toContain('Cloudflare');

    const sess = classifyCookie('PHPSESSID', 'abcdef123456', 'india.gov.in');
    expect(sess.category).toBe('ESSENTIAL');
    expect(sess.risk).toBe('OBSERVED');

    const csrf = classifyCookie('csrftoken', 'xyz789token', 'india.gov.in');
    expect(csrf.category).toBe('ESSENTIAL');
  });

  it('should parse raw document.cookie string into structured detailed cookie records', () => {
    const raw = '_ga=GA1.2.111; has_js=1; PHPSESSID=session123; _fbp=fb.1.222';
    const cookies = parseDocumentCookies(raw, 'india.gov.in');

    expect(cookies.length).toBe(4);
    expect(cookies.map(c => c.name)).toEqual(['_ga', 'has_js', 'PHPSESSID', '_fbp']);
    expect(cookies.find(c => c.name === '_ga')?.category).toBe('ANALYTICS');
    expect(cookies.find(c => c.name === 'PHPSESSID')?.category).toBe('ESSENTIAL');
    expect(cookies.find(c => c.name === '_fbp')?.category).toBe('MARKETING');
  });

  it('should accurately classify Amazon cookies including csm-hit, session-id, and ubid', () => {
    const csm = classifyCookie('csm-hit', 'tb:s-12345|67890', 'www.amazon.in');
    expect(csm.category).toBe('ANALYTICS');
    expect(csm.provider).toContain('Amazon');
    expect(csm.purpose).toContain('performance');

    const sess = classifyCookie('session-id', '261-1234567-8901234', 'www.amazon.in');
    expect(sess.category).toBe('ESSENTIAL');
    expect(sess.provider).toBe('Amazon');

    const ubid = classifyCookie('ubid-acbin', '260-1234567-8901234', 'www.amazon.in');
    expect(ubid.category).toBe('FUNCTIONAL');
    expect(ubid.provider).toContain('Amazon');
  });

  it('should accurately classify YouTube and Google cookies', () => {
    const ysc = classifyCookie('YSC', 'abc123ysc', 'youtube.com');
    expect(ysc.category).toBe('ANALYTICS');
    expect(ysc.provider).toContain('YouTube');

    const visitor = classifyCookie('VISITOR_INFO1_LIVE', 'unique_vid', 'youtube.com');
    expect(visitor.category).toBe('ANALYTICS');
    expect(visitor.provider).toContain('YouTube');

    const jar = classifyCookie('1P_JAR', '2026-09-04-02', 'google.com');
    expect(jar.category).toBe('MARKETING');
    expect(jar.provider).toContain('Google');
  });

  it('should accurately classify Twitter and Meta social cookies', () => {
    const guest = classifyCookie('guest_id', 'v1%3A12345', 'twitter.com');
    expect(guest.category).toBe('MARKETING');
    expect(guest.provider).toContain('Twitter');

    const datr = classifyCookie('datr', 'hash_datr_123', 'facebook.com');
    expect(datr.category).toBe('ESSENTIAL');
    expect(datr.provider).toContain('Meta');

    const cUser = classifyCookie('c_user', '10001234567', 'facebook.com');
    expect(cUser.category).toBe('ESSENTIAL');
  });

  it('should accurately classify payment and e-commerce cookies (Stripe, Shopify)', () => {
    const stripe = classifyCookie('__stripe_mid', 'mid_hash_123', 'merchant.com');
    expect(stripe.category).toBe('ESSENTIAL');
    expect(stripe.provider).toContain('Stripe');

    const shopify = classifyCookie('_shopify_s', 'sess_hash_123', 'store.com');
    expect(shopify.category).toBe('ANALYTICS');
    expect(shopify.provider).toContain('Shopify');

    const cart = classifyCookie('cart', 'cart_token_123', 'store.com');
    expect(cart.category).toBe('ESSENTIAL');
  });

  it('should intelligently classify unseen cookies using the semantic heuristic classifier', () => {
    // Unseen telemetry cookie
    const telemetry = classifyCookie('custom_perf_ping_metric', '123', 'unknown-domain.com');
    expect(telemetry.category).toBe('ANALYTICS');

    // Unseen ad conversion cookie
    const adClick = classifyCookie('partner_ad_click_track_id', 'xyz999', 'unknown-domain.com');
    expect(adClick.category).toBe('MARKETING');
    expect(adClick.risk).toBe('CONFIRMED');

    // Unseen user display preference cookie
    const pref = classifyCookie('client_theme_dark_mode_pref', 'true', 'unknown-domain.com');
    expect(pref.category).toBe('FUNCTIONAL');
  });
});
