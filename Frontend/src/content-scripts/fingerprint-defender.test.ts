import { describe, it, expect, beforeAll } from 'vitest';

// Prepare window & navigator mock before importing inject-defender
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = {
    hardwareConcurrency: 8,
    deviceMemory: 8,
  };
}

import './inject-defender';
const DefenderInternals = (globalThis as any).__VIGIL_DEFENDER_INTERNALS__;

describe('Vigil Defender & Anti-Fingerprinting (Real Engine Tests)', () => {
  beforeAll(() => {
    // inject-defender executes immediately on import and initializes window properties
  });

  describe('1. Active Defender Lifecycle & Idempotency Guard', () => {
    it('sets global protection active and deception policy flags', () => {
      expect((globalThis as any).__VIGIL_DEFENDER_INITIALIZED__).toBe(true);
      expect((globalThis as any).__VIGIL_PROTECTION_ACTIVE__).toBe(true);
      expect((globalThis as any).__VIGIL_DECEPTION_POLICY__).toBeDefined();
      expect((globalThis as any).__VIGIL_DECEPTION_POLICY__.canvasNoise).toBe(true);
      expect((globalThis as any).__VIGIL_DECEPTION_POLICY__.telemetryProtection).toBe(true);
    });

    it('enforces Global Privacy Control (GPC) on navigator', () => {
      expect(((globalThis as any).navigator as any).globalPrivacyControl).toBe(true);
    });
  });

  describe('2. Native Function Camouflage (Neutralizes CreepJS "Lie" Detectors)', () => {
    it('hooked toString returns "[native code]" for patched functions', () => {
      const customFn = () => 42;
      DefenderInternals.makeNative!(customFn, 'getBattery', false, 0);

      const str = Function.prototype.toString.call(customFn);
      expect(str).toBe('function getBattery() { [native code] }');
      expect(customFn.name).toBe('getBattery');
      expect(customFn.length).toBe(0);
    });

    it('handles getter function names with "get " prefix', () => {
      const getterFn = () => 8;
      DefenderInternals.makeNative!(getterFn, 'hardwareConcurrency', true, 0);

      const str = Function.prototype.toString.call(getterFn);
      expect(str).toBe('function get hardwareConcurrency() { [native code] }');
      expect(getterFn.name).toBe('get hardwareConcurrency');
    });

    it('toString itself appears as native code', () => {
      const str = Function.prototype.toString.call(Function.prototype.toString);
      expect(str).toBe('function toString() { [native code] }');
    });
  });

  describe('3. Hardware & Screen Normalization', () => {
    it('normalizes hardwareConcurrency to standard cohort values (4 or 8)', () => {
      const mockNav: any = { hardwareConcurrency: 16, deviceMemory: 32 };
      const mockScreen: any = { colorDepth: 32, pixelDepth: 32 };
      DefenderInternals.applyHardwareNormalization!(mockNav, mockScreen);
      expect([4, 8]).toContain(mockNav.hardwareConcurrency);
      expect([4, 8]).toContain(mockNav.deviceMemory);
      expect(mockScreen.colorDepth).toBe(24);
      expect(mockScreen.pixelDepth).toBe(24);
    });
  });

  describe('4. Canvas Fingerprint Probe Detection', () => {
    it('flags disconnected canvases as fingerprint probes', () => {
      const canvas: any = { isConnected: false, width: 200, height: 200, style: {} };
      expect(DefenderInternals.isFingerprintProbe!(canvas)).toBe(true);
    });

    it('flags hidden or micro-dimensioned canvases as probes', () => {
      const canvas: any = { isConnected: true, width: 16, height: 16, style: {} };
      expect(DefenderInternals.isFingerprintProbe!(canvas)).toBe(true);
    });

    it('allows normal, connected, visible canvases', () => {
      const canvas: any = {
        isConnected: true,
        width: 300,
        height: 200,
        style: { display: 'block', visibility: 'visible', opacity: '1' },
        getBoundingClientRect: () => ({ width: 300, height: 200, left: 100, top: 100 })
      };
      expect(DefenderInternals.isFingerprintProbe!(canvas)).toBe(false);
    });
  });

  describe('5. Multi-Tier Telemetry Classification & Sanitization', () => {
    it('classifies known tracking and analytics endpoints', () => {
      expect(DefenderInternals.isTelemetryEndpoint!('https://example.com/analytics/collect')).toBe(true);
      expect(DefenderInternals.isTelemetryEndpoint!('https://example.com/api/telemetry')).toBe(true);
      expect(DefenderInternals.isTelemetryEndpoint!('https://metrics.example.com/v1/event')).toBe(true);
      expect(DefenderInternals.isTelemetryEndpoint!('https://track.adnetwork.com/beacon')).toBe(true);
      expect(DefenderInternals.isTelemetryEndpoint!('https://example.com/api/user/profile')).toBe(false);
    });

    it('identifies fingerprint-specific parameter keys', () => {
      expect(DefenderInternals.isFingerprintKey!('canvas')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('fingerprint')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('fp')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('webgl')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('device_id')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('visitor_id')).toBe(true);
      expect(DefenderInternals.isFingerprintKey!('username')).toBe(false);
      expect(DefenderInternals.isFingerprintKey!('page')).toBe(false);
    });

    it('sanitizes fingerprint keys in URL query strings', () => {
      const url = 'https://analytics.com/collect?session=123&canvas=hash456&fp=fingerprint789';
      const sanitized = DefenderInternals.sanitizeUrlQuery!(url);
      expect(sanitized).toContain('session=123');
      expect(sanitized).toContain('canvas=%5BSANITIZED_BY_VIGIL%5D');
      expect(sanitized).toContain('fp=%5BSANITIZED_BY_VIGIL%5D');
    });

    it('recursively sanitizes fingerprint fields in JSON payloads', () => {
      const payload: any = {
        app: 'store',
        version: '1.0',
        fingerprint: 'abcdef123456',
        client_id: 'visitor_9999',
        nested: {
          canvas: 'raw_canvas_data_hash',
          legitimateField: 'keep_me_intact'
        }
      };

      const modified = DefenderInternals.sanitizeObject!(payload);
      expect(modified).toBe(true);
      expect(payload.fingerprint).toBe('[SANITIZED_BY_VIGIL]');
      expect(payload.client_id).toBe('[SANITIZED_BY_VIGIL]');
      expect(payload.nested.canvas).toBe('[SANITIZED_BY_VIGIL]');
      expect(payload.nested.legitimateField).toBe('keep_me_intact');
      expect(payload.app).toBe('store');
    });
  });
});
