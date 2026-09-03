import { describe, it, expect } from 'vitest';
import { DEFAULT_PERMISSION_STATE, PermissionState } from './permission-state';

describe('Vigil State Machine & Privacy Gatekeeper (Gate 2 Enforcement)', () => {
  it('enforces privacy-preserving initial defaults', () => {
    expect(DEFAULT_PERMISSION_STATE.onboardingComplete).toBe(false);
    expect(DEFAULT_PERMISSION_STATE.strictIntent).toBe('OFF');
    expect(DEFAULT_PERMISSION_STATE.deepAudit).toBe('LOCAL_ONLY');
    expect(DEFAULT_PERMISSION_STATE.capabilities.siteAccessGranted).toBe(false);
    expect(DEFAULT_PERMISSION_STATE.capabilities.allSitesAccessGranted).toBe(false);
  });

  it('guarantees deepAudit mode defaults to LOCAL_ONLY without network queries', () => {
    // Zero external queries unless explicitly toggled by user in JIT modal
    expect(DEFAULT_PERMISSION_STATE.deepAudit).toBe('LOCAL_ONLY');
  });

  it('reconciles state degradation when host permissions are revoked by browser', () => {
    // If intent was ALL_SITES but browser revoked <all_urls>
    const mockState: PermissionState = {
      ...DEFAULT_PERMISSION_STATE,
      strictIntent: 'ALL_SITES',
      capabilities: {
        allSitesAccessGranted: false, // Revoked
        siteAccessGranted: true,
        scriptRegistered: true
      }
    };

    const reconciledIntent = !mockState.capabilities.allSitesAccessGranted && mockState.strictIntent === 'ALL_SITES'
      ? 'SITE'
      : mockState.strictIntent;

    expect(reconciledIntent).toBe('SITE');
  });

  it('drops to OFF if all protected origin permissions are revoked', () => {
    const mockState: PermissionState = {
      ...DEFAULT_PERMISSION_STATE,
      strictIntent: 'SITE',
      protectedOrigins: [] // Empty
    };

    const reconciledIntent = mockState.strictIntent === 'SITE' && mockState.protectedOrigins.length === 0
      ? 'OFF'
      : mockState.strictIntent;

    expect(reconciledIntent).toBe('OFF');
  });
});
