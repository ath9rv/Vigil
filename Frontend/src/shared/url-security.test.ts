import { describe, it, expect } from 'vitest';
import { validateSafeExternalUrl } from './url-security';

describe('Vigil URL Security & SSRF Protection Subsystem', () => {
  describe('Protocol Enforcement', () => {
    it('allows valid HTTPS protocol', () => {
      expect(validateSafeExternalUrl('https://example.com/terms').valid).toBe(true);
      expect(validateSafeExternalUrl('https://policies.google.com/privacy').valid).toBe(true);
    });

    it('rejects HTTP protocol', () => {
      const res = validateSafeExternalUrl('http://example.com/terms');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Disallowed protocol');
    });

    it('rejects dangerous protocols (file, javascript, data, ftp)', () => {
      expect(validateSafeExternalUrl('file:///etc/passwd').valid).toBe(false);
      expect(validateSafeExternalUrl('javascript:alert(1)').valid).toBe(false);
      expect(validateSafeExternalUrl('data:text/html,<h1>Pwn</h1>').valid).toBe(false);
      expect(validateSafeExternalUrl('ftp://example.com/file').valid).toBe(false);
    });
  });

  describe('Localhost & Internal Hostnames', () => {
    it('rejects localhost and pseudo-domains', () => {
      expect(validateSafeExternalUrl('https://localhost/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://test.localhost/api').valid).toBe(false);
      expect(validateSafeExternalUrl('https://router.local/config').valid).toBe(false);
      expect(validateSafeExternalUrl('https://server.internal/keys').valid).toBe(false);
    });

    it('rejects single-label hostnames', () => {
      expect(validateSafeExternalUrl('https://intranet/terms').valid).toBe(false);
      expect(validateSafeExternalUrl('https://corp/policy').valid).toBe(false);
    });
  });

  describe('IPv4 Private & Loopback Addresses (RFC 1918 / RFC 3927)', () => {
    it('rejects 127.0.0.0/8 loopback', () => {
      expect(validateSafeExternalUrl('https://127.0.0.1/admin').valid).toBe(false);
      expect(validateSafeExternalUrl('https://127.1.2.3/secret').valid).toBe(false);
    });

    it('rejects 10.0.0.0/8 private network', () => {
      expect(validateSafeExternalUrl('https://10.0.0.1/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://10.254.254.254/').valid).toBe(false);
    });

    it('rejects 172.16.0.0/12 private network', () => {
      expect(validateSafeExternalUrl('https://172.16.0.1/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://172.24.1.1/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://172.31.255.255/').valid).toBe(false);
    });

    it('rejects 192.168.0.0/16 private network', () => {
      expect(validateSafeExternalUrl('https://192.168.1.1/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://192.168.0.254/').valid).toBe(false);
    });

    it('rejects 169.254.0.0/16 Link-Local / Cloud Metadata (AWS/GCP/Azure)', () => {
      const res = validateSafeExternalUrl('https://169.254.169.254/latest/meta-data/');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Link-local / Cloud Metadata');
    });

    it('rejects 0.0.0.0 and multicast/reserved', () => {
      expect(validateSafeExternalUrl('https://0.0.0.0/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://224.0.0.1/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://240.0.0.1/').valid).toBe(false);
    });
  });

  describe('IPv6 Address Validation', () => {
    it('rejects IPv6 loopback (::1)', () => {
      expect(validateSafeExternalUrl('https://[::1]/').valid).toBe(false);
    });

    it('rejects IPv6 link-local (fe80::/10)', () => {
      expect(validateSafeExternalUrl('https://[fe80::1]/').valid).toBe(false);
    });

    it('rejects IPv6 unique-local (fc00::/7)', () => {
      expect(validateSafeExternalUrl('https://[fc00::1]/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://[fd12:3456:789a::1]/').valid).toBe(false);
    });

    it('rejects IPv4-mapped IPv6 (::ffff:127.0.0.1)', () => {
      expect(validateSafeExternalUrl('https://[::ffff:127.0.0.1]/').valid).toBe(false);
    });
  });

  describe('IP Obfuscation & Evasion Techniques', () => {
    it('rejects integer/decimal IP addresses (e.g. 2130706433)', () => {
      expect(validateSafeExternalUrl('https://2130706433/').valid).toBe(false);
    });
  });

  describe('Port Restrictions', () => {
    it('allows standard HTTPS port 443 or omitted port', () => {
      expect(validateSafeExternalUrl('https://example.com:443/terms').valid).toBe(true);
      expect(validateSafeExternalUrl('https://example.com/terms').valid).toBe(true);
    });

    it('rejects non-standard ports (e.g. 8080, 8443, 22, 3000)', () => {
      expect(validateSafeExternalUrl('https://example.com:8080/').valid).toBe(false);
      expect(validateSafeExternalUrl('https://example.com:3000/').valid).toBe(false);
    });
  });
});
