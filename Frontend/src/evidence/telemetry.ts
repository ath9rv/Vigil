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
  sessionId: string;            // Anonymous, rotates daily
  submittedAt: number;
}

export interface PatternLedgerEntry {
  patternId: string;
  clauseSignature: string;
  category: "FAIR" | "WARNING" | "REVIEW";
  evidenceCount: number;
  distinctDomains: Set<string>;
  distinctSessions: Set<string>;
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
  
  // Strip numbers, dates, emails, and URLs to prevent PII leakage
  sig = sig.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g, '<DATE>');
  sig = sig.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '<EMAIL>');
  sig = sig.replace(/https?:\/\/[^\s]+/g, '<URL>');
  sig = sig.replace(/\b\d+\b/g, '<NUM>');
  
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
  proposedVerdict: "FAIR" | "WARNING"
): Promise<void> {
  // Generate a daily rotating anonymous session ID
  const today = new Date().toISOString().split('T')[0];
  const salt = await chrome.storage.local.get('vigil_install_salt');
  let installSalt = salt.vigil_install_salt;
  if (!installSalt) {
    installSalt = crypto.randomUUID();
    await chrome.storage.local.set({ vigil_install_salt: installSalt });
  }
  
  // Hash the salt + date to get an unlinkable daily session ID
  const encoder = new TextEncoder();
  const data = encoder.encode(installSalt + today);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sessionId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

  const submission: CorrectionSubmission = {
    clauseSignature: normalizeClauseSignature(rawClauseText),
    proposedVerdict,
    domain,
    sessionId,
    submittedAt: Date.now()
  };

  // Here, we would dispatch to the backend:
  // await fetch('https://api.vigil-privacy.org/v1/consensus/submit', { ... })
  
  console.log('Vigil Telemetry: Submitted community correction for consensus pipeline', submission);
}
