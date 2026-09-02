// Injected directly into the MAIN world at document_start.
// Stealth Anti-Fingerprinting Defense (Uniformity & Offscreen Probe Guard).
// Prevents tripping anti-bot engines (Cloudflare Turnstile, DataDome, Akamai)
// by leaving visible/onscreen canvases intact while neutralizing offscreen fingerprint probes.

(function() {
  try {
    // 32-bit FNV-1a hash
    const hashString = (str: string) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const originSeed = (hashString(window.location.hostname) % 1000) / 1000;

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

    // ─── 1. Canvas 2D Readback Protection ──────────────────────────────────────────
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

    // ─── 2. WebGL Parameter Sanitization (Hardware Herd Blending) ─────────────────
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

    // ─── 3. AudioBuffer Readback Guard ───────────────────────────────────────────
    if (window.AudioBuffer) {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(this: AudioBuffer, channel: number) {
        const data = originalGetChannelData.call(this, channel);
        if (data && data.length > 0) {
          // Normalize tiny floating point audio differences
          const index = Math.floor(originSeed * (data.length - 1));
          data[index] = Math.round(data[index] * 100000) / 100000;
        }
        return data;
      };
    }

    // ─── 4. Global Privacy Control (GPC) ─────────────────────────────────────────
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

  } catch {}
})();
