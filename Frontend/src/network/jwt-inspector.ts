export interface JwtInspectionResult {
  isJwtShaped: boolean;
  decodable: boolean;
  trackingScore: number;
  signals: string[];
  overrideDampener: boolean;
}

const STANDARD_CLAIMS = new Set([
  "iss", "sub", "aud", "exp", "nbf", "iat", "jti",
  "azp", "scope", "role", "roles", "permissions", "tenant", "org", "org_id"
]);

const TRACKING_KEY_PATTERNS: [RegExp, number][] = [
  [/^(device|dev)[-_]?(id|fp|fingerprint)$/i, 3],
  [/^(ad|advertising)[-_]?id$/i, 4],
  [/^(gaid|idfa|idfv)$/i, 4],
  [/fingerprint/i, 2],
  [/^uid$/i, 1],
  [/^client[-_]?id$/i, 1],
  [/^session[-_]?fp$/i, 3],
];

function base64UrlDecode(segment: string): string {
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
    return atob(padded);
  } catch (e) {
    return "";
  }
}

function looksLikeAdId(value: unknown): boolean {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function shannonEntropy(value: string): number {
  const freq: Record<string, number> = {};
  for (const ch of value) freq[ch] = (freq[ch] || 0) + 1;
  return Object.values(freq).reduce(
    (h, count) => { const p = count / value.length; return h - p * Math.log2(p); }, 0
  );
}

export function inspectJwtClaims(cookieValue: string): JwtInspectionResult {
  if (!cookieValue) {
    return { isJwtShaped: false, decodable: false, trackingScore: 0, signals: [], overrideDampener: false };
  }
  const parts = cookieValue.split(".");
  if (parts.length !== 3) {
    return { isJwtShaped: false, decodable: false, trackingScore: 0, signals: [], overrideDampener: false };
  }

  let payload: Record<string, unknown>;
  try {
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) throw new Error("Decode failed");
    payload = JSON.parse(decoded);
  } catch {
    return { isJwtShaped: true, decodable: false, trackingScore: 0, signals: ["undecodable-payload"], overrideDampener: false };
  }

  let score = 0;
  const signals: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (STANDARD_CLAIMS.has(key.toLowerCase())) continue;

    for (const [pattern, weight] of TRACKING_KEY_PATTERNS) {
      if (pattern.test(key)) { score += weight; signals.push(`claim key "${key}" matches tracking-shaped pattern`); }
    }
    if (looksLikeAdId(value)) {
      score += 2; signals.push(`claim "${key}" holds a UUID/ad-ID-shaped value`);
    } else if (typeof value === "string" && value.length >= 16 && shannonEntropy(value) > 3.5) {
      score += 1; signals.push(`claim "${key}" is a high-entropy, non-standard value`);
    }
  }

  return { isJwtShaped: true, decodable: true, trackingScore: score, signals, overrideDampener: score >= 4 };
}
