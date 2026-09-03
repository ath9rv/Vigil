import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Hardware Persona & Camouflage (Phase 2 & 6)', () => {
  test('Hardware attributes normalize to stable persona and pass CreepJS native lie checks', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(() => {
      const hw = navigator.hardwareConcurrency;
      const mem = (navigator as any).deviceMemory;
      const cd = screen.colorDepth;
      const pd = screen.pixelDepth;

      // 1. Prototype Descriptors Check
      const navProto = Object.getPrototypeOf(navigator);
      const hwDesc = Object.getOwnPropertyDescriptor(navProto, 'hardwareConcurrency');
      const memDesc = Object.getOwnPropertyDescriptor(navProto, 'deviceMemory');
      const screenProto = Object.getPrototypeOf(screen);
      const cdDesc = Object.getOwnPropertyDescriptor(screenProto, 'colorDepth');

      // 2. CreepJS Function.prototype.toString Native Checks
      const hwGetterStr = hwDesc?.get ? Function.prototype.toString.call(hwDesc.get) : '';
      const memGetterStr = memDesc?.get ? Function.prototype.toString.call(memDesc.get) : '';
      const cdGetterStr = cdDesc?.get ? Function.prototype.toString.call(cdDesc.get) : '';

      // 3. Arity & Naming Checks
      const hwGetterName = hwDesc?.get?.name;
      const hwGetterLength = hwDesc?.get?.length;

      // 4. Function.prototype.toString Self-Integrity
      const toStringName = Function.prototype.toString.name;
      const toStringLength = Function.prototype.toString.length;
      const toStringSelfStr = Function.prototype.toString.call(Function.prototype.toString);

      // 5. Session Stability over 100 queries
      let stable = true;
      for (let i = 0; i < 100; i++) {
        if (navigator.hardwareConcurrency !== 8 || (navigator as any).deviceMemory !== 8) {
          stable = false;
          break;
        }
      }

      return {
        hw,
        mem,
        cd,
        pd,
        hwConfigurable: hwDesc?.configurable,
        hwEnumerable: hwDesc?.enumerable,
        hwGetterNative: hwGetterStr === 'function get hardwareConcurrency() { [native code] }',
        memGetterNative: memDesc ? memGetterStr === 'function get deviceMemory() { [native code] }' : true,
        cdGetterNative: cdGetterStr === 'function get colorDepth() { [native code] }',
        hwGetterName,
        hwGetterLength,
        toStringName,
        toStringLength,
        toStringSelfStr,
        stable
      };
    });

    expect(result.hw).toBe(8);
    expect(result.mem).toBe(8);
    expect(result.cd).toBe(24);
    expect(result.pd).toBe(24);
    expect(result.hwConfigurable).toBe(true);
    expect(result.hwEnumerable).toBe(true);
    expect(result.hwGetterNative).toBe(true);
    expect(result.memGetterNative).toBe(true);
    expect(result.cdGetterNative).toBe(true);
    expect(result.hwGetterName).toBe('get hardwareConcurrency');
    expect(result.hwGetterLength).toBe(0);
    expect(result.toStringName).toBe('toString');
    expect(result.toStringLength).toBe(0);
    expect(result.toStringSelfStr).toBe('function toString() { [native code] }');
    expect(result.stable).toBe(true);

    await browser.close();
  });
});
