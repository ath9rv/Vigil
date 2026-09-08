/**
 * URL Security & Anti-SSRF Protection Subsystem
 *
 * Prevents Server-Side / Client-Side Request Forgery attacks by validating
 * that external URLs requested by extension components (e.g. Legal Auditor, Threat Intel)
 * are strictly public HTTPS endpoints, completely rejecting private, loopback,
 * link-local, cloud-metadata, or internal network destinations.
 */

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  url?: URL;
}

// Regex to detect pure integer hostnames (decimal IP representation, e.g., 2130706433 = 127.0.0.1)
const DECIMAL_IP_REGEX = /^\d+$/;

// Regex to detect standard IPv4 octets
const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Validates that an external URL is safe to fetch from an elevated browser extension context.
 *
 * @param urlString - The URL to validate.
 * @returns An object indicating validity, sanitized URL instance, or rejection reason.
 */
export function validateSafeExternalUrl(urlString: string): UrlValidationResult {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string' };
  }

  const trimmed = urlString.trim();

  // 1. Protocol Validation: Strictly HTTPS
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL syntax' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Disallowed protocol "${parsed.protocol}". Only secure https: endpoints are permitted.`
    };
  }

  // 2. Port Validation: Only standard HTTPS (443) or omitted
  if (parsed.port && parsed.port !== '443') {
    return {
      valid: false,
      reason: `Non-standard port "${parsed.port}" is rejected. Only standard HTTPS (port 443) is permitted.`
    };
  }

  let hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // 3. Reject Localhost and Pseudo-Domains
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'local' ||
    hostname.endsWith('.local') ||
    hostname === 'internal' ||
    hostname.endsWith('.internal') ||
    hostname === 'test' ||
    hostname.endsWith('.test')
  ) {
    return { valid: false, reason: `Local or internal hostname "${hostname}" is rejected.` };
  }

  // 4. Reject Decimal / Octal IP Obfuscation
  if (DECIMAL_IP_REGEX.test(hostname)) {
    return { valid: false, reason: 'Integer-encoded IP address format is rejected.' };
  }

  // 5. IPv4 Address Range Validation
  const ipv4Match = hostname.match(IPV4_REGEX);
  if (ipv4Match) {
    const octets = [
      parseInt(ipv4Match[1], 10),
      parseInt(ipv4Match[2], 10),
      parseInt(ipv4Match[3], 10),
      parseInt(ipv4Match[4], 10)
    ];

    // Check octet bounds
    if (octets.some(o => o > 255)) {
      return { valid: false, reason: 'Invalid IPv4 address octet out of range.' };
    }

    // 0.0.0.0/8 (Current network)
    if (octets[0] === 0) {
      return { valid: false, reason: 'Current network 0.0.0.0/8 is rejected.' };
    }

    // 127.0.0.0/8 (Loopback)
    if (octets[0] === 127) {
      return { valid: false, reason: 'Loopback address 127.0.0.0/8 is rejected.' };
    }

    // 10.0.0.0/8 (Private RFC 1918)
    if (octets[0] === 10) {
      return { valid: false, reason: 'Private network 10.0.0.0/8 is rejected.' };
    }

    // 172.16.0.0/12 (Private RFC 1918)
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      return { valid: false, reason: 'Private network 172.16.0.0/12 is rejected.' };
    }

    // 192.168.0.0/16 (Private RFC 1918)
    if (octets[0] === 192 && octets[1] === 168) {
      return { valid: false, reason: 'Private network 192.168.0.0/16 is rejected.' };
    }

    // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. 169.254.169.254)
    if (octets[0] === 169 && octets[1] === 254) {
      return { valid: false, reason: 'Link-local / Cloud Metadata 169.254.0.0/16 is rejected.' };
    }

    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
      return { valid: false, reason: 'Carrier-Grade NAT 100.64.0.0/10 is rejected.' };
    }

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (
      (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
      (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
      (octets[0] === 203 && octets[1] === 0 && octets[2] === 113)
    ) {
      return { valid: false, reason: 'Documentation / TEST-NET IP is rejected.' };
    }

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (octets[0] >= 224) {
      return { valid: false, reason: 'Multicast or Reserved IP range is rejected.' };
    }
  }

  // 6. IPv6 Address Range Validation
  if (hostname.includes(':')) {
    const h = hostname.toLowerCase();

    // Loopback (::1) & Unspecified (::)
    if (h === '::1' || h === '::' || /^0*(:0*)*:?1$/.test(h)) {
      return { valid: false, reason: 'IPv6 loopback or unspecified address is rejected.' };
    }

    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (h.startsWith('::ffff:') || h.includes(':ffff:')) {
      return { valid: false, reason: 'IPv4-mapped IPv6 address is rejected.' };
    }

    // Link-local (fe80::/10)
    if (/^fe[89ab]/i.test(h)) {
      return { valid: false, reason: 'IPv6 link-local address fe80::/10 is rejected.' };
    }

    // Unique local (fc00::/7)
    if (/^f[cd]/i.test(h)) {
      return { valid: false, reason: 'IPv6 unique-local address fc00::/7 is rejected.' };
    }

    // Multicast (ff00::/8)
    if (h.startsWith('ff')) {
      return { valid: false, reason: 'IPv6 multicast address ff00::/8 is rejected.' };
    }
  }

  // 7. Hostname Syntax Validation (Must have at least one dot or be a valid public domain)
  if (!hostname.includes('.')) {
    return { valid: false, reason: 'Single-label or non-FQDN hostnames are rejected.' };
  }

  return { valid: true, url: parsed };
}

/**
 * Fetches an external document with strict SSRF validation, size bounding, and timeout controls.
 *
 * @param urlString - The target URL to fetch.
 * @param maxBytes - Maximum allowed payload size in bytes (default 2MB).
 * @param timeoutMs - Maximum request duration in milliseconds (default 10,000ms).
 */
export async function fetchBoundedText(
  urlString: string,
  maxBytes = 2 * 1024 * 1024,
  timeoutMs = 10000
): Promise<{ text: string; contentType: string; finalUrl: string }> {
  const validation = validateSafeExternalUrl(urlString);
  if (!validation.valid || !validation.url) {
    throw new Error(`SSRF Blocked: ${validation.reason || 'Invalid external URL'}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(validation.url.toString(), {
      method: 'GET',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html, text/plain, application/xhtml+xml;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    // Verify redirected URL is also safe (prevent open redirect to SSRF target)
    if (res.url && res.url !== urlString) {
      const redirectValidation = validateSafeExternalUrl(res.url);
      if (!redirectValidation.valid) {
        throw new Error(`SSRF Redirect Blocked: ${redirectValidation.reason}`);
      }
    }

    // Content-Type validation: only text/html, text/plain, or xhtml
    const contentType = res.headers.get('content-type') || '';
    const isText = /^(text\/|application\/xhtml\+xml)/i.test(contentType);
    if (!isText) {
      throw new Error(`Invalid response Content-Type "${contentType}". Only text/HTML documents are allowed.`);
    }

    // Content-Length pre-check
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new Error(`Response size (${contentLength} bytes) exceeds maximum limit of ${maxBytes} bytes.`);
    }

    // Read body bounded to maxBytes
    const rawText = await res.text();
    const boundedText = rawText.length > maxBytes ? rawText.slice(0, maxBytes) : rawText;

    return {
      text: boundedText,
      contentType,
      finalUrl: res.url || validation.url.toString()
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}
