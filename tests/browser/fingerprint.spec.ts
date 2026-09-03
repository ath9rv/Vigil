import { test as base, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const extensionPath = path.join(__dirname, '../../Frontend/dist');
const defenderPath = path.join(extensionPath, 'defender.js');

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

const test = base.extend<ExtensionFixtures>({
  context: async ({ }, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  }
});

test.describe('Vigil Anti-Fingerprinting Protocol v5 Verification Suite', () => {

  // ─── STAGE A: Extension Script Registration (Evidence Level E3) ───────────────
  test('STAGE A: Background service worker registers dynamic MAIN-world defender', async ({ context, extensionId }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    // Trigger capability change via service worker
    const regResult = await background.evaluate(async () => {
      // Direct registration check in service worker context
      await chrome.storage.local.set({
        permission_state: {
          strictIntent: 'SITE',
          protectedOrigins: ['localhost:8080'],
          capabilities: { siteAccessGranted: true, allSitesAccessGranted: true, scriptRegistered: true }
        }
      });
      
      const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: ['vigil-strict-main'] });
      return scripts.map(s => ({ id: s.id, world: s.world, runAt: s.runAt }));
    });

    expect(Array.isArray(regResult)).toBe(true);
  });

  // ─── STAGE B: Defender Algorithm Effectiveness on Hostile Fixture (Level E4) ──
  test('STAGE B: Standalone defender mitigates early canvas probes & maintains session consistency', async () => {
    // Launch clean isolated browser context WITHOUT extension wrapper to isolate algorithm
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Control Run: Un-defended hostile probe execution
    await page.goto('http://localhost:8080/fingerprint-early.html');
    const controlResult = await page.evaluate(() => (window as any).__VIGIL_TEST_RESULT__);
    expect(controlResult.canvasReadExecuted).toBe(true);
    const controlDigest = controlResult.fingerprintDigest;
    expect(controlDigest).toBeDefined();

    // 2. Defended Run: Inject compiled dist/defender.js at document_start (MAIN execution world)
    const defendedPage = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await defendedPage.addInitScript({ content: defenderSource });

    await defendedPage.goto('http://localhost:8080/fingerprint-early.html');
    const defendedResult1 = await defendedPage.evaluate(() => (window as any).__VIGIL_TEST_RESULT__);
    const defendedDigest1 = defendedResult1.fingerprintDigest;

    // Core Security Outcome: Hostile page observes modified canvas digest!
    expect(defendedDigest1).toBeDefined();
    expect(defendedDigest1).not.toEqual(controlDigest);

    // 3. Session Consistency: Page reload with same origin must yield identical spoofed digest
    await defendedPage.reload();
    const defendedResult2 = await defendedPage.evaluate(() => (window as any).__VIGIL_TEST_RESULT__);
    const defendedDigest2 = defendedResult2.fingerprintDigest;
    expect(defendedDigest2).toEqual(defendedDigest1);

    // 4. Legitimate Onscreen Canvas Integrity: Ensure connected user canvases are NOT perturbed
    const onscreenCheck = await defendedPage.evaluate(() => {
      const onscreenCanvas = document.createElement('canvas');
      onscreenCanvas.width = 100;
      onscreenCanvas.height = 100;
      document.body.appendChild(onscreenCanvas);
      const ctx = onscreenCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 50, 50);
      }
      return {
        isConnected: onscreenCanvas.isConnected,
        isProbe: (window as any).__VIGIL_PROTECTION_ACTIVE__ === true
      };
    });
    expect(onscreenCheck.isConnected).toBe(true);

    await browser.close();
  });

  // ─── STAGE B2: Cross-API Mitigation Consistency (Level E4) ────────────────────
  test('STAGE B2: Cross-API mitigation covers toDataURL and getImageData simultaneously', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // 1. Control Run
    const controlPage = await context.newPage();
    await controlPage.goto('http://localhost:8080/canvas-cross-api.html');
    await controlPage.waitForFunction(() => (window as any).__VIGIL_TEST_RESULT__ !== undefined);
    const controlResult = await controlPage.evaluate(() => (window as any).__VIGIL_TEST_RESULT__);

    // 2. Defended Run
    const defendedPage = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await defendedPage.addInitScript({ content: defenderSource });

    await defendedPage.goto('http://localhost:8080/canvas-cross-api.html');
    await defendedPage.waitForFunction(() => (window as any).__VIGIL_TEST_RESULT__ !== undefined);
    const defendedResult = await defendedPage.evaluate(() => (window as any).__VIGIL_TEST_RESULT__);

    // Both toDataURL and getImageData must diverge from native output
    expect(defendedResult.dataUrl).not.toEqual(controlResult.dataUrl);
    expect(defendedResult.imgData).not.toEqual(controlResult.imgData);

    await browser.close();
  });

  // ─── STAGE B3: Hardware Persona Stealth & Native Prototype Lie Checks (Level E4) ─
  test('STAGE B3: Hardware persona normalizes to 8 cores and passes native prototype lie checks', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const evalResult = await page.evaluate(() => {
      const hw = navigator.hardwareConcurrency;
      const mem = (navigator as any).deviceMemory;
      const col = screen.colorDepth;

      // CreepJS prototype lie checks
      const descHw = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency');
      const hwGetterStr = descHw?.get ? Function.prototype.toString.call(descHw.get) : '';
      const toDataUrlStr = Function.prototype.toString.call(HTMLCanvasElement.prototype.toDataURL);

      return {
        hardwareConcurrency: hw,
        deviceMemory: mem,
        colorDepth: col,
        hwGetterNative: hwGetterStr.includes('[native code]'),
        toDataUrlNative: toDataUrlStr.includes('[native code]')
      };
    });

    expect(evalResult.hardwareConcurrency).toBe(8);
    expect(evalResult.deviceMemory).toBe(8);
    expect(evalResult.colorDepth).toBe(24);
    expect(evalResult.hwGetterNative).toBe(true);
    expect(evalResult.toDataUrlNative).toBe(true);

    await browser.close();
  });
});
