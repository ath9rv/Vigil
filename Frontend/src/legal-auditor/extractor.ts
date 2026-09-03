import { DocumentExtractionResult, SegmentedClause } from './types';

export async function extractAndSegmentDocument(): Promise<DocumentExtractionResult> {
  const root = document.querySelector('main') || document.body;
  const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
  
  let fullText = '';
  const clauses: SegmentedClause[] = [];
  let currentOffset = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const el = paragraphs[i];
    const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
    
    if (text.length < 20) continue;
    
    const startOffset = currentOffset;
    const endOffset = currentOffset + text.length;
    
    const prevText = i > 0 ? (paragraphs[i-1].textContent?.trim() || '') : '';
    const nextText = i < paragraphs.length - 1 ? (paragraphs[i+1].textContent?.trim() || '') : '';
    const context = `${prevText}\n\n>>> ${text} <<<\n\n${nextText}`;
    
    clauses.push({
      id: `CLAUSE_${i}`,
      startOffset,
      endOffset,
      text,
      context
    });
    
    fullText += text + '\n\n';
    currentOffset += text.length + 2;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullText));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    url: window.location.href,
    title: document.title,
    hash: hashHex,
    retrievedAt: Date.now(),
    fullText,
    clauses
  };
}

export function discoverLegalDocuments(): { title: string; url: string }[] {
  const keywords = [
    'privacy policy', 'privacy statement', 'privacy notice', 'privacy',
    'terms of service', 'terms & conditions', 'terms of use', 'terms and conditions', 'terms',
    'user agreement', 'acceptable use', 'cookie policy', 'cookies', 'use of cookies',
    'website policies', 'disclaimer', 'legal notice', 'hyperlinking policy', 'copyright policy',
    'data protection', 'legal terms'
  ];

  const hrefPatterns = [
    /privacy/i, /terms/i, /cookie/i, /tos/i, /legal/i, /disclaimer/i, /policy/i, /policies/i
  ];

  const links = Array.from(document.querySelectorAll('a[href]'));
  const found: { title: string; url: string }[] = [];
  const uniqueUrls = new Set<string>();

  for (const link of links) {
    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(rawHref, window.location.href).href;
    } catch {
      continue;
    }

    // Only inspect links on the same origin or legal subdomain
    try {
      const parsed = new URL(absoluteUrl);
      if (!parsed.protocol.startsWith('http')) continue;
    } catch {
      continue;
    }

    const text = (link.textContent || '').toLowerCase().trim();
    const titleAttr = (link.getAttribute('title') || '').toLowerCase().trim();
    const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase().trim();
    const combinedText = `${text} ${titleAttr} ${ariaLabel}`.trim();

    const matchedKeyword = keywords.find(k => combinedText.includes(k));
    const matchedHref = hrefPatterns.some(p => p.test(rawHref));

    if (matchedKeyword || matchedHref) {
      if (!uniqueUrls.has(absoluteUrl)) {
        uniqueUrls.add(absoluteUrl);
        const displayTitle = link.textContent?.trim() || link.getAttribute('title')?.trim() || matchedKeyword || 'Legal Document';
        // Clean up overly long or empty link text
        const cleanTitle = displayTitle.length > 50 ? displayTitle.substring(0, 47) + '...' : displayTitle;
        found.push({
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          url: absoluteUrl
        });
      }
    }
  }

  return found;
}
