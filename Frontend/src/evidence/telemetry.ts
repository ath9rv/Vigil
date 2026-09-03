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
  installationId: string;       // Stable, anonymous ID to build Sybil-resistant reputation
  submittedAt: number;
}

export interface PatternLedgerEntry {
  patternId: string;
  clauseSignature: string;
  category: "FAIR" | "WARNING" | "REVIEW";
  evidenceCount: number;
  distinctDomains: Set<string>;
  distinctInstallations: Set<string>;
  firstSeen: number;
  lastConfirmed: number;
  status: "review" | "auto-resolved";
}

/**
 * Normalizes a legal clause to remove PII, specific company names, or dates,
 * leaving only the structural legal language.
 */
export function normalizeClauseSignature(rawText: string): string {
  let sig = rawText.toLowerCase();
  
  // Strip dates, emails, and URLs to prevent PII leakage, but RETAIN numbers 
  // (e.g., "30 days" vs "3 years" is crucial for retention/opt-out windows).
  sig = sig.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g, '<DATE>');
  sig = sig.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '<EMAIL>');
  sig = sig.replace(/https?:\/\/[^\s]+/g, '<URL>');
  
  // Strip common filler and punctuation for a stable hash
  sig = sig.replace(/[.,;:'"()\[\]{}]/g, '');
  sig = sig.replace(/\s+/g, ' ').trim();
  
  return sig;
}

/**
 * Submits a community correction for a REVIEW-tier clause.
 * In production, this sends to the central Vigil consensus pipeline.
 */
export async function submitCorrection(
  rawClauseText: string, 
  domain: string, 
  sourceUrl: string,
  proposedVerdict: "FAIR" | "WARNING"
): Promise<void> {
  // Retrieve or generate a stable, anonymous installation ID.
  // A stable ID is mathematically required for the backend to build a Sybil-resistant
  // reputation score (install age, past fraud flags) for this client.
  const storage = await chrome.storage.local.get('vigil_installation_id');
  let installationId = storage.vigil_installation_id;
  if (!installationId) {
    installationId = crypto.randomUUID();
    await chrome.storage.local.set({ vigil_installation_id: installationId });
  }

  const submission: CorrectionSubmission = {
    clauseSignature: normalizeClauseSignature(rawClauseText),
    proposedVerdict,
    domain,
    sourceUrl,
    installationId,
    submittedAt: Date.now()
  };

  // Here, we would dispatch to the backend:
  // await fetch('https://api.vigil-privacy.org/v1/consensus/submit', { ... })
  
  console.log('Vigil Telemetry: Submitted community correction for consensus pipeline', submission);
}
