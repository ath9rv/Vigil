// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { interventionManager } from '../intervention/manager';
import { siteGovernance } from '../intervention/site-governance';
import { ProtectionMode } from '../intervention/types';

describe('Vigil V2.1 RC1 Certification: 11-Category Real-World Compatibility Corpus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    interventionManager.clear();
    siteGovernance.clear();
    interventionManager.setProtectionMode('ACTIVE');
    interventionManager.setDryRun(false);
  });

  // Helper to test an archetype across all 4 operational modes
  function runArchetypeMultiModeTest(
    category: string,
    setupDOM: () => HTMLElement,
    targetSelector: string,
    expectedSafetyClass: 'SAFE' | 'CAUTIOUS' | 'RESTRICTED' | 'BLOCKED',
    domain: string
  ) {
    const modes: ProtectionMode[] = ['ACTIVE', 'SAFE_ONLY', 'OBSERVE_ONLY', 'OFF'];

    for (const mode of modes) {
      document.body.innerHTML = '';
      const root = setupDOM();
      document.body.appendChild(root);
      const target = root.querySelector(targetSelector) as HTMLElement;
      expect(target).not.toBeNull();

      interventionManager.setProtectionMode(mode);
      const record = interventionManager.applyIntervention(target, {
        reason: `Compatibility test for ${category}`,
        confidenceState: 'HIGH',
        origin: `https://${domain}`,
      });

      if (mode === 'OFF') {
        expect(record).toBeNull();
        expect(target.style.opacity).toBe('');
      } else if (expectedSafetyClass === 'BLOCKED') {
        // Invariant D: Hard safety gates override mode setting
        expect(record).not.toBeNull();
        expect(record?.reason).toContain('DECISION_GATE_BLOCKED');
        expect(record?.rollbackAvailable).toBe(false);
        expect(target.style.opacity).toBe('');
      } else if (mode === 'OBSERVE_ONLY') {
        expect(record).not.toBeNull();
        expect(record?.reason).toContain('OBSERVE_ONLY_MODE');
        expect(record?.rollbackAvailable).toBe(false);
        expect(target.style.opacity).toBe('');
      } else if (mode === 'ACTIVE') {
        if (expectedSafetyClass === 'SAFE' || expectedSafetyClass === 'CAUTIOUS') {
          expect(record?.status).toBe('ACTIVE');
          expect(record?.verificationResult).toBe('PASS');
          expect(record?.diagnosticScore?.hardSafetyGatePassed).toBe(true);
          expect(record?.rollbackAvailable).toBe(true);
          expect(target.style.opacity).toBe('0.3');
        }
      }
    }
  }

  // ─── 1. E-COMMERCE ────────────────────────────────────────────────────────
  it('Category 1: E-Commerce (Shopify / Amazon product card with urgency badge)', () => {
    runArchetypeMultiModeTest(
      'E-Commerce',
      () => {
        const el = document.createElement('div');
        el.className = 'ecommerce-page';
        el.innerHTML = `
          <div class="product-gallery"><img src="item.jpg" alt="Item" /></div>
          <div class="product-info">
            <h1>Premium Leather Boots</h1>
            <div class="scarcity-urgency">⚡ Hurry, only 3 left at this price!</div>
            <button class="add-to-cart-btn">Add to Cart</button>
            <a href="/cart" class="cart-link">View Cart</a>
          </div>
        `;
        return el;
      },
      '.scarcity-urgency',
      'CAUTIOUS',
      'shop.example.com'
    );
  });

  // ─── 2. BANKING & FINANCIAL SERVICES ──────────────────────────────────────
  it('Category 2: Banking & Financial (Account portal with OTP authentication gate)', () => {
    runArchetypeMultiModeTest(
      'Banking',
      () => {
        const el = document.createElement('div');
        el.className = 'banking-portal';
        el.innerHTML = `
          <header><h2>Secure Wire Transfer</h2></header>
          <form id="transfer-form" action="/auth/wire">
            <label for="otp-input">Enter 6-digit Secure OTP</label>
            <input type="password" id="otp-input" autocomplete="one-time-code" />
            <div class="session-warning">Session timeout in 01:45</div>
            <button type="submit">Authorize Transfer</button>
          </form>
        `;
        return el;
      },
      '#otp-input',
      'BLOCKED', // Invariant: Payment/Auth form controls are strictly BLOCKED
      'secure.mybank.com'
    );
  });

  // ─── 3. SAAS DASHBOARDS ───────────────────────────────────────────────────
  it('Category 3: SaaS Dashboards (Cloud monitoring with high-frequency metric widgets)', () => {
    runArchetypeMultiModeTest(
      'SaaS Dashboard',
      () => {
        const el = document.createElement('div');
        el.className = 'saas-analytics';
        el.innerHTML = `
          <nav class="sidebar"><a href="/overview">Overview</a><a href="/logs">Logs</a></nav>
          <main class="grid">
            <div class="metric-card">Memory: 68%</div>
            <div class="announcement-pill">Upgrade now to unlock 100GB extra storage</div>
          </main>
        `;
        return el;
      },
      '.announcement-pill',
      'CAUTIOUS',
      'app.cloudmetrics.io'
    );
  });

  // ─── 4. NEWS & EDITORIAL MEDIA ────────────────────────────────────
  it('Category 4: News & Media (Editorial article with subscription push banner)', () => {
    runArchetypeMultiModeTest(
      'News & Media',
      () => {
        const el = document.createElement('article');
        el.className = 'news-story';
        el.innerHTML = `
          <h1>Investigation: Browser Security Invariants</h1>
          <p>Paragraph 1 with essential hyperlink <a href="/reference">here</a>.</p>
          <div class="subscription-nag">Subscribe now or lose access to breaking news!</div>
          <p>Paragraph 2 continues the story uninterrupted.</p>
        `;
        return el;
      },
      '.subscription-nag',
      'CAUTIOUS',
      'times.example.org'
    );
  });

  // ─── 5. SOCIAL NETWORKS ───────────────────────────────────────────────────
  it('Category 5: Social Networks (Dynamic activity stream with FOMO notification prompt)', () => {
    runArchetypeMultiModeTest(
      'Social Networks',
      () => {
        const el = document.createElement('div');
        el.className = 'feed-container';
        el.innerHTML = `
          <div class="fomo-banner">5 friends just shared new updates in your area!</div>
          <div class="feed-posts">
            <div class="post">User A: Hello world</div>
          </div>
        `;
        return el;
      },
      '.fomo-banner',
      'CAUTIOUS',
      'social.platform.net'
    );
  });

  // ─── 6. TRAVEL & HOSPITALITY BOOKING ──────────────────────────────────────
  it('Category 6: Travel & Booking (Flight/Hotel search with simulated viewer counters)', () => {
    runArchetypeMultiModeTest(
      'Travel Booking',
      () => {
        const el = document.createElement('div');
        el.className = 'hotel-detail';
        el.innerHTML = `
          <h2>Grand Luxury Suite</h2>
          <div class="social-proof-viewer">🔥 14 people are looking at this hotel right now!</div>
          <button class="reserve-btn">Reserve Now</button>
        `;
        return el;
      },
      '.social-proof-viewer',
      'CAUTIOUS',
      'hotels.travelengine.com'
    );
  });

  // ─── 7. EDUCATION & LMS ───────────────────────────────────────────────────
  it('Category 7: Education & LMS (Online learning portal with timed assessment controls)', () => {
    runArchetypeMultiModeTest(
      'Education LMS',
      () => {
        const el = document.createElement('div');
        el.className = 'lms-exam-container';
        el.innerHTML = `
          <h3>Final Certification Exam</h3>
          <div class="exam-status">Question 10 of 50</div>
          <div class="marketing-upsell">Get certified faster with Pro Tutor access!</div>
          <button class="next-btn">Next Question</button>
        `;
        return el;
      },
      '.marketing-upsell',
      'CAUTIOUS',
      'learn.university.edu'
    );
  });

  // ─── 8. GOVERNMENT & PUBLIC SERVICES ──────────────────────────────────────
  it('Category 8: Government & Public Services (Official passport renewal tax submission)', () => {
    runArchetypeMultiModeTest(
      'Government Portal',
      () => {
        const el = document.createElement('div');
        el.className = 'gov-portal';
        el.innerHTML = `
          <h1>Official Citizen Portal</h1>
          <form id="citizen-verification-form" action="/submit">
            <label for="gov-id">National Identity Number</label>
            <input type="password" id="gov-id" />
            <button type="submit">Submit Official Record</button>
          </form>
        `;
        return el;
      },
      '#gov-id',
      'BLOCKED', // Invariant: Government ID / sensitive form is strictly BLOCKED
      'services.gov.example'
    );
  });

  // ─── 9. STREAMING & ENTERTAINMENT ─────────────────────────────────────────
  it('Category 9: Streaming Media (Video player with premium countdown interstitial)', () => {
    runArchetypeMultiModeTest(
      'Streaming Media',
      () => {
        const el = document.createElement('div');
        el.className = 'player-wrapper';
        el.innerHTML = `
          <div class="video-canvas">Video Playing...</div>
          <div class="ad-countdown-overlay">Offer ending: Upgrade to Ad-Free in 0:10</div>
          <div class="player-controls"><button id="play-btn">Play/Pause</button></div>
        `;
        return el;
      },
      '.ad-countdown-overlay',
      'CAUTIOUS',
      'stream.entertainment.tv'
    );
  });

  // ─── 10. DEVELOPER TOOLS & DOCUMENTATION ──────────────────────────────────
  it('Category 10: Developer Tools (API documentation with sponsor notice banner)', () => {
    runArchetypeMultiModeTest(
      'Developer Tools',
      () => {
        const el = document.createElement('div');
        el.className = 'dev-docs';
        el.innerHTML = `
          <nav class="toc"><a href="#auth">Auth</a><a href="#endpoints">Endpoints</a></nav>
          <pre><code>curl https://api.service.io/v1/health</code></pre>
          <div class="sponsor-nag">Limited time: Claim $500 free cloud credits today!</div>
        `;
        return el;
      },
      '.sponsor-nag',
      'CAUTIOUS',
      'docs.developerhub.io'
    );
  });

  // ─── 11. HIGH-FRICTION INTERACTIVE WEB APPS ───────────────────────────────
  it('Category 11: High-Friction Web Apps (Interactive canvas suite with floating promo banner)', () => {
    runArchetypeMultiModeTest(
      'Interactive Web App',
      () => {
        const el = document.createElement('div');
        el.className = 'canvas-app';
        el.innerHTML = `
          <div class="toolbar"><button id="tool-pen">Pen</button><button id="tool-select">Select</button></div>
          <div class="workspace-area"><canvas id="artboard" width="800" height="600"></canvas></div>
          <div class="trial-scarcity-pill">7 days left in your free trial. Subscribe today!</div>
        `;
        return el;
      },
      '.trial-scarcity-pill',
      'CAUTIOUS',
      'app.designstudio.cloud'
    );
  });
});
