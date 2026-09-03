import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: CNAME & Subdomain Cloaking Defense (Phase 5)', () => {
  test('Distinguishes cloaked tracking subdomains from legitimate first-party traffic', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(async () => {
      // 1. Cloaked tracking subdomain simulation (e.g. http://metrics.localhost:8080 or URL pattern)
      // Since local test server is localhost:8080, we simulate via URL with tracking subdomain
      const cloakedUrl = 'http://localhost:8080/track?subdomain=metrics.example.com&visitorId=cloaked_id_123';
      const cloakedRes = await fetch(cloakedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fp: 'cloaked_cname_fingerprint_token',
          session_id: 'legit_session_abc'
        })
      });
      const cloakedData = await cloakedRes.json();

      // 2. Legitimate first-party application API (must NOT be treated as telemetry)
      const appUrl = 'http://localhost:8080/api/v1/profile';
      const appRes = await fetch(appUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'alice',
          settings: { notifications: true }
        })
      });
      const appData = await appRes.json();

      return { cloakedData, appData };
    });

    // Cloaked endpoint with tracking tokens must have tokens neutralized
    expect(result.cloakedData.query.visitorId).toBe('[SANITIZED_BY_VIGIL]');
    const cloakedBody = JSON.parse(result.cloakedData.body);
    expect(cloakedBody.fp).toBe('[SANITIZED_BY_VIGIL]');
    expect(cloakedBody.session_id).toBe('legit_session_abc'); // Legitimate session preserved

    // Legitimate first-party app API must be completely unmodified
    const appBody = JSON.parse(result.appData.body);
    expect(appBody.username).toBe('alice');
    expect(appBody.settings.notifications).toBe(true);

    await browser.close();
  });
});
