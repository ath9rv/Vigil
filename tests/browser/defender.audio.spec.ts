import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Audio Fingerprinting Protection (Phase 2)', () => {
  test('OfflineAudioContext and AudioBuffer readbacks are protected deterministically', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // 1. Control Run
    const controlPage = await context.newPage();
    await controlPage.goto('http://localhost:8080/index.html');
    const controlResult = await controlPage.evaluate(async () => {
      if (!window.OfflineAudioContext) return { supported: false };
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10000, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start(0);
      const buffer = await ctx.startRendering();
      const samples = Array.from(buffer.getChannelData(0).slice(0, 50));
      return { supported: true, samples };
    });

    // 2. Defended Run
    const defendedPage = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await defendedPage.addInitScript({ content: defenderSource });
    await defendedPage.goto('http://localhost:8080/index.html');

    const defendedResult = await defendedPage.evaluate(async () => {
      if (!window.OfflineAudioContext) return { supported: false };
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10000, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start(0);
      const buffer = await ctx.startRendering();
      
      const samples1 = Array.from(buffer.getChannelData(0).slice(0, 50));
      const samples2 = Array.from(buffer.getChannelData(0).slice(0, 50)); // Repeated read

      // Test copyFromChannel
      const copyDest = new Float32Array(50);
      buffer.copyFromChannel(copyDest, 0);

      // Verify native toString
      const getChannelStr = Function.prototype.toString.call(AudioBuffer.prototype.getChannelData);

      return {
        supported: true,
        samples1,
        samples2,
        copySamples: Array.from(copyDest),
        getChannelStr
      };
    });

    if (controlResult.supported && defendedResult.supported) {
      // Must be perturbed from control
      expect(defendedResult.samples1).not.toEqual(controlResult.samples);
      // Repeated read must be consistent
      expect(defendedResult.samples1).toEqual(defendedResult.samples2);
      // Native camouflage
      expect(defendedResult.getChannelStr).toBe('function getChannelData() { [native code] }');
    }

    await browser.close();
  });
});
