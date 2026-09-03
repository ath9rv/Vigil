// Injected directly into the MAIN world at document_start.
// Policy-Driven Controlled Active Deception & Anti-Fingerprinting Shield.
// Neutralizes fingerprinting probes and normalizes hardware specs while preserving 100% site functionality.

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
    // ─── 0. Central Policy Definition ──────────────────────────────────────────
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
      // 1. Offscreen or unattached
      if (!canvas.isConnected) return true;
      
      // 2. Hidden via style
      const style = canvas.style;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
      }

      // 3. Micro probe dimensions (fingerprinters often use 1x1 or 2x2 or 16x16)
      if ((canvas.width <= 16 && canvas.height <= 16) || canvas.width === 0 || canvas.height === 0) {
        return true;
      }

      return false;
    }

    // ─── 1. Hardware Fingerprint Normalization (Stable Fleet Persona) ───────────
    if (policy.hardwareNormalization) {
      try {
        // Standardize to the modern baseline desktop distribution: 8 cores, 8GB RAM, 24-bit color
        // Defined via prototype getters to ensure stable per-origin persona across all property reads
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          get: () => 8,
          configurable: true,
          enumerable: true
        });

        if ('deviceMemory' in Navigator.prototype) {
          Object.defineProperty(Navigator.prototype, 'deviceMemory', {
            get: () => 8,
            configurable: true,
            enumerable: true
          });
        }

        Object.defineProperty(Screen.prototype, 'colorDepth', {
          get: () => 24,
          configurable: true,
          enumerable: true
        });

        Object.defineProperty(Screen.prototype, 'pixelDepth', {
          get: () => 24,
          configurable: true,
          enumerable: true
        });
      } catch {}
    }

    // ─── 2. Canvas 2D Readback Protection ───────────────────────────────────────
    if (policy.canvasNoise) {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(this: HTMLCanvasElement, ...args: any[]) {
        if (isFingerprintProbe(this)) {
          const context = this.getContext('2d');
          if (context && this.width > 0 && this.height > 0) {
            // Apply subtle, deterministic alpha blend over 1 boundary pixel based on origin seed
            const seedInt = Math.floor(originSeed * 10) + 1;
            context.fillStyle = `rgba(${250 - seedInt}, ${250 - seedInt}, ${250 - seedInt}, 0.02)`;
            context.fillRect(0, 0, 1, 1);
          }
        }
        return originalToDataURL.apply(this, args as any);
      };

      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(
        this: CanvasRenderingContext2D, 
        x: number, y: number, w: number, h: number, ...args: any[]
      ) {
        const imageData = originalGetImageData.call(this, x, y, w, h, ...args);
        const canvas = this.canvas;
        
        if (canvas && isFingerprintProbe(canvas) && imageData && imageData.data.length >= 4) {
          // Perturb the least significant bit of the target pixel based on origin seed
          const offset = Math.floor(originSeed * 3);
          imageData.data[offset] = (imageData.data[offset] ^ 0b00000001);
        }
        return imageData;
      };
    }

    // ─── 3. WebGL Parameter Sanitization (Herd Blending) ───────────────────────
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

      WebGLRenderingContext.prototype.getParameter = function(pname: number) {
        return sanitizeWebGLParam(this, pname);
      };

      if (window.WebGL2RenderingContext) {
        const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(pname: number) {
          if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL) {
            return sanitizeWebGLParam(this, pname);
          }
          return getParameter2Proto.call(this, pname);
        };
      }
    }

    // ─── 4. Audio Fingerprint Protection (OfflineAudioContext Probe Guard) ──────
    if (policy.audioNoise) {
      const AudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (AudioContextClass) {
        const origStartRendering = AudioContextClass.prototype.startRendering;
        AudioContextClass.prototype.startRendering = async function(this: OfflineAudioContext) {
          const renderedBuffer = await origStartRendering.call(this);
          // Apply bounded, deterministic micro-perturbation without modifying playback
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
        };
      }

      if (window.AudioBuffer) {
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(this: AudioBuffer, channel: number) {
          const data = originalGetChannelData.call(this, channel);
          if (data && data.length > 10) {
            const index = Math.floor(originSeed * (data.length - 1));
            data[index] = Math.round(data[index] * 100000) / 100000;
          }
          return data;
        };
      }
    }

    // ─── 5. Telemetry Minimization & Fingerprint Sanitizer ──────────────────────
    if (policy.telemetryProtection && navigator.sendBeacon) {
      const originalSendBeacon = navigator.sendBeacon;
      navigator.sendBeacon = function(url: string | URL, data?: BodyInit | null): boolean {
        try {
          const urlStr = url.toString();
          const isTelemetry = /analytics|telemetry|track|metrics|collect|beacon|event/i.test(urlStr);
          
          if (isTelemetry && typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              let modified = false;
              ['canvas', 'fingerprint', 'fp', 'webgl', 'audio', 'device_id'].forEach(key => {
                if (key in parsed && typeof parsed[key] === 'string' && parsed[key].length > 10) {
                  parsed[key] = '[SANITIZED_BY_VIGIL]';
                  modified = true;
                }
              });
              if (modified) {
                return originalSendBeacon.call(this, url, JSON.stringify(parsed));
              }
            } catch {
              // Non-JSON payload, pass through unmodified to prevent breakage
            }
          }
        } catch {}
        return originalSendBeacon.call(this, url, data);
      };
    }

    // ─── 6. Global Privacy Control (GPC) ─────────────────────────────────────────
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
