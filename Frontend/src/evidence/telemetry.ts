/**
 * Vigil Telemetry & Crowd-Sourced Consensus
 * 
 * Implements the client-side reporter for the consensus-gated learning loop.
 * Privacy is paramount: No personal data is sent. Clause signatures are hashed or normalized.
 * Session IDs are rotating and anonymous.
 */

export interface CorrectionSubmission {
  clauseSignature: string;      // Normalized clause template
  proposedVerdict: "FAIR" | "WARNING";
  domain: string;
  sourceUrl: string;            // Needed for backend verification crawl
  reputationId: string;         // Bounded, 30-day rotating ID (not permanent)
  submittedAt: number;
}

export interface PatternLedgerEntry {
  patternId: string;
  clauseSignature: string;
  category: "FAIR" | "WARNING" | "REVIEW";
  evidenceCount: number;
  distinctDomains: Set<string>;
  distinctReputationIds: Set<string>;
  firstSeen: number;
  lastConfirmed: number;
  status: "review" | "auto-resolved";
}

/**
 * Normalizes a legal clause to remove PII, specific company names, or dates,
 * leaving only the structural legal language.
 */
export function normalizeClauseSignature(rawText: string, siteName?: string): string {
  let sig = rawText.toLowerCase();
  
  // Strip dates, emails, and URLs to prevent PII leakage, but RETAIN numbers 
  // (e.g., "30 days" vs "3 years" is crucial for retention/opt-out windows).
  sig = sig.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g, '<DATE>');
  sig = sig.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '<EMAIL>');
  sig = sig.replace(/https?:\/\/[^\s]+/g, '<URL>');
  
  if (siteName) {
    sig = sig.replace(new RegExp(`\\b${siteName.toLowerCase()}\\b`, 'g'), '<ORG>');
  }
  
  // Strip common filler and punctuation for a stable hash
  // A true NER pass is needed eventually for textual dates ("March 2024")
  sig = sig.replace(/[.,;:'"()\[\]{}]/g, '');
  sig = sig.replace(/\s+/g, ' ').trim();
  
  return sig;
}

const ROTATION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

async function getReputationId(): Promise<string> {
  const { vigil_rep_id, vigil_rep_id_created } = await chrome.storage.local.get([
    "vigil_rep_id", "vigil_rep_id_created"
  ]);
  const expired = !vigil_rep_id_created || Date.now() - vigil_rep_id_created > ROTATION_INTERVAL_MS;

  if (expired) {
    const fresh = crypto.randomUUID();
    await chrome.storage.local.set({ vigil_rep_id: fresh, vigil_rep_id_created: Date.now() });
    return fresh; // Old ID's history becomes unlinkable to the new one going forward
  }
  return vigil_rep_id;
}

/**
 * Submits a community correction for a REVIEW-tier clause.
 * In production, this sends to the central Vigil consensus pipeline.
 */
export async function submitCorrection(
  rawClauseText: string, 
  domain: string, 
  sourceUrl: string,
  proposedVerdict: "FAIR" | "WARNING",
  siteName?: string
): Promise<void> {
  const { vigil_telemetry_enabled } = await chrome.storage.local.get("vigil_telemetry_enabled");
  
  // Explicit consent gate: defaults to OFF. Vigil doesn't send data without permission.
  if (!vigil_telemetry_enabled) {
    return;
  }

  const reputationId = await getReputationId();

  const submission: CorrectionSubmission = {
    clauseSignature: normalizeClauseSignature(rawClauseText, siteName),
    proposedVerdict,
    domain,
    sourceUrl,
    reputationId,
    submittedAt: Date.now()
  };

  // Here, we would dispatch to the backend (currently stubbed):
  // await fetch('https://api.vigil-privacy.org/v1/consensus/submit', { ... })
}
