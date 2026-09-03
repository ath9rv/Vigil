import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyDomain, getBlockedTrackerStats, TRACKER_DOMAINS } from './tracker-stats';
import trackerBlocklist from '../../rules/tracker_blocklist.json';
import urlSanitizer from '../../rules/url_sanitizer.json';

describe('Network Tracker Blocking & DNR Ruleset Verification', () => {
  beforeEach(() => {
    (globalThis as any).chrome = {
      declarativeNetRequest: {
        getMatchedRules: vi.fn(async () => ({
          rulesMatchedInfo: [
            { rule: { ruleId: 1001 } },
            { rule: { ruleId: 1001 } },
            { rule: { ruleId: 1002 } },
            { rule: { ruleId: 1003 } },
            { rule: { ruleId: 1005 } },
            { rule: { ruleId: 1007 } }
          ]
        }))
      }
    };
  });

  describe('1. Tracker Classification Taxonomy', () => {
    it('accurately identifies advertising trackers', () => {
      expect(classifyDomain('doubleclick.net')).toBe('advertising');
      expect(classifyDomain('googleadservices.com')).toBe('advertising');
      expect(classifyDomain('amazon-adsystem.com')).toBe('advertising');
      expect(classifyDomain('criteo.com')).toBe('advertising');
      expect(classifyDomain('adnxs.com')).toBe('advertising');
      expect(classifyDomain('subdomain.taboola.com')).toBe('advertising');
    });

    it('accurately identifies analytics telemetry platforms', () => {
      expect(classifyDomain('google-analytics.com')).toBe('analytics');
      expect(classifyDomain('hotjar.com')).toBe('analytics');
      expect(classifyDomain('mixpanel.com')).toBe('analytics');
      expect(classifyDomain('segment.io')).toBe('analytics');
      expect(classifyDomain('clarity.ms')).toBe('analytics');
    });

    it('accurately identifies social widgets and tracking pixels', () => {
      expect(classifyDomain('connect.facebook.net')).toBe('social');
      expect(classifyDomain('platform.twitter.com')).toBe('social');
      expect(classifyDomain('platform.linkedin.com')).toBe('social');
    });

    it('accurately identifies fingerprinting and cryptomining beacons', () => {
      expect(classifyDomain('cdn.krxd.net')).toBe('fingerprinting');
      expect(classifyDomain('iovation.com')).toBe('fingerprinting');
      expect(classifyDomain('coinhive.com')).toBe('cryptomining');
      expect(classifyDomain('minero.cc')).toBe('cryptomining');
    });

    it('returns null for benign first-party application hosts', () => {
      expect(classifyDomain('amazon.in')).toBeNull();
      expect(classifyDomain('wikipedia.org')).toBeNull();
      expect(classifyDomain('github.com')).toBeNull();
      expect(classifyDomain('india.gov.in')).toBeNull();
    });
  });

  describe('2. Declarative Net Request (DNR) Ruleset Integrity', () => {
    it('tracker_blocklist.json contains valid structured rules with unique IDs', () => {
      expect(Array.isArray(trackerBlocklist)).toBe(true);
      expect(trackerBlocklist.length).toBeGreaterThan(0);

      const ids = new Set<number>();
      for (const rule of trackerBlocklist) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('action');
        expect(rule.action.type).toBe('block');
        expect(rule).toHaveProperty('condition');
        expect(ids.has(rule.id)).toBe(false);
        ids.add(rule.id);
      }
    });

    it('url_sanitizer.json correctly specifies tracking query parameter removals', () => {
      expect(Array.isArray(urlSanitizer)).toBe(true);
      const sanitizerRule = urlSanitizer[0];
      expect(sanitizerRule.action.type).toBe('redirect');
      const removeParams = sanitizerRule.action.redirect.transform.queryTransform.removeParams;
      expect(removeParams).toContain('utm_source');
      expect(removeParams).toContain('utm_medium');
      expect(removeParams).toContain('fbclid');
      expect(removeParams).toContain('gclid');
    });
  });

  describe('3. Blocked Tracker Stats Aggregator', () => {
    it('correctly compiles counts across categories from matched DNR events', async () => {
      const stats = await getBlockedTrackerStats();
      expect(stats.total).toBe(6);
      expect(stats.categories.advertising).toBe(2);
      expect(stats.categories.analytics).toBe(1);
      expect(stats.categories.social).toBe(1);
      expect(stats.categories.fingerprinting).toBe(1);
      expect(stats.categories.cryptomining).toBe(1);
    });
  });
});
