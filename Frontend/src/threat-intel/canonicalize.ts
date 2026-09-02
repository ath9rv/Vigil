/**
 * Implements strict Google Web Risk / Safe Browsing URL Canonicalization
 * https://developers.google.com/safe-browsing/v4/urls-hashing#canonicalization
 */

function unescapeString(str: string): string {
  let prev = str;
  let current = decodeURIComponent(str.replace(/\+/g, '%20'));
  let iterations = 0;
  // Repeatedly unescape until there are no more hex encodings, max 100 times to prevent infinite loops
  while (prev !== current && iterations < 100) {
    prev = current;
    try {
      current = decodeURIComponent(current);
    } catch (e) {
      break; // Malformed URI component, stop unescaping
    }
    iterations++;
  }
  return current;
}

function resolvePath(path: string): string {
  // Replace multiple slashes
  path = path.replace(/\/{2,}/g, '/');
  const parts = path.split('/');
  const resolved: string[] = [];
  
  for (const part of parts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      if (resolved.length > 0) resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  
  let result = resolved.join('/');
  if (!result.startsWith('/')) result = '/' + result;
  // If original ended in slash (or /. or /..), preserve trailing slash
  if (path.endsWith('/') || path.endsWith('/.') || path.endsWith('/..')) {
    if (!result.endsWith('/')) result += '/';
  }
  return result;
}

function percentEncode(str: string): string {
  // Safe Browsing requires specific characters to be percent-escaped
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function canonicalizeUrl(rawUrl: string): { host: string, path: string, query: string } {
  // 1. Remove CR, LF, Tab
  let cleaned = rawUrl.replace(/[\x09\x0a\x0d]/g, '');
  
  // 2. Remove fragment
  const fragIndex = cleaned.indexOf('#');
  if (fragIndex !== -1) cleaned = cleaned.substring(0, fragIndex);
  
  // 3. Unescape entirely
  cleaned = unescapeString(cleaned);
  
  // Parse URL components (if it lacks scheme, prepend http:// to parse)
  if (!cleaned.match(/^[a-zA-Z0-9+.-]+:\/\//)) {
    cleaned = 'http://' + cleaned;
  }
  
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch (e) {
    return { host: '', path: '', query: '' };
  }
  
  // Canonicalize Host
  let host = url.hostname;
  host = host.replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
  host = host.replace(/\.{2,}/g, '.'); // Replace consecutive dots
  host = host.toLowerCase(); // Lowercase
  
  // Canonicalize Path
  let path = resolvePath(url.pathname || '/');
  path = percentEncode(path).replace(/%2F/ig, '/'); // encode all but slashes
  
  // Canonicalize Query
  let query = url.search ? '?' + url.search.substring(1) : '';
  
  return { host, path, query };
}

export function generateLookupExpressions(rawUrl: string): string[] {
  const { host, path, query } = canonicalizeUrl(rawUrl);
  if (!host) return [rawUrl];

  const expressions = new Set<string>();
  
  // Host variants
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  const hostVariants: string[] = [];
  
  if (isIp) {
    hostVariants.push(host);
  } else {
    const parts = host.split('.');
    hostVariants.push(host);
    // Up to 4 hostnames formed by stripping leading components
    const maxStrip = Math.min(4, parts.length - 2); 
    for (let i = 1; i <= maxStrip; i++) {
      hostVariants.push(parts.slice(i).join('.'));
    }
  }

  // Path variants
  const pathVariants: string[] = [];
  const exactPathQuery = path + query;
  pathVariants.push(exactPathQuery);
  
  if (query) {
    pathVariants.push(path);
  }
  
  const pathParts = path.split('/');
  // Successively strip from end up to 3 times
  // E.g., /a/b/c/d.html -> /a/b/c/, /a/b/, /a/
  // The split leaves an empty string at the end if it ended in a slash
  // For /a/b/c/d.html -> ['', 'a', 'b', 'c', 'd.html']
  let currentPathParts = [...pathParts];
  if (currentPathParts.length > 0 && currentPathParts[currentPathParts.length - 1] !== '') {
    currentPathParts.pop(); // remove last component (e.g. file name)
  } else if (currentPathParts.length > 1) {
    currentPathParts.pop(); // remove empty string indicating trailing slash
    currentPathParts.pop(); // remove the directory before it
  }
  
  for (let i = 0; i < 3 && currentPathParts.length > 0; i++) {
    const subPath = currentPathParts.join('/') + '/';
    if (!pathVariants.includes(subPath)) {
      pathVariants.push(subPath);
    }
    currentPathParts.pop();
  }
  
  // Combine all host and path variants
  for (const h of hostVariants) {
    for (const p of pathVariants) {
      expressions.add(h + p);
    }
  }
  
  return Array.from(expressions);
}
