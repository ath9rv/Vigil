// Injected directly into the MAIN world at document_start.
// Policy-Driven Controlled Active Deception & Anti-Fingerprinting Shield V2.
// Measurably hardened against hostile fingerprinting probes, CreepJS prototype lie checks,
// multi-channel telemetry bypasses, and iframe evasion.

export interface DeceptionPolicy {
  fingerprint: boolean;
  canvasNoise: boolean;
  webglNoise: boolean;
  audioNoise: boolean;
  hardwareNormalization: boolean;
  telemetryProtection: boolean;
}

(function() {
  // Idempotent execution guard
  if ((window as any).__VIGIL_DEFENDER_INITIALIZED__) {
    return;
  }
  Object.defineProperty(window, '__VIGIL_DEFENDER_INITIALIZED__', {
    value: true,
    configurable: false,
    writable: false
  });

  try {
    // ─── 0. Native Function Camouflage (Neutralizes CreepJS "Lie" Detectors) ───
    const nativeToString = Function.prototype.toString;
    const patchedFns = new WeakMap<Function, string>();

    const hookedToString = function(this: Function) {
      if (patchedFns.has(this)) {
        return patchedFns.get(this)!;
      }
      return nativeToString.call(this);
    };

    patchedFns.set(hookedToString, 'function toString() { [native code] }');
    patchedFns.set(nativeToString, 'function toString() { [native code] }');

    Object.defineProperty(hookedToString, 'name', { value: 'toString', configurable: true });
    Object.defineProperty(hookedToString, 'length', { value: 0, configurable: true });
    Function.prototype.toString = hookedToString;

    function makeNative<T extends Function>(fn: T, name: string, isGetter = false, arity = 0): T {
      const str = isGetter 
        ? `function get ${name}() { [native code] }` 
        : `function ${name}() { [native code] }`;
      patchedFns.set(fn, str);
      try {
        Object.defineProperty(fn, 'name', { value: isGetter ? `get ${name}` : name, configurable: true });
        Object.defineProperty(fn, 'length', { value: arity, configurable: true });
      } catch {}
      return fn;
    }

    // ─── 1. Central Policy Definition ──────────────────────────────────────────
    const policy: DeceptionPolicy = {
      fingerprint: true,
      canvasNoise: true,
      webglNoise: true,
      audioNoise: true,
      hardwareNormalization: true,
      telemetryProtection: true
    };

    // 32-bit FNV-1a hash for deterministic, origin-stable seeds
    const hashString = (str: string) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const originHash = hashString(window.location.hostname || 'localhost');
    const originSeed = (originHash % 1000) / 1000;

    // ─── 2. Advanced Fingerprint Probe Canvas Detection ────────────────────────
    /**
     * Determines if a canvas is likely an automated fingerprint probe.
     * Checks connection to DOM, styling, micro-dimensions, and offscreen positioning.
     * Explicitly preserves visible user-facing canvases (games, charts, drawing tools).
     */
    function isFingerprintProbe(canvas: HTMLCanvasElement): boolean {
      if (!canvas.isConnected) return true;

      const style = canvas.style;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
      }

      if ((canvas.width <= 16 && canvas.height <= 16) || canvas.width === 0 || canvas.height === 0) {
        return true;
      }

      try {
        const leftVal = parseInt(style.left || '0', 10);
        const topVal = parseInt(style.top || '0', 10);
        if (leftVal <= -1000 || topVal <= -1000) {
          return true;
        }

        if (typeof canvas.getBoundingClientRect === 'function') {
          const rect = canvas.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return true;
          if (rect.left <= -5000 || rect.top <= -5000) return true;
        }
      } catch {}

      return false;
    }

    // ─── 3. Hardware Fingerprint Normalization (Stable Fleet Persona) ───────────
    function applyHardwareNormalization(targetNav: Navigator, targetScreen: Screen) {
      if (!policy.hardwareNormalization) return;
      try {
        const navProto = Object.getPrototypeOf(targetNav) || targetNav;
        const screenProto = Object.getPrototypeOf(targetScreen) || targetScreen;

        const getHardwareConcurrency = makeNative(() => 8, 'hardwareConcurrency', true, 0);
        Object.defineProperty(navProto, 'hardwareConcurrency', {
          get: getHardwareConcurrency,
          configurable: true,
          enumerable: true
        });

        if ('deviceMemory' in navProto) {
          const getDeviceMemory = makeNative(() => 8, 'deviceMemory', true, 0);
          Object.defineProperty(navProto, 'deviceMemory', {
            get: getDeviceMemory,
            configurable: true,
            enumerable: true
          });
        }

        const getColorDepth = makeNative(() => 24, 'colorDepth', true, 0);
        Object.defineProperty(screenProto, 'colorDepth', {
          get: getColorDepth,
          configurable: true,
          enumerable: true
        });

        const getPixelDepth = makeNative(() => 24, 'pixelDepth', true, 0);
        Object.defineProperty(screenProto, 'pixelDepth', {
          get: getPixelDepth,
          configurable: true,
          enumerable: true
        });
      } catch {}
    }

    applyHardwareNormalization(navigator, window.screen);

    // ─── 4. Canvas 2D Readback Protection (Idempotent Per-Instance) ─────────────
    if (policy.canvasNoise) {
      const perturbedCanvases = new WeakSet<HTMLCanvasElement>();
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

      const hookedToDataURL = function(this: HTMLCanvasElement, ...args: any[]) {
        if (isFingerprintProbe(this) && !perturbedCanvases.has(this)) {
          perturbedCanvases.add(this);
          const context = this.getContext('2d');
          if (context && this.width > 0 && this.height > 0) {
            const seedInt = Math.floor(originSeed * 10) + 1;
            context.fillStyle = `rgba(${250 - seedInt}, ${250 - seedInt}, ${250 - seedInt}, 0.02)`;
            context.fillRect(0, 0, 1, 1);
          }
        }
        return originalToDataURL.apply(this, args as any);
      };
      HTMLCanvasElement.prototype.toDataURL = makeNative(hookedToDataURL, 'toDataURL', false, 0);

      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      const hookedGetImageData = function(
        this: CanvasRenderingContext2D, 
        x: number, y: number, w: number, h: number, ...args: any[]
      ) {
        const imageData = originalGetImageData.call(this, x, y, w, h, ...args);
        const canvas = this.canvas;
        
        if (canvas && isFingerprintProbe(canvas) && imageData && imageData.data.length >= 4) {
          const offset = Math.floor(originSeed * 3);
          imageData.data[offset] = (imageData.data[offset] ^ 0b00000001);
        }
        return imageData;
      };
      CanvasRenderingContext2D.prototype.getImageData = makeNative(hookedGetImageData, 'getImageData', false, 4);

      // Support OffscreenCanvas where available
      if (typeof OffscreenCanvas !== 'undefined' && OffscreenCanvas.prototype.convertToBlob) {
        const origConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
        OffscreenCanvas.prototype.convertToBlob = makeNative(function(this: OffscreenCanvas, ...args: any[]) {
          const ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            const seedInt = Math.floor(originSeed * 10) + 1;
            (ctx as any).fillStyle = `rgba(${250 - seedInt}, ${250 - seedInt}, ${250 - seedInt}, 0.02)`;
            (ctx as any).fillRect(0, 0, 1, 1);
          }
          return origConvertToBlob.apply(this, args as any);
        }, 'convertToBlob', false, 0);
      }
    }

    // ─── 5. WebGL Parameter Sanitization (Herd Blending) ───────────────────────
    if (policy.webglNoise) {
      const getParameterProto = WebGLRenderingContext.prototype.getParameter;
      const UNMASKED_VENDOR_WEBGL = 0x9245;
      const UNMASKED_RENDERER_WEBGL = 0x9246;

      const sanitizeWebGLParam = (target: any, pname: number) => {
        if (pname === UNMASKED_VENDOR_WEBGL) {
          return 'Google Inc. (Intel)';
        }
        if (pname === UNMASKED_RENDERER_WEBGL) {
          return 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
        }
        return getParameterProto.call(target, pname);
      };

      WebGLRenderingContext.prototype.getParameter = makeNative(function(this: WebGLRenderingContext, pname: number) {
        return sanitizeWebGLParam(this, pname);
      }, 'getParameter', false, 1);

      if (window.WebGL2RenderingContext) {
        const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = makeNative(function(this: WebGL2RenderingContext, pname: number) {
          if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL) {
            return sanitizeWebGLParam(this, pname);
          }
          return getParameter2Proto.call(this, pname);
        }, 'getParameter', false, 1);
      }
    }

    // ─── 6. Audio Fingerprint Protection (OfflineAudioContext & AudioBuffer) ───
    if (policy.audioNoise) {
      const AudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (AudioContextClass) {
        const origStartRendering = AudioContextClass.prototype.startRendering;
        AudioContextClass.prototype.startRendering = makeNative(async function(this: OfflineAudioContext) {
          const renderedBuffer = await origStartRendering.call(this);
          try {
            for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
              const channelData = renderedBuffer.getChannelData(ch);
              if (channelData && channelData.length > 10) {
                // Perturb both early sample slice and whole-buffer index
                const earlyIdx = (originHash % 25) + 5;
                const sampleIdx = Math.floor(originSeed * (channelData.length - 1));
                const direction = (originHash % 2 === 0) ? 1 : -1;
                channelData[earlyIdx] += (direction * 0.000005);
                channelData[sampleIdx] += (direction * 0.000005);
              }
            }
          } catch {}
          return renderedBuffer;
        }, 'startRendering', false, 0);
      }

      if (window.AudioBuffer) {
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = makeNative(function(this: AudioBuffer, channel: number) {
          const data = originalGetChannelData.call(this, channel);
          if (data && data.length > 10) {
            const earlyIdx = (originHash % 25) + 5;
            const index = Math.floor(originSeed * (data.length - 1));
            data[earlyIdx] = Math.round(data[earlyIdx] * 100000) / 100000;
            data[index] = Math.round(data[index] * 100000) / 100000;
          }
          return data;
        }, 'getChannelData', false, 1);

        if (AudioBuffer.prototype.copyFromChannel) {
          const origCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
          AudioBuffer.prototype.copyFromChannel = makeNative(function(
            this: AudioBuffer, destination: any, channelNumber: number, bufferOffset = 0
          ) {
            origCopyFromChannel.call(this, destination, channelNumber, bufferOffset);
            if (destination && destination.length > 10) {
              const earlyIdx = (originHash % 25) + 5;
              const index = Math.floor(originSeed * (destination.length - 1));
              destination[earlyIdx] = Math.round(destination[earlyIdx] * 100000) / 100000;
              destination[index] = Math.round(destination[index] * 100000) / 100000;
            }
          }, 'copyFromChannel', false, 2);
        }
      }
    }

    // ─── 7. Multi-Tier Telemetry Classification & Sanitization Pipeline ────────
    if (policy.telemetryProtection) {
      const FINGERPRINT_KEY_PATTERNS = [
        /^canvas$/i, /^fingerprint$/i, /^fp$/i, /^webgl$/i, /^audio$/i,
        /^device_?id$/i, /^visitor_?id$/i, /^client_?id$/i, /^murmur/i, /^hash$/i
      ];

      function isFingerprintKey(key: string): boolean {
        const trimmed = key.trim();
        return FINGERPRINT_KEY_PATTERNS.some(p => p.test(trimmed));
      }

      // Tier 1: Endpoint Classification
      function isTelemetryEndpoint(rawUrl: string): boolean {
        try {
          const parsed = new URL(rawUrl, window.location.href);
          const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
          const host = parsed.hostname.toLowerCase();

          // A. Known telemetry paths
          if (/analytics|telemetry|track|metrics|collect|beacon|event|ingest|ping|logger/i.test(pathAndQuery)) {
            return true;
          }

          // B. CNAME-cloaked or dedicated tracking subdomains
          if (/^(metrics|track|analytics|telemetry|log|data|beacon|events)\./i.test(host)) {
            return true;
          }

          // C. Query string contains explicit fingerprint parameters
          for (const [k] of parsed.searchParams) {
            if (isFingerprintKey(k)) return true;
          }
        } catch {}
        return false;
      }

      // Tier 2: URL Query Sanitization
      function sanitizeUrlQuery(rawUrl: string): string {
        try {
          const parsed = new URL(rawUrl, window.location.href);
          let modified = false;
          for (const [k] of Array.from(parsed.searchParams.entries())) {
            if (isFingerprintKey(k)) {
              parsed.searchParams.set(k, '[SANITIZED_BY_VIGIL]');
              modified = true;
            }
          }
          return modified ? parsed.toString() : rawUrl;
        } catch {
          return rawUrl;
        }
      }

      // Tier 3: Recursive Payload Sanitization
      function sanitizeObject(obj: any, depth = 0): boolean {
        if (!obj || typeof obj !== 'object' || depth > 5) return false;
        let modified = false;

        for (const key of Object.keys(obj)) {
          if (isFingerprintKey(key)) {
            if (typeof obj[key] === 'string' && obj[key].length > 4) {
              obj[key] = '[SANITIZED_BY_VIGIL]';
              modified = true;
            } else if (typeof obj[key] === 'number') {
              obj[key] = 0;
              modified = true;
            }
          } else if (typeof obj[key] === 'object') {
            if (sanitizeObject(obj[key], depth + 1)) {
              modified = true;
            }
          }
        }
        return modified;
      }

      function sanitizePayload(data: any): any {
        if (!data) return data;

        // A. String payload: JSON or URL-encoded
        if (typeof data === 'string') {
          // Attempt JSON parse
          try {
            const parsed = JSON.parse(data);
            if (sanitizeObject(parsed)) {
              return JSON.stringify(parsed);
            }
          } catch {
            // URL-encoded string (e.g. "v=1&fp=hash123&canvas=abc")
            if (data.includes('=')) {
              try {
                const params = new URLSearchParams(data);
                let modified = false;
                for (const [k] of Array.from(params.entries())) {
                  if (isFingerprintKey(k)) {
                    params.set(k, '[SANITIZED_BY_VIGIL]');
                    modified = true;
                  }
                }
                if (modified) return params.toString();
              } catch {}
            }
          }
          return data;
        }

        // B. URLSearchParams instance
        if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
          for (const [k] of Array.from(data.entries())) {
            if (isFingerprintKey(k)) {
              data.set(k, '[SANITIZED_BY_VIGIL]');
            }
          }
          return data;
        }

        // C. FormData instance
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
          for (const key of Array.from((data as any).keys?.() || [])) {
            if (typeof key === 'string' && isFingerprintKey(key)) {
              data.set(key, '[SANITIZED_BY_VIGIL]');
            }
          }
          return data;
        }

        return data;
      }

      // 7.1 Intercept navigator.sendBeacon
      if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = makeNative(function(this: Navigator, url: string | URL, data?: BodyInit | null): boolean {
          try {
            const urlStr = url.toString();
            const cleanUrl = isTelemetryEndpoint(urlStr) ? sanitizeUrlQuery(urlStr) : urlStr;
            const cleanData = sanitizePayload(data);
            return originalSendBeacon.call(this, cleanUrl, cleanData);
          } catch {}
          return originalSendBeacon.call(this, url, data);
        }, 'sendBeacon', false, 1);
      }

      // 7.2 Intercept window.fetch
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = makeNative(function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
          try {
            let urlStr = '';
            if (typeof input === 'string') {
              urlStr = input;
            } else if (input instanceof URL) {
              urlStr = input.toString();
            } else if (typeof Request !== 'undefined' && input instanceof Request) {
              urlStr = input.url;
            }

            const cleanUrl = isTelemetryEndpoint(urlStr) ? sanitizeUrlQuery(urlStr) : urlStr;
            if (init && init.body) {
              init.body = sanitizePayload(init.body);
            }
            const finalInput = (typeof Request !== 'undefined' && input instanceof Request)
              ? new Request(cleanUrl, init || input)
              : cleanUrl;
            return originalFetch.call(this, finalInput, init);
          } catch {}
          return originalFetch.call(this, input, init);
        }, 'fetch', false, 1);
      }

      // 7.3 Intercept XMLHttpRequest
      if (window.XMLHttpRequest) {
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        const originalXhrSend = XMLHttpRequest.prototype.send;
        const xhrUrlMap = new WeakMap<XMLHttpRequest, string>();

        XMLHttpRequest.prototype.open = makeNative(function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
          const urlStr = url.toString();
          const cleanUrl = isTelemetryEndpoint(urlStr) ? sanitizeUrlQuery(urlStr) : urlStr;
          xhrUrlMap.set(this, cleanUrl);
          return (originalXhrOpen as any).call(this, method, cleanUrl, ...rest);
        }, 'open', false, 2);

        XMLHttpRequest.prototype.send = makeNative(function(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
          try {
            const urlStr = xhrUrlMap.get(this);
            if (body) {
              const cleanBody = sanitizePayload(body);
              return originalXhrSend.call(this, cleanBody);
            }
          } catch {}
          return originalXhrSend.call(this, body);
        }, 'send', false, 0);
      }
    }

    // ─── 8. Dynamic Same-Origin IFrame Inoculation (Phase 7) ────────────────────
    try {
      const origContentWindowDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (origContentWindowDesc && origContentWindowDesc.get) {
        const origContentWindowGetter = origContentWindowDesc.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: makeNative(function(this: HTMLIFrameElement) {
            const win = origContentWindowGetter.call(this);
            if (win && win.navigator && !(win as any).__VIGIL_DEFENDER_INITIALIZED__) {
              try {
                applyHardwareNormalization(win.navigator, win.screen);
              } catch {}
            }
            return win;
          }, 'contentWindow', true, 0),
          configurable: true,
          enumerable: true
        });
      }
    } catch {}

    // ─── 9. Global Privacy Control (GPC) & Public Status ────────────────────────
    try {
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: true,
        configurable: false,
        writable: false
      });
    } catch {}

    Object.defineProperty(window, '__VIGIL_PROTECTION_ACTIVE__', {
      value: true,
      configurable: false,
      writable: false
    });

    Object.defineProperty(window, '__VIGIL_DECEPTION_POLICY__', {
      value: Object.freeze(policy),
      configurable: false,
      writable: false
    });

  } catch {}
})();
