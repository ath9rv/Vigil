export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export type SiteSafetyVerdict = 'SAFE' | 'CAUTION' | 'SUSPICIOUS' | 'DANGEROUS';

export interface PrivacyGrade {
  // Immutable Site Reputation Grade (Evaluates the host itself)
  reputationGrade: LetterGrade;
  
  // Client Protection Grade (Reflects user exposure after Vigil mitigations)
  protectedGrade: LetterGrade;

  verdict: SiteSafetyVerdict;
  verdictReason: string;

  factors: {
    httpsUpgrade: boolean;
    trackersFound: number;
    trackersBlocked: number;
    trackerPrevalence: number;
    tosdrGrade: string | null;
    cookieConsentAutoHandled: boolean;
    darkPatternsFound: number;
    phishingRisk: boolean;
    formActionMismatch?: boolean;
    hostileArbitration?: boolean;
  };

  mitigations: {
    trackersNeutralized: number;
    privacyPreserved: boolean;
    threatContained: boolean;
  };
}

function scoreToGrade(score: number): LetterGrade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 45) return 'D';
  return 'F';
}

export function calculatePrivacyGrade(factors: PrivacyGrade['factors']): PrivacyGrade {
  // ─── 1. Determine Unmitigated Site Reputation (The Raw Truth) ────────────────
  let rawScore = 100;

  if (factors.phishingRisk || factors.formActionMismatch) {
    rawScore -= 60; // Instant drop to F
  }

  // Dark pattern penalties
  const dpPenalty = Math.min(factors.darkPatternsFound * 10, 40);
  rawScore -= dpPenalty;

  // Trackers found penalty
  rawScore -= Math.min(factors.trackersFound * 2, 30);
  if (factors.trackerPrevalence > 50) rawScore -= 10;

  // ToS;DR penalty
  if (factors.tosdrGrade) {
    const gradeMap: Record<string, number> = { A: 0, B: -5, C: -15, D: -30, E: -50 };
    rawScore += (gradeMap[factors.tosdrGrade] || 0);
  }

  // ─── 2. Determine Protected Score with Strict Moral Hazard Cap ─────────────
  // Rule: Blocking trackers CANNOT elevate an inherently fraudulent/phishing site!
  let protectedScore = 100;

  const activeTrackers = Math.max(0, factors.trackersFound - factors.trackersBlocked);
  protectedScore -= activeTrackers * 2;

  // Even with mitigations, active deceptive patterns cannot be erased
  protectedScore -= Math.min(factors.darkPatternsFound * 5, 20);

  // If there's hostile legal terms
  if (factors.tosdrGrade === 'E' || factors.tosdrGrade === 'D') {
    protectedScore -= 15;
  }

  // CRITICAL SAFETY CAP:
  // If the site is phishing or form action mismatched, NEVER give it above 'F' or 'D'
  if (factors.phishingRisk || factors.formActionMismatch) {
    protectedScore = Math.min(protectedScore, 35); // Hard cap at F
  } else if (factors.darkPatternsFound >= 4) {
    protectedScore = Math.min(protectedScore, 60); // Cap at C
  }

  // ─── 3. Verdict Synthesis ──────────────────────────────────────────────────
  let verdict: SiteSafetyVerdict = 'SAFE';
  let verdictReason = 'No significant deception or privacy threats detected.';

  if (factors.phishingRisk || factors.formActionMismatch) {
    verdict = 'DANGEROUS';
    verdictReason = 'High risk: Suspicious credential handling or phishing signature detected.';
  } else if (factors.darkPatternsFound >= 2) {
    verdict = 'SUSPICIOUS';
    verdictReason = `${factors.darkPatternsFound} manipulative design patterns detected on this page.`;
  } else if (factors.trackersFound > 8 || factors.tosdrGrade === 'D' || factors.tosdrGrade === 'E') {
    verdict = 'CAUTION';
    verdictReason = 'Heavy third-party surveillance tracking or unfavorable legal terms.';
  }

  const reputationGrade = scoreToGrade(Math.max(0, rawScore));
  const protectedGrade = scoreToGrade(Math.max(0, protectedScore));

  return {
    reputationGrade,
    protectedGrade,
    verdict,
    verdictReason,
    factors,
    mitigations: {
      trackersNeutralized: factors.trackersBlocked,
      privacyPreserved: factors.cookieConsentAutoHandled,
      threatContained: factors.phishingRisk || !!factors.formActionMismatch
    }
  };
}
