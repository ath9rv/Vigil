import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: WebGL Herd Blending (Phase 2)', () => {
  test('WebGL masks hardware vendor/renderer while preserving native 3D parameters', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return { supported: false };

      const UNMASKED_VENDOR_WEBGL = 0x9245;
      const UNMASKED_RENDERER_WEBGL = 0x9246;

      const vendor = gl.getParameter(UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(UNMASKED_RENDERER_WEBGL);

      // Normal WebGL parameters that must NOT be broken
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const version = gl.getParameter(gl.VERSION);

      // Native prototype checks
      const getParamDesc = Object.getOwnPropertyDescriptor(WebGLRenderingContext.prototype, 'getParameter');
      const getParamStr = Function.prototype.toString.call(gl.getParameter);

      // WebGL 2 if supported
      let gl2Vendor = null;
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        gl2Vendor = gl2.getParameter(UNMASKED_VENDOR_WEBGL);
      }

      return {
        supported: true,
        vendor,
        renderer,
        maxTextureSizeValid: typeof maxTextureSize === 'number' && maxTextureSize > 0,
        versionValid: typeof version === 'string' && version.length > 0,
        getParamStr,
        gl2Vendor
      };
    });

    if (result.supported) {
      expect(result.vendor).toBe('Google Inc. (Intel)');
      expect(result.renderer).toContain('ANGLE (Intel');
      expect(result.maxTextureSizeValid).toBe(true);
      expect(result.versionValid).toBe(true);
      expect(result.getParamStr).toBe('function getParameter() { [native code] }');
      if (result.gl2Vendor) {
        expect(result.gl2Vendor).toBe('Google Inc. (Intel)');
      }
    }

    await browser.close();
  });
});
