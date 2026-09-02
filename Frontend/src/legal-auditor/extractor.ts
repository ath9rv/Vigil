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
  const keywords = ['privacy policy', 'terms of service', 'terms & conditions', 'user agreement', 'acceptable use'];
  const links = Array.from(document.querySelectorAll('a'));
  const found: { title: string; url: string }[] = [];
  
  for (const link of links) {
    const text = link.textContent?.toLowerCase().trim() || '';
    if (keywords.some(k => text.includes(k))) {
      found.push({
        title: link.textContent!.trim(),
        url: link.href
      });
    }
  }
  
  const uniqueUrls = new Set();
  return found.filter(f => {
    if (uniqueUrls.has(f.url)) return false;
    uniqueUrls.add(f.url);
    return true;
  });
}
