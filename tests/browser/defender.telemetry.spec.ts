import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const defenderPath = path.join(__dirname, '../../Frontend/dist/defender.js');

test.describe('Vigil Defender Hardening: Multi-Channel Telemetry Sanitizer (Phase 3)', () => {
  test('Sanitizes fingerprint tokens across sendBeacon, fetch, and XHR without breaking normal requests', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const defenderSource = fs.readFileSync(defenderPath, 'utf8');
    await page.addInitScript({ content: defenderSource });

    await page.goto('http://localhost:8080/index.html');

    const result = await page.evaluate(async () => {
      const captured: Record<string, any> = {};

      // 1. sendBeacon JSON test
      const jsonBeaconPayload = JSON.stringify({
        event: 'session_start',
        fingerprint: 'super_secret_fp_hash_123',
        canvas: 'canvas_probe_abcdef',
        normal_metric: 42
      });
      navigator.sendBeacon('http://localhost:8080/analytics', jsonBeaconPayload);

      // 2. sendBeacon URLSearchParams test
      const params = new URLSearchParams();
      params.set('fp', 'fingerprint_token_999');
      params.set('visitorId', 'visitor_unique_xyz');
      params.set('page', 'checkout');
      navigator.sendBeacon('http://localhost:8080/telemetry', params);

      // 3. fetch GET query test
      const fetchGetRes = await fetch('http://localhost:8080/metrics?fp=query_fp_12345&action=scroll');
      const fetchGetData = await fetchGetRes.json();
      captured.fetchGet = fetchGetData;

      // 4. fetch POST JSON test
      const fetchPostRes = await fetch('http://localhost:8080/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'hardware_uuid_77777',
          webgl: 'webgl_hash_renderer_888',
          user_preference: 'dark_mode'
        })
      });
      const fetchPostData = await fetchPostRes.json();
      captured.fetchPost = fetchPostData;

      // 5. Normal Business Request (must remain untouched!)
      const businessRes = await fetch('http://localhost:8080/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: 'ITEM_1234',
          quantity: 2,
          customer_email: 'buyer@example.com'
        })
      });
      const businessData = await businessRes.json();
      captured.business = businessData;

      // 6. XHR POST test
      const xhrData = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:8080/log?fp=xhr_query_token');
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); }
        };
        xhr.send(JSON.stringify({
          canvas: 'xhr_canvas_token_456',
          status: 'ok'
        }));
      });
      captured.xhr = xhrData;

      return captured;
    });

    // Verify fetch GET query sanitization
    expect(result.fetchGet.query.fp).toBe('[SANITIZED_BY_VIGIL]');
    expect(result.fetchGet.query.action).toBe('scroll');

    // Verify fetch POST body sanitization
    const postBody = JSON.parse(result.fetchPost.body);
    expect(postBody.device_id).toBe('[SANITIZED_BY_VIGIL]');
    expect(postBody.webgl).toBe('[SANITIZED_BY_VIGIL]');
    expect(postBody.user_preference).toBe('dark_mode'); // Legitimate field preserved!

    // Verify Normal Business Request is 100% UNTOUCHED
    const businessBody = JSON.parse(result.business.body);
    expect(businessBody.item_id).toBe('ITEM_1234');
    expect(businessBody.quantity).toBe(2);
    expect(businessBody.customer_email).toBe('buyer@example.com');

    // Verify XHR sanitization
    expect(result.xhr.query.fp).toBe('[SANITIZED_BY_VIGIL]');
    const xhrBody = JSON.parse(result.xhr.body);
    expect(xhrBody.canvas).toBe('[SANITIZED_BY_VIGIL]');
    expect(xhrBody.status).toBe('ok');

    await browser.close();
  });
});
