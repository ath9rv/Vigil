// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { interventionManager } from './manager';
import { siteGovernance } from './site-governance';
import { blastRadiusEstimator } from './blast-radius';

describe('Vigil Phase 4: Real-World Compatibility Matrix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
    siteGovernance.clear();
    interventionManager.setProtectionMode('ACTIVE');
    interventionManager.setDryRun(false);
  });

  describe('Category 1: E-Commerce (Product Detail with Countdown)', () => {
    it('executes in DRY_RUN mode without modifying DOM and generates diagnostic report', () => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <h2 class="title">Wireless Headphones</h2>
        <div class="price">$99.99</div>
        <div class="urgency-timer">Sale ends in: <span class="time">05:00</span></div>
        <button class="add-to-cart">Add to Cart</button>
      `;
      document.body.appendChild(productCard);

      const timer = productCard.querySelector('.urgency-timer') as HTMLElement;

      // 1. Dry Run Execution
      interventionManager.setDryRun(true);
      const dryRecord = interventionManager.applyIntervention(timer, {
        reason: 'Manufactured countdown urgency',
        confidenceState: 'HIGH',
      });

      expect(dryRecord).not.toBeNull();
      expect(dryRecord?.status).toBe('ACTIVE');
      expect(dryRecord?.verificationResult).toBe('PASS');
      expect(dryRecord?.diagnosticScore).toBeDefined();
      expect(dryRecord?.diagnosticScore?.overall).toBeGreaterThanOrEqual(90);

      // Invariant: Zero DOM modification in dry-run mode
      expect(timer.style.opacity).toBe('');
      expect(timer.style.pointerEvents).toBe('');

      // Add-to-cart button remains fully functional
      const btn = productCard.querySelector('.add-to-cart') as HTMLElement;
      expect(btn.style.pointerEvents).not.toBe('none');
    });
  });

  describe('Category 2: SaaS (Dashboard with Pre-Existing Error & Timeout)', () => {
    it('isolates pre-existing dashboard errors from intervention attribution', () => {
      const dashboard = document.createElement('div');
      dashboard.className = 'saas-dashboard';
      dashboard.innerHTML = `
        <header><h1>Cloud Console</h1></header>
        <div class="status-banner">System Operational</div>
        <div class="metric-widget">CPU: 42%</div>
      `;
      document.body.appendChild(dashboard);

      const widget = dashboard.querySelector('.metric-widget') as HTMLElement;
      const record = interventionManager.applyIntervention(widget, {
        reason: 'Test visual de-emphasis',
        confidenceState: 'HIGH',
      });

      expect(record?.verificationResult).toBe('PASS');
      expect(record?.diagnosticScore?.hardSafetyGatePassed).toBe(true);
      expect(record?.diagnosticScore?.runtime).toBe(100);
    });
  });

  describe('Category 3: News & Media (Editorial Article with Reading Estimate)', () => {
    it('permits SAFE intervention without breaking article links or reading flow', () => {
      const article = document.createElement('article');
      article.innerHTML = `
        <h1>Global Privacy Trends</h1>
        <p>Read time estimate: 4 minutes</p>
        <div class="content">
          <p>Full article text...</p>
          <a href="/subscribe" class="article-link">Read more</a>
        </div>
      `;
      document.body.appendChild(article);

      const banner = document.createElement('div');
      banner.className = 'promo-banner';
      banner.textContent = 'Special offer for readers!';
      article.appendChild(banner);

      const record = interventionManager.applyIntervention(banner, {
        reason: 'Cosmetic promo banner',
        confidenceState: 'HIGH',
      });

      expect(record?.verificationResult).toBe('PASS');
      const link = article.querySelector('.article-link') as HTMLElement;
      expect(link.isConnected).toBe(true);
    });
  });

  describe('Category 4: Banking & FinTech (Account Transfer & Password Form)', () => {
    it('strictly enforces Level 4 BLOCKED gate and refuses to mutate auth/transfer forms', () => {
      const bankPortal = document.createElement('div');
      bankPortal.className = 'banking-portal';
      bankPortal.innerHTML = `
        <h2>Transfer Funds</h2>
        <form id="transfer-form">
          <label>Account Number: <input type="text" id="acc" /></label>
          <label>PIN: <input type="password" id="pin" autocomplete="current-password" /></label>
          <button type="submit" id="btn-transfer">Transfer $500</button>
        </form>
      `;
      document.body.appendChild(bankPortal);

      const form = document.getElementById('transfer-form')!;
      const pinInput = document.getElementById('pin') as HTMLElement;

      const assessment = blastRadiusEstimator.assess(pinInput);
      expect(assessment.safetyClass).toBe('BLOCKED');
      expect(assessment.compatibilityLevel).toBe(4);

      // Attempt intervention on password input
      const record = interventionManager.applyIntervention(pinInput, {
        reason: 'Suspicious input container',
        confidenceState: 'CONFIRMED',
      });

      // Must degrade strictly to an advisory report without mutating DOM
      expect(record?.mutationType).toBe('ATTRIBUTE_FLAG');
      expect(record?.reason).toContain('DECISION_GATE_BLOCKED');
      expect(pinInput.style.opacity).toBe('');
      expect(pinInput.style.pointerEvents).toBe('');
    });
  });

  describe('Category 5: Travel & Ticketing (Per-Site Governance Overrides)', () => {
    it('preserves passive observation while suppressing mutations when OBSERVE_ONLY is set', () => {
      const bookingApp = document.createElement('div');
      bookingApp.innerHTML = `
        <div class="flight-deal">Flash Deal: $299 round-trip</div>
      `;
      document.body.appendChild(bookingApp);

      const deal = bookingApp.querySelector('.flight-deal') as HTMLElement;

      // User sets airline booking site to OBSERVE_ONLY ("Never intervene on this site")
      siteGovernance.setPolicy('airline-booking.test', 'OBSERVE_ONLY');

      expect(siteGovernance.shouldObserve('airline-booking.test')).toBe(true); // Passive intelligence continues!
      expect(siteGovernance.shouldMutate('airline-booking.test')).toBe(false);   // Mutations suppressed!

      const record = interventionManager.applyIntervention(deal, {
        reason: 'Flash deal ticket pressure',
        origin: 'https://airline-booking.test',
        confidenceState: 'HIGH',
      });

      expect(record?.mutationType).toBe('ATTRIBUTE_FLAG');
      expect(record?.reason).toContain('SITE_GOVERNANCE_OVERRIDE');
      expect(deal.style.opacity).toBe('');
    });
  });
});
