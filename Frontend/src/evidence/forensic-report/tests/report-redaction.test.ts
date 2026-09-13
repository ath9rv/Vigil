import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { EvidenceGraph } from '../../graph';
import { TemporalEventIndex } from '../../temporal-event-index';
import type { VerdictResolution } from '../../../shared/types';

describe('Layer 3: Sensitive Data Redaction & Sanitization', () => {
  const builder = new ForensicReportBuilder();

  it('redacts credentials, auth tokens, emails, and sensitive keys from timeline and observations', () => {
    const navId = 'nav-redact-1';
    const timeline = new TemporalEventIndex();

    // Add sensitive events
    timeline.addEvent(
      navId,
      'USER_EVENT',
      'login-form',
      {
        action: 'submit',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
        authHeader: 'Bearer secret-access-token-999',
        userEmail: 'alice.private@confidential.org',
      },
      1000
    );

    timeline.addEvent(
      navId,
      'DOM',
      'cart-banner',
      {
        disclosureText: 'Contact billing at billing-support@merchant.com for cards ending in 4111 2222 3333 4444 with Bearer token-abc-123',
      },
      2000
    );

    const g = new EvidenceGraph();
    g.addNode({
      id: 'node-redact-1',
      type: 'DOM',
      navigationId: navId,
      tabId: 1,
      timestamp: 1000,
      source: 'scanner',
      strength: 1,
      context: {} as any,
      data: { sessionCookie: 'secret-session-cookie-id' },
      provenance: { collector: 'dom', collectorVersion: '1', observationId: 'obs-redact-1' },
    });

    const graph = g.createReadOnlySnapshot(navId);

    const verdictResolution: VerdictResolution = {
      eligibility: 'ELIGIBLE',
      verdict: { type: 'DECEPTIVE_UI_PATTERN', summary: 'Mandatory fee' },
      claimId: 'claim-1',
      confidence: 0.85,
      supportingEvidenceIds: ['obs-redact-1'],
      contradictingEvidenceIds: [],
      rejectedInferences: [],
      explanation: 'Analysis.',
    };

    const report = builder.buildReport({
      navigationId: navId,
      subject: { url: 'https://shop.example.com', domain: 'shop.example.com' },
      graph,
      timeline,
      verdictResolution,
    });

    // Check timeline event summary sanitization
    const evt1 = report.timeline[0];
    expect(evt1.summary).toContain('[REDACTED]');
    expect(evt1.summary).not.toContain('SuperSecretPassword123!');
    expect(evt1.summary).not.toContain('eyJhbGciOiJIUzI1Ni');

    const evt2 = report.timeline[1];
    expect(evt2.summary).toContain('Bearer [REDACTED]');
    expect(evt2.summary).toContain('[REDACTED_EMAIL]');
    expect(evt2.summary).toContain('[REDACTED_CARD]');
    expect(evt2.summary).not.toContain('billing-support@merchant.com');
    expect(evt2.summary).not.toContain('4111 2222 3333 4444');
    expect(evt2.summary).not.toContain('token-abc-123');

    // Check exported markdown report
    const md = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);
    expect(md).not.toContain('SuperSecretPassword123!');
    expect(md).not.toContain('alice.private@confidential.org');
    expect(md).not.toContain('4111 2222 3333 4444');
  });
});
