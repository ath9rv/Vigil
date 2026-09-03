import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Canvas 2D Fingerprint Probes (Phase 2)', () => {
  test('Canvas protection distinguishes hostile probes from legitimate visible canvases', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // 1. Control Run (Native Unprotected)
    const controlPage = await context.newPage();
    await controlPage.goto('http://localhost:8080/index.html');
    const control = await controlPage.evaluate(() => {
      // Create offscreen probe
      const c1 = document.createElement('canvas');
      c1.width = 16;
      c1.height = 16;
      const ctx1 = c1.getContext('2d')!;
      ctx1.fillStyle = 'rgb(120, 150, 180)';
      ctx1.fillRect(0, 0, 16, 16);
      const probeUrl = c1.toDataURL();
      const probeImg = Array.from(ctx1.getImageData(0, 0, 16, 16).data);

      // Create visible onscreen canvas
      const c2 = document.createElement('canvas');
      c2.width = 100;
      c2.height = 100;
      c2.style.display = 'block';
      document.body.appendChild(c2);
      const ctx2 = c2.getContext('2d')!;
      ctx2.fillStyle = 'rgb(50, 100, 150)';
      ctx2.fillRect(0, 0, 100, 100);
      const visibleUrl = c2.toDataURL();

      return { probeUrl, probeImg, visibleUrl };
    });

    // 2. Defended Run
    const defendedPage = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await defendedPage.addInitScript({ content: defenderSource });
    await defendedPage.goto('http://localhost:8080/index.html');

    const defended = await defendedPage.evaluate(() => {
      // Probe A: Detached micro canvas
      const c1 = document.createElement('canvas');
      c1.width = 16;
      c1.height = 16;
      const ctx1 = c1.getContext('2d')!;
      ctx1.fillStyle = 'rgb(120, 150, 180)';
      ctx1.fillRect(0, 0, 16, 16);
      const probeUrl1 = c1.toDataURL();
      const probeUrl2 = c1.toDataURL(); // Repeated read
      const probeImg = Array.from(ctx1.getImageData(0, 0, 16, 16).data);

      // Probe B: CSS Offscreen positioned canvas (left: -9999px)
      const cOff = document.createElement('canvas');
      cOff.width = 200;
      cOff.height = 50;
      cOff.style.position = 'absolute';
      cOff.style.left = '-9999px';
      document.body.appendChild(cOff);
      const ctxOff = cOff.getContext('2d')!;
      ctxOff.fillStyle = 'rgb(120, 150, 180)';
      ctxOff.fillRect(0, 0, 200, 50);
      const cssOffscreenUrl = cOff.toDataURL();

      // Probe C: Hidden canvas (display: none)
      const cHidden = document.createElement('canvas');
      cHidden.width = 200;
      cHidden.height = 50;
      cHidden.style.display = 'none';
      document.body.appendChild(cHidden);
      const ctxHidden = cHidden.getContext('2d')!;
      ctxHidden.fillStyle = 'rgb(120, 150, 180)';
      ctxHidden.fillRect(0, 0, 200, 50);
      const hiddenUrl = cHidden.toDataURL();

      // Legitimate visible onscreen canvas
      const c2 = document.createElement('canvas');
      c2.width = 100;
      c2.height = 100;
      c2.style.display = 'block';
      document.body.appendChild(c2);
      const ctx2 = c2.getContext('2d')!;
      ctx2.fillStyle = 'rgb(50, 100, 150)';
      ctx2.fillRect(0, 0, 100, 100);
      const visibleUrl = c2.toDataURL();

      return {
        probeUrl1,
        probeUrl2,
        probeImg,
        cssOffscreenUrl,
        hiddenUrl,
        visibleUrl
      };
    });

    // A. Probes must be perturbed from native
    expect(defended.probeUrl1).not.toEqual(control.probeUrl);
    expect(defended.probeImg).not.toEqual(control.probeImg);
    expect(defended.cssOffscreenUrl).not.toEqual(control.probeUrl);
    expect(defended.hiddenUrl).not.toEqual(control.probeUrl);

    // B. Repeated reads on probe must be stable within session
    expect(defended.probeUrl1).toEqual(defended.probeUrl2);

    // C. Legitimate visible canvas must NOT be modified (zero breakage)
    expect(defended.visibleUrl).toEqual(control.visibleUrl);

    await browser.close();
  });
});
