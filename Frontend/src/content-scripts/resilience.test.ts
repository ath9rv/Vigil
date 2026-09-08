import { describe, it, expect } from 'vitest';
import cookieRules from '../../rules/cookie_consent_rules.json';
import m1Rules from '../../rules/m1_deceptive_commerce.json';
import m2Rules from '../../rules/m2_threat_shield.json';
import m3Rules from '../../rules/m3_privacy_consent.json';
import m4Rules from '../../rules/m4_attention_addiction.json';
import m5Rules from '../../rules/m5_social_proof.json';

describe('Vigil Rule Engine Syntax & Resilience Verification', () => {
  it('all cookie consent rule selectors must not contain unsupported jQuery pseudo-selectors', () => {
    for (const rule of cookieRules) {
      expect(rule.detector).not.toContain(':contains(');
      for (const sel of rule.reject_selectors) {
        expect(sel).not.toContain(':contains(');
        expect(sel).not.toContain(':has-text(');
      }
      for (const sel of rule.manage_selectors) {
        expect(sel).not.toContain(':contains(');
        expect(sel).not.toContain(':has-text(');
      }
    }
  });

  it('all M1 through M5 rule target selectors must be valid without non-standard pseudo-selectors', () => {
    const allRuleSets = [m1Rules, m2Rules, m3Rules, m4Rules, m5Rules];
    for (const ruleSet of allRuleSets) {
      for (const rule of ruleSet.rules) {
        if (rule.match && rule.match.target && rule.match.target !== '_document_location') {
          expect(rule.match.target).not.toContain(':has-text(');
          expect(rule.match.target).not.toContain(':contains(');
        }
        const matchAny = rule.match as any;
        if (matchAny?.structural_check?.expected_nearby) {
          expect(matchAny.structural_check.expected_nearby).not.toContain(':has-text(');
          expect(matchAny.structural_check.expected_nearby).not.toContain(':contains(');
        }
      }
    }
  });

  it('new M1 urgency neutralization rules have valid structure', () => {
    const newRules = m1Rules.rules.filter((r: any) => r.id === 'M1-001b' || r.id === 'M1-001c');
    expect(newRules.length).toBe(2);
    
    for (const rule of newRules) {
      // Must have a neutralization directive
      expect(rule.neutralization).toBeDefined();
      expect(rule.neutralization!.action).toBeDefined();
      expect(rule.neutralization!.style_override).toBeDefined();
      expect(rule.neutralization!.description).toBeDefined();
      
      // Must have valid text patterns
      expect(rule.match.text_patterns).toBeDefined();
      expect(rule.match.text_patterns!.length).toBeGreaterThan(0);
      
      // Must have context_required to prevent false positives
      expect(rule.match.context_required).toBeDefined();
      expect(rule.match.context_required!.ancestor_selector).toBeDefined();
      
      // Severity must be valid
      expect(['low', 'medium', 'high', 'severe']).toContain(rule.severity);
    }
  });

  it('all M1 rules have unique IDs', () => {
    const ids = m1Rules.rules.map((r: any) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
