import { describe, it, expect } from 'vitest';
import { classifyCookie, parseDocumentCookies } from './cookie-classifier';

describe('Cookie & Tracker Classification Engine', () => {
  it('should accurately classify Google Analytics cookies', () => {
    const ga = classifyCookie('_ga', 'GA1.2.123456789.1234567890', 'india.gov.in');
    expect(ga.category).toBe('ANALYTICS');
    expect(ga.provider).toContain('Google Analytics');
    expect(ga.risk).toBe('MEDIUM');

    const gid = classifyCookie('_gid', 'GA1.2.987654321.0987654321', 'india.gov.in');
    expect(gid.category).toBe('ANALYTICS');
    expect(gid.provider).toContain('Google Analytics');
  });

  it('should identify high-risk advertising and tracking cookies', () => {
    const fbp = classifyCookie('_fbp', 'fb.1.123456789.987654321', 'example.com');
    expect(fbp.category).toBe('MARKETING');
    expect(fbp.risk).toBe('HIGH');
    expect(fbp.provider).toContain('Facebook');

    const muid = classifyCookie('MUID', '0123456789ABCDEF', 'example.com');
    expect(muid.category).toBe('MARKETING');
    expect(muid.risk).toBe('HIGH');
  });

  it('should classify essential security, bot protection, and session tokens as safe', () => {
    const cf = classifyCookie('__cf_bm', 'some_token_hash', 'india.gov.in');
    expect(cf.category).toBe('ESSENTIAL');
    expect(cf.risk).toBe('LOW');
    expect(cf.provider).toContain('Cloudflare');

    const sess = classifyCookie('PHPSESSID', 'abcdef123456', 'india.gov.in');
    expect(sess.category).toBe('ESSENTIAL');
    expect(sess.risk).toBe('LOW');

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
});
