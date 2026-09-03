// Injected directly into the MAIN world at document_start.
// Policy-Driven Controlled Active Deception & Anti-Fingerprinting Shield.
// Neutralizes fingerprinting probes, normalizes hardware specs, and sanitizes multi-channel telemetry
// while preserving 100% site functionality and native prototype integrity.

export interface DeceptionPolicy {
  fingerprint: boolean;
  canvasNoise: boolean;
  webglNoise: boolean;
  audioNoise: boolean;
  hardwareNormalization: boolean;
  telemetryProtection: boolean;
}

(function() {
  try {
    // ─── 0. Native Function Camouflage (Neutralizes CreepJS "Lie" Detectors) ───
    const nativeToString = Function.prototype.toString;
    const patchedFns = new WeakMap<Function, string>();

    Function.prototype.toString = function(this: Function) {
      if (patchedFns.has(this)) {
        return patchedFns.get(this)!;
      }
      return nativeToString.call(this);
    };
    patchedFns.set(Function.prototype.toString, 'function toString() { [native code] }');

    function makeNative<T extends Function>(fn: T, name: string, isGetter = false): T {
      const str = isGetter 
        ? `function get ${name}() { [native code] }` 
        : `function ${name}() { [native code] }`;
      patchedFns.set(fn, str);
      try {
        Object.defineProperty(fn, 'name', { value: isGetter ? `get ${name}` : name, configurable: true });
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

    /**
     * Determines if a canvas is likely a fingerprinting probe.
     * Real user-facing canvases (games, charts, CAPTCHAs, drawing tools) are connected to DOM
     * and have reasonable dimensions. Fingerprinters draw invisible/offscreen canvases.
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
      return false;
    }

    // ─── 2. Hardware Fingerprint Normalization (Stable Fleet Persona) ───────────
    if (policy.hardwareNormalization) {
      try {
        const getHardwareConcurrency = makeNative(() => 8, 'hardwareConcurrency', true);
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          get: getHardwareConcurrency,
          configurable: true,
          enumerable: true
        });

        if ('deviceMemory' in Navigator.prototype) {
          const getDeviceMemory = makeNative(() => 8, 'deviceMemory', true);
          Object.defineProperty(Navigator.prototype, 'deviceMemory', {
            get: getDeviceMemory,
            configurable: true,
            enumerable: true
          });
        }

        const getColorDepth = makeNative(() => 24, 'colorDepth', true);
        Object.defineProperty(Screen.prototype, 'colorDepth', {
          get: getColorDepth,
          configurable: true,
          enumerable: true
        });

        const getPixelDepth = makeNative(() => 24, 'pixelDepth', true);
        Object.defineProperty(Screen.prototype, 'pixelDepth', {
          get: getPixelDepth,
          configurable: true,
          enumerable: true
        });
      } catch {}
    }

    // ─── 3. Canvas 2D Readback Protection ───────────────────────────────────────
    if (policy.canvasNoise) {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const hookedToDataURL = function(this: HTMLCanvasElement, ...args: any[]) {
        if (isFingerprintProbe(this)) {
          const context = this.getContext('2d');
          if (context && this.width > 0 && this.height > 0) {
            const seedInt = Math.floor(originSeed * 10) + 1;
            context.fillStyle = `rgba(${250 - seedInt}, ${250 - seedInt}, ${250 - seedInt}, 0.02)`;
            context.fillRect(0, 0, 1, 1);
          }
        }
        return originalToDataURL.apply(this, args as any);
      };
      HTMLCanvasElement.prototype.toDataURL = makeNative(hookedToDataURL, 'toDataURL');

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
      CanvasRenderingContext2D.prototype.getImageData = makeNative(hookedGetImageData, 'getImageData');
    }

    // ─── 4. WebGL Parameter Sanitization (Herd Blending) ───────────────────────
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
      }, 'getParameter');

      if (window.WebGL2RenderingContext) {
        const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = makeNative(function(this: WebGL2RenderingContext, pname: number) {
          if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL) {
            return sanitizeWebGLParam(this, pname);
          }
          return getParameter2Proto.call(this, pname);
        }, 'getParameter');
      }
    }

    // ─── 5. Audio Fingerprint Protection (OfflineAudioContext Probe Guard) ──────
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
                const sampleIdx = Math.floor(originSeed * (channelData.length - 1));
                const direction = (originHash % 2 === 0) ? 1 : -1;
                channelData[sampleIdx] += (direction * 0.000005);
              }
            }
          } catch {}
          return renderedBuffer;
        }, 'startRendering');
      }

      if (window.AudioBuffer) {
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = makeNative(function(this: AudioBuffer, channel: number) {
          const data = originalGetChannelData.call(this, channel);
          if (data && data.length > 10) {
            const index = Math.floor(originSeed * (data.length - 1));
            data[index] = Math.round(data[index] * 100000) / 100000;
          }
          return data;
        }, 'getChannelData');
      }
    }

    // ─── 6. Multi-Channel Telemetry Sanitizer (sendBeacon, fetch, XHR) ──────────
    if (policy.telemetryProtection) {
      const FINGERPRINT_KEYS = ['canvas', 'fingerprint', 'fp', 'webgl', 'audio', 'device_id', 'visitorId'];

      const isTelemetryEndpoint = (urlStr: string) => {
        return /analytics|telemetry|track|metrics|collect|beacon|event/i.test(urlStr);
      };

      const sanitizeUrlQuery = (rawUrl: string): string => {
        try {
          const parsed = new URL(rawUrl, window.location.href);
          let modified = false;
          for (const key of FINGERPRINT_KEYS) {
            if (parsed.searchParams.has(key)) {
              parsed.searchParams.set(key, '[SANITIZED_BY_VIGIL]');
              modified = true;
            }
          }
          return modified ? parsed.toString() : rawUrl;
        } catch {
          return rawUrl;
        }
      };

      const sanitizePayload = (data: any): any => {
        if (!data) return data;

        // A. JSON String
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            let modified = false;
            for (const key of FINGERPRINT_KEYS) {
              if (key in parsed && typeof parsed[key] === 'string' && parsed[key].length > 5) {
                parsed[key] = '[SANITIZED_BY_VIGIL]';
                modified = true;
              }
            }
            if (modified) return JSON.stringify(parsed);
          } catch {
            // Check for urlencoded format (e.g. v=1&fp=xyz&canvas=123)
            if (data.includes('=') && FINGERPRINT_KEYS.some(k => data.includes(`${k}=`))) {
              try {
                const params = new URLSearchParams(data);
                let modified = false;
                for (const key of FINGERPRINT_KEYS) {
                  if (params.has(key)) {
                    params.set(key, '[SANITIZED_BY_VIGIL]');
                    modified = true;
                  }
                }
                if (modified) return params.toString();
              } catch {}
            }
          }
          return data;
        }

        // B. URLSearchParams object
        if (data instanceof URLSearchParams) {
          for (const key of FINGERPRINT_KEYS) {
            if (data.has(key)) {
              data.set(key, '[SANITIZED_BY_VIGIL]');
            }
          }
          return data;
        }

        // C. FormData object
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
          for (const key of FINGERPRINT_KEYS) {
            if (data.has(key)) {
              data.set(key, '[SANITIZED_BY_VIGIL]');
            }
          }
          return data;
        }

        return data;
      };

      // 6.1 Hook navigator.sendBeacon
      if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = makeNative(function(this: Navigator, url: string | URL, data?: BodyInit | null): boolean {
          try {
            const urlStr = url.toString();
            if (isTelemetryEndpoint(urlStr)) {
              const cleanUrl = sanitizeUrlQuery(urlStr);
              const cleanData = sanitizePayload(data);
              return originalSendBeacon.call(this, cleanUrl, cleanData);
            }
          } catch {}
          return originalSendBeacon.call(this, url, data);
        }, 'sendBeacon');
      }

      // 6.2 Hook window.fetch
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = makeNative(function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
          try {
            const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
            if (isTelemetryEndpoint(urlStr)) {
              const cleanUrl = sanitizeUrlQuery(urlStr);
              if (init && init.body) {
                init.body = sanitizePayload(init.body);
              }
              return originalFetch.call(this, cleanUrl, init);
            }
          } catch {}
          return originalFetch.call(this, input, init);
        }, 'fetch');
      }

      // 6.3 Hook XMLHttpRequest.prototype.send
      if (window.XMLHttpRequest) {
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        const originalXhrSend = XMLHttpRequest.prototype.send;
        const xhrUrlMap = new WeakMap<XMLHttpRequest, string>();

        XMLHttpRequest.prototype.open = makeNative(function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
          const urlStr = url.toString();
          const cleanUrl = isTelemetryEndpoint(urlStr) ? sanitizeUrlQuery(urlStr) : urlStr;
          xhrUrlMap.set(this, cleanUrl);
          return (originalXhrOpen as any).call(this, method, cleanUrl, ...rest);
        }, 'open');

        XMLHttpRequest.prototype.send = makeNative(function(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
          try {
            const urlStr = xhrUrlMap.get(this);
            if (urlStr && isTelemetryEndpoint(urlStr) && body) {
              const cleanBody = sanitizePayload(body);
              return originalXhrSend.call(this, cleanBody);
            }
          } catch {}
          return originalXhrSend.call(this, body);
        }, 'send');
      }
    }

    // ─── 7. Global Privacy Control (GPC) ─────────────────────────────────────────
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
