import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Early Execution & Dynamic Iframe Races (Phase 7)', () => {
  test('Prevents hostile evasion via dynamic iframes, script injection, and SPA navigations', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(async () => {
      // 1. Dynamic same-origin iframe inoculation test
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeHw = iframe.contentWindow?.navigator.hardwareConcurrency;
      const iframeScreenCd = iframe.contentWindow?.screen.colorDepth;

      // 2. Dynamic inline evaluation probe test
      const probeResult = new Function(`
        return {
          hw: navigator.hardwareConcurrency,
          gpc: (navigator).globalPrivacyControl
        };
      `)();

      // 3. SPA Navigation Simulation (history.pushState)
      window.history.pushState({ page: 2 }, 'Page 2', '/page2.html');
      const spaHw = navigator.hardwareConcurrency;
      const spaActive = (window as any).__VIGIL_PROTECTION_ACTIVE__;

      return {
        iframeHw,
        iframeScreenCd,
        probeResult,
        spaHw,
        spaActive
      };
    });

    // Dynamic iframe must inherit normalized persona
    expect(result.iframeHw).toBe(8);
    expect(result.iframeScreenCd).toBe(24);

    // Injected script must read normalized persona
    expect(result.probeResult.hw).toBe(8);

    // SPA navigation must maintain protection
    expect(result.spaHw).toBe(8);
    expect(result.spaActive).toBe(true);

    await browser.close();
  });
});
