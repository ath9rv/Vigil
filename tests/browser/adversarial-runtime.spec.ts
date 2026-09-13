import { test as base, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../../Frontend/dist');

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-gpu',
      ],
    });

    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

test.describe('Vigil Milestone 2B: Real Chromium Runtime Adversarial Validation', () => {

  test('A. Real Extension Package & Service Worker Lifecycle in Chromium', async ({ context, extensionId }) => {
    expect(extensionId).toBeDefined();
    expect(extensionId.length).toBeGreaterThan(5);

    let [background] = context.serviceWorkers();
    expect(background).toBeDefined();
    expect(background.url()).toContain(extensionId);

    const swStatus = await background.evaluate(() => {
      return {
        hasChromeRuntime: typeof chrome !== 'undefined' && !!chrome.runtime,
        hasStorage: typeof chrome !== 'undefined' && !!chrome.storage,
        extensionId: chrome.runtime.id,
      };
    });

    expect(swStatus.hasChromeRuntime).toBe(true);
    expect(swStatus.hasStorage).toBe(true);
    expect(swStatus.extensionId).toBe(extensionId);
  });

  test('B. Real Chromium Hostile Mutation Storm: 10,000 DOM Churn Events', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:8080/apps/mutation-storm/index.html');

    const metricsEl = page.locator('#metrics');
    await expect(metricsEl).toContainText('Ready');

    const startTime = Date.now();
    await page.click('#btnStartStorm');

    await expect(metricsEl).toContainText('Storm complete! 10000 mutations', { timeout: 10000 });
    const elapsed = Date.now() - startTime;

    const childCount = await page.locator('#targetContainer > div').count();
    expect(childCount).toBe(10000);

    await page.click('#btnReset');
    await expect(metricsEl).toContainText('Target cleared. Ready.');
    const postResetCount = await page.locator('#targetContainer > div').count();
    expect(postResetCount).toBe(0);

    console.log(`[Chromium Telemetry] 10,000 DOM mutations executed in real Chromium in ${elapsed}ms`);
    await page.close();
  });

  test('C. Real Chromium Drip Pricing: Multi-Stage Post-Progression Injection', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:8080/apps/drip-pricing/index.html');

    const basePrice = page.locator('#productBasePrice');
    await expect(basePrice).toHaveText('$50.00');
    expect(await basePrice.getAttribute('data-displayed-base-price')).toBe('50');

    await page.click('#btnProceed');
    await expect(page.locator('#stage2')).toBeVisible();

    await page.fill('#addressInput', '123 Market St, San Francisco, CA');
    await page.click('#btnContinueReview');
    await expect(page.locator('#stage3')).toBeVisible();

    const feeRow = page.locator('#unannouncedFeeRow');
    await expect(feeRow).toBeVisible();
    await expect(feeRow).toContainText('Mandatory Service & Platform Fee');
    await expect(feeRow).toContainText('$18.00');

    const finalTotal = page.locator('#finalTotalDisplay');
    await expect(finalTotal).toHaveText('$68.00');
    expect(await finalTotal.getAttribute('data-price')).toBe('68');

    await page.close();
  });

  test('D. Real Chromium Countdown Evasion: Reload Loop & Obfuscation Inspection', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:8080/apps/countdown-evasion/index.html');

    const timerContainer = page.locator('#dynamicTimerContainer');
    await expect(timerContainer).toBeVisible();
    const initialText = (await timerContainer.textContent())?.trim();
    expect(initialText).toMatch(/^1[45]:\d{2}$/);

    const digitSpans = page.locator('#dynamicTimerContainer span span');
    expect(await digitSpans.count()).toBeGreaterThanOrEqual(4);

    await page.reload();
    const reloadedText = (await page.locator('#dynamicTimerContainer').textContent())?.trim();
    expect(reloadedText).toMatch(/^1[45]:\d{2}$/);

    await page.close();
  });

  test('E. Real Chromium Navigation Race & Stale Isolation', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:8080/apps/navigation-race/index.html');

    await page.click('#btnPageA');
    await expect(page.locator('#pageState')).toContainText('Page A');

    await page.click('#btnPageB');
    await expect(page.locator('#pageState')).toContainText('Page B');

    await page.click('#btnDelayedA');
    const logText = await page.locator('#logConsole').textContent();
    expect(logText).toContain('Message dropped: stale_navigation');
    expect(logText).toContain('Page B evidence DAG remains 100% clean');

    await page.close();
  });

  test('F. Real Chromium False-Positive Laboratory: 5 Legitimate Controls', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:8080/apps/false-positive-lab/index.html');

    const cards = page.locator('.control-card');
    expect(await cards.count()).toBe(5);

    await expect(cards.nth(0)).toContainText('California Regional Sales Tax');
    await expect(cards.nth(1)).toContainText('User-Selected Overnight Express Shipping');
    await expect(cards.nth(2)).toContainText('Mobile Viewport Cart Restructuring');
    await expect(cards.nth(3)).toContainText('Live Concert Ticket Hold: 08:45');

    const consentButtons = cards.nth(4).locator('.btn-consent');
    expect(await consentButtons.count()).toBe(2);
    await expect(consentButtons.nth(0)).toHaveText('Accept All');
    await expect(consentButtons.nth(1)).toHaveText('Reject All');

    await page.close();
  });

  test('G. Real Extension Popup & Explain Mode Interface in Chromium', async ({ context, extensionId }) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

    await expect(popupPage).toHaveTitle('Vigil');
    const appRoot = popupPage.locator('#root');
    await expect(appRoot).toBeVisible();

    console.log(`[Chromium Telemetry] Extension popup loaded successfully at chrome-extension://${extensionId}/src/popup/index.html`);
    await popupPage.close();
  });
});
