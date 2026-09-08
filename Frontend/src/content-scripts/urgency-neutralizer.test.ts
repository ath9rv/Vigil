// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the modules that urgency-neutralizer depends on
vi.mock('./dom-utils', () => ({
  querySelectorAllDeep: vi.fn((selector: string) => {
    return Array.from(document.querySelectorAll(selector));
  }),
}));

vi.mock('./ambient-shield', () => ({
  showAmbientAlert: vi.fn(),
}));

import { querySelectorAllDeep } from './dom-utils';
import { showAmbientAlert } from './ambient-shield';

describe('Urgency Neutralizer — DOM Mutation Overrides', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.innerHTML = '';
    vi.clearAllMocks();
  });

  it('M1-001b rules define fake_stock_depletion with neutralization directive', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const stockRule = m1Rules.rules.find((r: any) => r.id === 'M1-001b') as any;
    expect(stockRule).toBeDefined();
    expect(stockRule!.neutralization).toBeDefined();
    expect(stockRule!.neutralization.action).toBe('hide_scarcity');
    expect(stockRule!.neutralization.style_override).toContain('opacity');
  });

  it('M1-001c rules define fake_social_proof with neutralization directive', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const socialRule = m1Rules.rules.find((r: any) => r.id === 'M1-001c') as any;
    expect(socialRule).toBeDefined();
    expect(socialRule!.neutralization).toBeDefined();
    expect(socialRule!.neutralization.action).toBe('hide_social_proof');
  });

  it('M1-001 rules define false_urgency with freeze_countdown neutralization', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const urgencyRule = m1Rules.rules.find((r: any) => r.id === 'M1-001') as any;
    expect(urgencyRule).toBeDefined();
    expect(urgencyRule!.neutralization).toBeDefined();
    expect(urgencyRule!.neutralization.action).toBe('freeze_countdown');
  });

  it('M1 rules version has been updated from 2026.09.01.2', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    expect(m1Rules.version).not.toBe('2026.09.01.2');
  });

  it('M1-001b fake_stock_depletion targets text patterns for scarcity', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const stockRule = m1Rules.rules.find((r: any) => r.id === 'M1-001b') as any;
    const patterns = stockRule!.match.text_patterns;
    
    // Should match "Only 3 left"
    const test1 = patterns.some((p: string) => new RegExp(p, 'i').test('Only 3 left in stock'));
    expect(test1).toBe(true);

    // Should match "5 people are viewing"
    const test2 = patterns.some((p: string) => new RegExp(p, 'i').test('5 people are viewing this'));
    expect(test2).toBe(true);

    // Should match "selling fast"
    const test3 = patterns.some((p: string) => new RegExp(p, 'i').test('Selling fast!'));
    expect(test3).toBe(true);
  });

  it('M1-001c fake_social_proof targets fake activity patterns', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const socialRule = m1Rules.rules.find((r: any) => r.id === 'M1-001c') as any;
    const patterns = socialRule!.match.text_patterns;

    // Should match "42 people are viewing"
    const test1 = patterns.some((p: string) => new RegExp(p, 'i').test('42 people are viewing this product'));
    expect(test1).toBe(true);

    // Should match "150 sold in the last hour"
    const test2 = patterns.some((p: string) => new RegExp(p, 'i').test('150 sold in the last hour'));
    expect(test2).toBe(true);
  });

  it('M1-001b and M1-001c require e-commerce context (context_required)', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const stockRule = m1Rules.rules.find((r: any) => r.id === 'M1-001b') as any;
    const socialRule = m1Rules.rules.find((r: any) => r.id === 'M1-001c') as any;
    
    expect(stockRule!.match.context_required).toBeDefined();
    expect(stockRule!.match.context_required!.ancestor_selector).toContain('cart');
    expect(socialRule!.match.context_required).toBeDefined();
    expect(socialRule!.match.context_required!.ancestor_selector).toContain('product');
  });

  it('querySelectorAllDeep is called with countdown selectors by urgency scan logic', async () => {
    // Set up a fake countdown element
    const container = document.createElement('div');
    container.className = 'countdown-timer';
    container.textContent = '02:45:30';
    document.body.appendChild(container);

    // The mock should return the element
    (querySelectorAllDeep as any).mockReturnValueOnce([container]);
    
    const results = querySelectorAllDeep('[class*="countdown"]');
    expect(results.length).toBe(1);
    expect(results[0].textContent).toContain('02:45:30');
  });

  it('all existing M1 rules (M1-001 through M1-008) remain valid', async () => {
    const m1Rules = (await import('../../rules/m1_deceptive_commerce.json')).default;
    const ruleIds = m1Rules.rules.map((r: any) => r.id);
    
    // Original rules should still exist
    expect(ruleIds).toContain('M1-001');
    expect(ruleIds).toContain('M1-002');
    expect(ruleIds).toContain('M1-003');
    expect(ruleIds).toContain('M1-004');
    expect(ruleIds).toContain('M1-005');
    expect(ruleIds).toContain('M1-006');
    expect(ruleIds).toContain('M1-007');
    expect(ruleIds).toContain('M1-008');
    
    // New rules should also exist
    expect(ruleIds).toContain('M1-001b');
    expect(ruleIds).toContain('M1-001c');
  });
});
