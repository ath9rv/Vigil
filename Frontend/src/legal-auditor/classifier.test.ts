import { describe, it, expect } from 'vitest';
import { executeLocalSLM, filterCandidateClauses } from './classifier';

describe('Legal Auditor Classifier & Precision Negation Engine', () => {
  describe('Amazon Real-World Policy Verification (Zero False-Positive Guarantee)', () => {
    it('does NOT misclassify Amazon Seller Services opening entity notice as Data Sale', async () => {
      const amazonOpeningClause = {
        id: 'amz-01',
        text: 'This Privacy Notice describes how Amazon Seller Services Private Limited and its affiliates including Amazon.com, Inc. (collectively "Amazon") collect and process your personal information through Amazon websites, devices, products, services, online marketplace and applications.',
        startOffset: 0,
        endOffset: 250,
        context: ''
      };

      const results = await executeLocalSLM([amazonOpeningClause]);
      // Must NOT be classified as DATA_SALE
      const dataSaleFinding = results.find(r => r.category === 'DATA_SALE');
      expect(dataSaleFinding).toBeUndefined();
    });

    it('accurately identifies Amazon "not in the business of selling" as FAIR (No Data Sale)', async () => {
      const amazonNoSaleClause = {
        id: 'amz-02',
        text: 'Information about our customers is an important part of our business and we are not in the business of selling our customers’ personal information to others. We share customers’ personal information only as described below.',
        startOffset: 0,
        endOffset: 220,
        context: ''
      };

      const results = await executeLocalSLM([amazonNoSaleClause]);
      expect(results.length).toBeGreaterThanOrEqual(1);

      const dataSaleFinding = results.find(r => r.category === 'DATA_SALE');
      expect(dataSaleFinding).toBeDefined();
      expect(dataSaleFinding?.rationale).toContain('FAIR');
      expect(dataSaleFinding?.rationale).toContain('DOES NOT sell');
    });

    it('correctly classifies operational service provider disclosures as DATA_SHARING notice, NOT data sale', async () => {
      const serviceProviderClause = {
        id: 'amz-03',
        text: 'Third-Party Service Providers: We employ other companies to perform functions on our behalf such as fulfilling orders for products or services, delivering packages, and processing payments. These service providers have access to personal information needed to perform their functions, but may not use it for other purposes.',
        startOffset: 0,
        endOffset: 320,
        context: ''
      };

      const results = await executeLocalSLM([serviceProviderClause]);
      const dataSaleFinding = results.find(r => r.category === 'DATA_SALE');
      expect(dataSaleFinding).toBeUndefined();

      const dataSharingFinding = results.find(r => r.category === 'DATA_SHARING');
      expect(dataSharingFinding).toBeDefined();
      expect(dataSharingFinding?.rationale).toContain('service providers');
      expect(dataSharingFinding?.rationale).not.toContain('WARNING');
    });

    it('correctly classifies business asset transfers (M&A) without triggering predatory data sale warnings', async () => {
      const mnaClause = {
        id: 'amz-04',
        text: 'Business Transfers: As we continue to develop our business, we might sell or buy other businesses or services. In such transactions, customer information generally is one of the transferred business assets but remains subject to the promises made in any pre-existing Privacy Notice.',
        startOffset: 0,
        endOffset: 280,
        context: ''
      };

      const results = await executeLocalSLM([mnaClause]);
      // Must NOT be classified as commercial DATA_SALE
      const dataSaleFinding = results.find(r => r.category === 'DATA_SALE');
      expect(dataSaleFinding).toBeUndefined();

      const transferFinding = results.find(r => r.category === 'DATA_SHARING');
      expect(transferFinding).toBeDefined();
      expect(transferFinding?.rationale).toContain('business asset');
    });
  });

  describe('Standard Privacy & Consumer Protection Verification', () => {
    it('flags data sale when affirmative commercial sale is explicitly stated', async () => {
      const affirmativeSaleClause = {
        id: 'aff-01',
        text: 'We reserve the right to sell your personal information and browsing profiles to commercial advertising partners.',
        startOffset: 0,
        endOffset: 110,
        context: ''
      };

      const results = await executeLocalSLM([affirmativeSaleClause]);
      const dataSaleFinding = results.find(r => r.category === 'DATA_SALE');
      expect(dataSaleFinding).toBeDefined();
      expect(dataSaleFinding?.rationale).toContain('WARNING');
    });

    it('detects mandatory binding arbitration with court trial waiver', async () => {
      const arbitrationClause = {
        id: 'arb-01',
        text: 'You agree to mandatory binding arbitration and waive any right to a jury trial in public courts.',
        startOffset: 0,
        endOffset: 95,
        context: ''
      };

      const results = await executeLocalSLM([arbitrationClause]);
      expect(results[0].category).toBe('ARBITRATION');
      expect(results[0].rationale).toContain('TRICKY');
    });

    it('detects class action lawsuit waivers', async () => {
      const classActionClause = {
        id: 'ca-01',
        text: 'Any proceedings to resolve disputes will be conducted solely on an individual basis. You waive any right to bring a class action.',
        startOffset: 0,
        endOffset: 125,
        context: ''
      };

      const results = await executeLocalSLM([classActionClause]);
      expect(results[0].category).toBe('CLASS_ACTION');
      expect(results[0].rationale).toContain('TRICKY');
    });

    it('distinguishes harmless essential cookies from behavioral marketing trackers', async () => {
      const candidates = [
        { id: 'ck-01', text: 'We use strictly necessary essential cookies to maintain user session state.', startOffset: 0, endOffset: 76, context: '' },
        { id: 'ck-02', text: 'We deploy third-party marketing cookies for cross-context behavioral advertising.', startOffset: 0, endOffset: 80, context: '' }
      ];

      const results = await executeLocalSLM(candidates);
      expect(results.length).toBe(2);
      expect(results[0].rationale).toContain('HARMLESS');
      expect(results[1].rationale).toContain('WARNING');
    });
  });
});
