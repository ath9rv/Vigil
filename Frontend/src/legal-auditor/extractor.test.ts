import { describe, it, expect, beforeEach } from 'vitest';
import { extractAndSegmentDocument, discoverLegalDocuments } from './extractor';

describe('Legal Document Extractor & Segmentation Pipeline', () => {
  beforeEach(() => {
    (globalThis as any).window = {
      location: { href: 'https://example.com/terms' }
    };
  });

  describe('1. Clause Segmentation & Context Windowing', () => {
    it('segments DOM paragraphs and attaches preceding and following context windows', async () => {
      const paragraphTexts = [
        'Paragraph one describes the initial service terms and user registration requirements.',
        'Paragraph two discusses fees, automatic renewals, and recurring monthly subscription charges.',
        'Paragraph three outlines dispute procedures and mandatory binding arbitration waivers.'
      ];

      const mockElements = paragraphTexts.map(text => ({
        textContent: text
      }));

      (globalThis as any).document = {
        title: 'Terms of Service',
        querySelector: () => ({
          querySelectorAll: (sel: string) => mockElements
        }),
        body: {
          querySelectorAll: (sel: string) => mockElements
        }
      };

      const result = await extractAndSegmentDocument();

      expect(result.clauses.length).toBe(3);
      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBe(64); // SHA-256 hex string

      const clause2 = result.clauses[1];
      expect(clause2.text).toContain('automatic renewals');
      expect(clause2.context).toContain('Paragraph one');
      expect(clause2.context).toContain('Paragraph three');
    });

    it('ignores trivial short elements (<20 characters)', async () => {
      const mockElements = [
        { textContent: 'OK' },
        { textContent: 'Back' },
        { textContent: 'This is a legally operative clause containing substantive text regarding user liability.' }
      ];

      (globalThis as any).document = {
        title: 'Terms of Service',
        querySelector: () => ({
          querySelectorAll: () => mockElements
        }),
        body: {
          querySelectorAll: () => mockElements
        }
      };

      const result = await extractAndSegmentDocument();
      expect(result.clauses.length).toBe(1);
      expect(result.clauses[0].text).toContain('legally operative clause');
    });
  });

  describe('2. Document Hashing Determinism', () => {
    it('produces identical cryptographic hashes for identical document text', async () => {
      const mockElements = [{ textContent: 'Identical text for hashing verification purposes.' }];
      (globalThis as any).document = {
        title: 'Terms',
        querySelector: () => ({ querySelectorAll: () => mockElements }),
        body: { querySelectorAll: () => mockElements }
      };

      const result1 = await extractAndSegmentDocument();
      const result2 = await extractAndSegmentDocument();

      expect(result1.hash).toBe(result2.hash);
    });

    it('produces distinct hashes when document content changes', async () => {
      (globalThis as any).document = {
        title: 'Terms',
        querySelector: () => ({
          querySelectorAll: () => [{ textContent: 'Document version A with standard arbitration waiver.' }]
        }),
        body: {
          querySelectorAll: () => [{ textContent: 'Document version A with standard arbitration waiver.' }]
        }
      };
      const resultA = await extractAndSegmentDocument();

      (globalThis as any).document = {
        title: 'Terms',
        querySelector: () => ({
          querySelectorAll: () => [{ textContent: 'Document version B with opt-out arbitration provision.' }]
        }),
        body: {
          querySelectorAll: () => [{ textContent: 'Document version B with opt-out arbitration provision.' }]
        }
      };
      const resultB = await extractAndSegmentDocument();

      expect(resultA.hash).not.toBe(resultB.hash);
    });
  });

  describe('3. Legal Link Discovery Engine', () => {
    it('finds footer policy links matching standard legal keywords', () => {
      const links = [
        { getAttribute: (attr: string) => attr === 'href' ? '/privacy-policy' : '', textContent: 'Privacy Notice' },
        { getAttribute: (attr: string) => attr === 'href' ? '/terms-and-conditions' : '', textContent: 'Terms of Service' },
        { getAttribute: (attr: string) => attr === 'href' ? '/cookie-preferences' : '', textContent: 'Cookie Policy' },
        { getAttribute: (attr: string) => attr === 'href' ? '/about-us' : '', textContent: 'About Our Team' }
      ];

      (globalThis as any).document = {
        querySelectorAll: (sel: string) => sel === 'a[href]' ? links : []
      };

      const discovered = discoverLegalDocuments();
      const urls = discovered.map(d => d.url);

      expect(discovered.length).toBe(3);
      expect(urls.some(u => u.includes('privacy-policy'))).toBe(true);
      expect(urls.some(u => u.includes('terms-and-conditions'))).toBe(true);
      expect(urls.some(u => u.includes('cookie-preferences'))).toBe(true);
      expect(urls.some(u => u.includes('about-us'))).toBe(false);
    });

    it('filters out anchor fragments, javascript links, and duplicate targets', () => {
      const links = [
        { getAttribute: (attr: string) => attr === 'href' ? '#privacy' : '', textContent: 'Privacy' },
        { getAttribute: (attr: string) => attr === 'href' ? 'javascript:void(0)' : '', textContent: 'Terms' },
        { getAttribute: (attr: string) => attr === 'href' ? '/legal/privacy' : '', textContent: 'Privacy Policy' },
        { getAttribute: (attr: string) => attr === 'href' ? '/legal/privacy' : '', textContent: 'Privacy Policy' }
      ];

      (globalThis as any).document = {
        querySelectorAll: (sel: string) => sel === 'a[href]' ? links : []
      };

      const discovered = discoverLegalDocuments();
      expect(discovered.length).toBe(1);
      expect(discovered[0].url).toContain('/legal/privacy');
    });
  });
});
