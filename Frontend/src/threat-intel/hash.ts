export async function hashUrl(urlExpression: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(urlExpression);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

export function toBase64(bytes: Uint8Array): string {
  // Btoa requires a binary string
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function getPrefixBase64(fullHashBytes: Uint8Array, prefixSize: number = 4): string {
  const prefixBytes = fullHashBytes.slice(0, prefixSize);
  return toBase64(prefixBytes);
}

export function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
