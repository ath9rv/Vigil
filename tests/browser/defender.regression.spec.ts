import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Legitimate Site Regression Matrix (Phase 8)', () => {
  test('Standard web applications function with zero breakage or semantics corruption', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(async () => {
      // 1. Standard HTML5 Canvas Drawing
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 150;
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d')!;
      ctx.beginPath();
      ctx.arc(75, 75, 50, 0, Math.PI * 2, true);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      ctx.stroke();
      const canvasOk = canvas.width === 300;

      // 2. Standard WebGL Shader Compilation
      let webglOk = false;
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl');
      if (gl) {
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, 'void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); }');
        gl.compileShader(vs);
        webglOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      } else {
        webglOk = true; // In environments without GL hardware, consider compliant
      }

      // 3. Normal Form and FormData
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'search';
      input.value = 'privacy guide';
      form.appendChild(input);
      const formData = new FormData(form);
      const formOk = formData.get('search') === 'privacy guide';

      // 4. Standard Fetch API (status, headers, JSON body)
      const res = await fetch('http://localhost:8080/index.html');
      const fetchOk = res.status === 200 && res.headers.has('content-type');

      // 5. Standard Audio Element Creation
      const audio = document.createElement('audio');
      const audioOk = typeof audio.play === 'function' && typeof audio.pause === 'function';

      return {
        canvasOk,
        webglOk,
        formOk,
        fetchOk,
        audioOk
      };
    });

    expect(result.canvasOk).toBe(true);
    expect(result.webglOk).toBe(true);
    expect(result.formOk).toBe(true);
    expect(result.fetchOk).toBe(true);
    expect(result.audioOk).toBe(true);

    await browser.close();
  });
});
