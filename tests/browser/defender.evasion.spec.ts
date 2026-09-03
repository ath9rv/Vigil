import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Tracker Endpoint Evasion Resistance (Phase 4)', () => {
  test('Catches nested and case-varied fingerprint tokens on opaque endpoints', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(async () => {
      // 1. Opaque endpoint (does NOT contain obvious "analytics/telemetry" in path)
      // but payload contains explicit fingerprint keys
      const opaqueRes = await fetch('http://localhost:8080/api/v2/sync?action=heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_version: '1.2.0',
          session_token: 'sess_valid_token',
          nested_profile: {
            hardware: {
              fingerprint: 'deeply_nested_fp_hash_value',
              canvas: 'nested_canvas_digest_999'
            }
          }
        })
      });
      const opaqueData = await opaqueRes.json();

      // 2. Mixed casing evasion (e.g. "FingerPrint", "DEVICE_ID")
      const mixedCaseRes = await fetch('http://localhost:8080/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FingerPrint: 'mixed_case_hash_11111',
          DEVICE_ID: 'mixed_case_device_22222',
          normal_key: 'preserved'
        })
      });
      const mixedCaseData = await mixedCaseRes.json();

      return { opaqueData, mixedCaseData };
    });

    // Verify nested payload sanitization
    const nestedBody = JSON.parse(result.opaqueData.body);
    expect(nestedBody.nested_profile.hardware.fingerprint).toBe('[SANITIZED_BY_VIGIL]');
    expect(nestedBody.nested_profile.hardware.canvas).toBe('[SANITIZED_BY_VIGIL]');
    expect(nestedBody.session_token).toBe('sess_valid_token'); // Legitimate session token preserved!

    // Verify mixed casing sanitization
    const mixedBody = JSON.parse(result.mixedCaseData.body);
    expect(mixedBody.FingerPrint).toBe('[SANITIZED_BY_VIGIL]');
    expect(mixedBody.DEVICE_ID).toBe('[SANITIZED_BY_VIGIL]');
    expect(mixedBody.normal_key).toBe('preserved');

    await browser.close();
  });
});
