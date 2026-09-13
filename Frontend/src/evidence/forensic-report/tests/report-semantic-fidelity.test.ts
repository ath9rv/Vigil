import { describe, it, expect } from 'vitest';
import { ForensicReportBuilder } from '../report-builder';
import { ForensicReportFormatter } from '../report-formatter';
import { createMockForensicsEnvironment } from './fixtures';
import type { VerdictResolution } from '../../../shared/types';
import type { HypothesisEvaluationResult } from '../../v4/types';

describe('Layer 3: Semantic Fidelity Invariant (INV-V4-023)', () => {
  const builder = new ForensicReportBuilder();

  it('INV-V4-023: faithfully preserves epistemic meaning without inflation across all 3 levels', () => {
    const env = createMockForensicsEnvironment('nav-fidelity-mod');

    // Moderate evidence scenario (0.62 confidence, plausible hypothesis)
    const modVerdict: VerdictResolution = {
      eligibility: 'ELIGIBLE',
      verdict: { type: 'DECEPTIVE_UI_PATTERN', summary: 'Potential price disparity observed' },
      claimId: 'claim-mod-1',
      confidence: 0.62,
      supportingEvidenceIds: ['obs-nav-fidelity-mod-1'],
      contradictingEvidenceIds: [],
      rejectedInferences: [],
      explanation: 'Potential fee discrepancy.',
    };

    const modHypotheses: HypothesisEvaluationResult = {
      navigationId: env.navId,
      activeHypotheses: [
        {
          id: 'hyp-1',
          navigationId: env.navId,
          type: 'DECEPTIVE_DRIP_PRICING',
          category: 'DECEPTIVE',
          status: 'PLAUSIBLE',
          confidence: 0.65,
          supportingCandidateIds: ['cand-1'],
          contradictoryCandidateIds: [],
          rationale: 'Fee appeared post-progression but initial disclosure is ambiguous.',
        },
      ],
      leadingHypothesis: {
        id: 'hyp-1',
        navigationId: env.navId,
        type: 'DECEPTIVE_DRIP_PRICING',
        category: 'DECEPTIVE',
        status: 'PLAUSIBLE',
        confidence: 0.65,
        supportingCandidateIds: ['cand-1'],
        contradictoryCandidateIds: [],
        rationale: 'Fee appeared post-progression but initial disclosure is ambiguous.',
      },
      rejectedAlternatives: [
        {
          id: 'hyp-2',
          navigationId: env.navId,
          type: 'INNOCUOUS_REGIONAL_TAX',
          category: 'INNOCUOUS',
          status: 'DISPROVED',
          confidence: 0.1,
          supportingCandidateIds: [],
          contradictoryCandidateIds: ['cand-1'],
          rationale: 'Separate tax item exists.',
          rejectedReason: 'Contradicted by itemized regional sales tax.',
        },
      ],
      timestamp: 1000,
      totalEvaluated: 2,
      governorYielded: false,
    };

    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://test.example.com', domain: 'test.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: modVerdict,
      hypothesisResult: modHypotheses,
    });

    // Verify Builder never altered the verdict
    expect(report.verdict.confidence).toBe(0.62);
    expect(report.verdict.type).toBe('DECEPTIVE_UI_PATTERN');

    // Level 1: Must NOT claim definitive deception
    const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);
    expect(l1.confidenceDisplay.label).toBe('MODERATE EVIDENCE');
    expect(l1.confidenceDisplay.explanation).toContain('Moderate evidence support');
    expect(l1.nonIntentDisclaimer).toContain("does not establish the company's intent");

    // Level 2: Preserves tentative hypothesis status
    const l2 = ForensicReportFormatter.toLevel2EvidenceView(report);
    expect(l2.evaluatedHypotheses.find(h => h.hypothesisId === 'hyp-1')?.status).toBe('PLAUSIBLE');
    expect(l2.rejectedAlternatives?.some(r => r.includes('REGIONAL TAX'))).toBe(true);

    // Level 3: Full trace with exact uninflated numbers
    const l3 = ForensicReportFormatter.toLevel3ForensicView(report);
    expect(l3.fullReport.verdict.confidence).toBe(0.62);
  });

  it('INV-V4-023: faithfully reflects CONTRADICTORY_EVIDENCE and prevents deceptive claims', () => {
    const env = createMockForensicsEnvironment('nav-fidelity-contra');

    const contraVerdict: VerdictResolution = {
      eligibility: 'ELIGIBLE',
      verdict: { type: 'DECEPTIVE_UI_PATTERN', summary: 'Disputed pattern' },
      claimId: 'claim-contra-1',
      confidence: 0.40,
      supportingEvidenceIds: ['obs-nav-fidelity-contra-1'],
      contradictingEvidenceIds: ['obs-nav-fidelity-contra-2'],
      rejectedInferences: [],
      explanation: 'Hard contradiction detected.',
    };

    const report = builder.buildReport({
      navigationId: env.navId,
      subject: { url: 'https://test.example.com', domain: 'test.example.com' },
      graph: env.graph,
      timeline: env.timeline,
      verdictResolution: contraVerdict,
    });

    expect(report.uncertainty[0].level).toBe('CONTRADICTORY_EVIDENCE');
    expect(report.uncertainty[0].statement).toContain('Contradictory evidence detected');

    const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);
    expect(l1.confidenceDisplay.label).toBe('CONTRADICTORY EVIDENCE');
  });
});
