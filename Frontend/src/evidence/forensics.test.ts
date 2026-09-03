import { describe, expect, it } from 'vitest';
import { createForensicAnalysis } from './forensics';

describe('forensic evidence ladder', () => {
  it('keeps a single DOM signal in review rather than turning it into an accusation', () => {
    const analysis = createForensicAnalysis({
      confidence: 'MEDIUM',
      reviewStatus: 'REVIEW_NEEDED',
      observed: ['A password form submits to another host.'],
      supportingEvidence: ['The destination is outside the page domain.'],
      assumptions: ['No request body was observed.'],
      coverage: { dom: true }
    });

    expect(analysis.level).toBe('SUGGESTIVE');
    expect(analysis.verdict).toBe('NEEDS_REVIEW');
    expect(analysis.coverage.network).toBe(false);
  });

  it('marks independently confirmed evidence as confirmed', () => {
    const analysis = createForensicAnalysis({
      confidence: 'HIGH',
      reviewStatus: 'CONFIRMED',
      observed: ['The current URL matched local threat intelligence.'],
      coverage: { network: true }
    });

    expect(analysis.level).toBe('CONFIRMED');
    expect(analysis.verdict).toBe('CONFIRMED');
  });

  it('uses inconclusive when legitimate counter-evidence remains', () => {
    const analysis = createForensicAnalysis({
      confidence: 'MEDIUM',
      reviewStatus: 'REVIEW_NEEDED',
      observed: ['An external identity endpoint was observed.'],
      contradictingEvidence: ['The endpoint is a recognised OAuth provider.']
    });

    expect(analysis.verdict).toBe('INCONCLUSIVE');
  });
});
