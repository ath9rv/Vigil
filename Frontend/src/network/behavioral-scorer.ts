import type { CookieBehavioralDNA } from './behavioral-dna';
import { inspectJwtClaims } from './jwt-inspector';

export type BehavioralVerdictCategory = 
  | 'benign' 
  | 'suspicious' 
  | 'probable_tracker' 
  | 'high_risk_tracker';

export interface ScoredBehavioralDNA extends CookieBehavioralDNA {
  score: number;                     // 0 to 100
  category: BehavioralVerdictCategory;
  confidence: number;                // 0.00 to 1.00
  reasons: string[];                 // Itemized explainability points
}

/**
 * Weights for tracker likelihood calculation.
 * Sum of weights = 1.00.
 */
const WEIGHTS = {
  entropy: 0.20,
  persistence: 0.15,
  thirdParty: 0.20,
  behavioralAccess: 0.15,
  crossSite: 0.15,
  beaconCorrelation: 0.10,
  knownIntel: 0.05
};

/**
 * Evaluates the Behavioral DNA of a cookie and produces a calibrated,
 * explainable tracking likelihood score with authentication safeguards.
 */
export function scoreCookieBehavior(dna: CookieBehavioralDNA): ScoredBehavioralDNA {
  const reasons: string[] = [];

  // 1. Entropy Factor (0–100)
  let entropyFactor = 0;
  if (dna.entropy >= 4.5) {
    entropyFactor = 100;
    reasons.push(`High-entropy identifier (${dna.entropy.toFixed(2)} bits/byte) indicative of unique client fingerprinting.`);
  } else if (dna.entropy >= 3.5) {
    entropyFactor = 70;
    reasons.push(`Moderate entropy (${dna.entropy.toFixed(2)} bits/byte) characteristic of pseudo-random IDs.`);
  } else if (dna.entropy >= 2.5) {
    entropyFactor = 35;
  } else {
    entropyFactor = 0;
    reasons.push(`Low entropy (${dna.entropy.toFixed(2)} bits/byte) indicative of human-readable preferences or simple flags.`);
  }

  // 2. Persistence / Lifespan Factor (0–100)
  let persistenceFactor = 0;
  if (!dna.isPersistent || dna.lifespanDays === 0) {
    persistenceFactor = 0;
    reasons.push('Session-only lifespan (automatically discarded upon browser close).');
  } else if (dna.lifespanDays > 365) {
    persistenceFactor = 100;
    reasons.push(`Long-term persistence (${dna.lifespanDays} days / >1 year) tracking across browser restarts.`);
  } else if (dna.lifespanDays > 60) {
    persistenceFactor = 65;
    reasons.push(`Extended persistence (${dna.lifespanDays} days).`);
  } else {
    persistenceFactor = 30;
    reasons.push(`Short-lived persistent cookie (${dna.lifespanDays} days).`);
  }

  // 3. Third-Party Scope Factor (0–100)
  let thirdPartyFactor = 0;
  if (dna.isThirdParty) {
    thirdPartyFactor = 100;
    reasons.push(`Third-party domain scope (${dna.domain}) differing from active website origin.`);
  } else {
    thirdPartyFactor = 0;
    reasons.push('First-party domain scope set directly by visited website.');
  }

  // 4. Behavioral Access / Client Readability Factor (0–100)
  let accessFactor = 0;
  if (!dna.isHttpOnly) {
    accessFactor = 100;
    reasons.push('Client-accessible: Javascript can read/extract this cookie (HttpOnly flag missing).');
  } else {
    accessFactor = 0;
    reasons.push('Server-protected: Inaccessible to client JavaScript (HttpOnly enforced).');
  }

  // 5. Cross-Site Recurrence Factor (0–100)
  let crossSiteFactor = 0;
  if (dna.crossSiteCount >= 4) {
    crossSiteFactor = 100;
    reasons.push(`Observed recurring across ${dna.crossSiteCount} independent websites.`);
  } else if (dna.crossSiteCount >= 2) {
    crossSiteFactor = 60;
    reasons.push(`Observed across ${dna.crossSiteCount} websites.`);
  } else {
    crossSiteFactor = 0;
  }

  // 6. Beacon & Telemetry Correlation Factor (0–100)
  let beaconFactor = 0;
  if (dna.beaconCorrelated) {
    beaconFactor = 100;
    reasons.push('Directly correlated with outbound analytics/telemetry requests.');
  }

  // 7. Known Intel Confirmation (0–100)
  let intelFactor = 0;
  if (dna.knownTracker) {
    intelFactor = 100;
    reasons.push('Confirmed presence in threat intelligence blocklists.');
  }

  // Compute Base Weighted Score
  let rawScore = 
    WEIGHTS.entropy * entropyFactor +
    WEIGHTS.persistence * persistenceFactor +
    WEIGHTS.thirdParty * thirdPartyFactor +
    WEIGHTS.behavioralAccess * accessFactor +
    WEIGHTS.crossSite * crossSiteFactor +
    WEIGHTS.beaconCorrelation * beaconFactor +
    WEIGHTS.knownIntel * intelFactor;

  // ─── Security Flags & Transmission Penalties ───────────────────────────────
  if (dna.sameSite === 'none' && !dna.isSecure) {
    rawScore += 40;
    reasons.push('SEVERE: Cookie is permitted in cross-site requests (SameSite=None) but lacks Secure flag, exposing it to interception over HTTP.');
  } else if (!dna.isSecure) {
    rawScore += 10;
    reasons.push('Insecure transmission: Cookie is sent over unencrypted HTTP connections.');
  }

  // ─── Safeguard Dampeners (Preventing False Positives on Auth/CSRF) ─────────
  const lowerName = dna.name.toLowerCase();
  const isAuthLikeName = 
    lowerName.includes('token') || 
    lowerName.includes('auth') || 
    lowerName.includes('csrf') || 
    lowerName.includes('xsrf') || 
    lowerName.includes('session') || 
    lowerName.includes('jwt');

  if (dna.isHttpOnly && (dna.sameSite === 'strict' || dna.sameSite === 'lax')) {
    rawScore -= 30;
    reasons.push('Shielded by HttpOnly and SameSite policy (Typical of secure authentication sessions).');
  }

  if (dna.charsetProfile === 'jwt') {
    const jwtAnalysis = inspectJwtClaims(dna.value);
    if (jwtAnalysis.overrideDampener) {
      rawScore += 20; // Penalize for weaponized JWT
      reasons.push('SEVERE: Weaponized JWT detected (Contains high-entropy tracking claims inside an authentication container).');
      reasons.push(...jwtAnalysis.signals);
    } else {
      rawScore -= 25;
      reasons.push('Cryptographic JWT payload detected (Common user authorization bearer token).');
      if (jwtAnalysis.signals.length > 0) {
        reasons.push(...jwtAnalysis.signals);
      }
    }
  }

  if (isAuthLikeName && dna.isHttpOnly) {
    rawScore -= 25;
    reasons.push('Authentication naming semantics with strict server-only visibility.');
  }

  if (!dna.isPersistent) {
    rawScore -= 10;
  }

  // Clamp score strictly between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Determine Category Band
  let category: BehavioralVerdictCategory = 'benign';
  if (finalScore >= 80) {
    category = 'high_risk_tracker';
  } else if (finalScore >= 60) {
    category = 'probable_tracker';
  } else if (finalScore >= 30) {
    category = 'suspicious';
  } else {
    category = 'benign';
  }

  // Compute Confidence
  let signalCount = 2; // base entropy + lifespan always present
  if (dna.isThirdParty) signalCount++;
  if (dna.crossSiteCount > 1) signalCount++;
  if (dna.beaconCorrelated) signalCount += 2;
  if (dna.knownTracker) signalCount += 2;
  if (dna.isHttpOnly) signalCount++;

  const confidence = Math.min(0.96, Math.max(0.65, Math.round((0.60 + (signalCount * 0.04)) * 100) / 100));

  return {
    ...dna,
    score: finalScore,
    category,
    confidence,
    reasons
  };
}
