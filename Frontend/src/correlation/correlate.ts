import { Finding, FindingCategory, ConfidenceLevel, SeverityLevel } from '../evidence/evidence';
import { ThreatStatus } from '../threat-intel/types';
import { SiteAssessment, CoverageState, DimensionScore } from './types';

/**
 * Normalizes findings from either the DOM scanner (shared/types.ts)
 * or the Legal Auditor (evidence/evidence.ts) into canonical Finding format.
 */
export function normalizeFinding(raw: any): Finding {
  // If already normalized with evidence and proper category, return sanitized clone
  let category: FindingCategory = 'SECURITY';
  if (raw.category && ['SECURITY', 'PRIVACY', 'DARK_PATTERN', 'LEGAL'].includes(raw.category)) {
    category = raw.category as FindingCategory;
  } else if (raw.module) {
    if (['M1', 'M4', 'M5'].includes(raw.module)) category = 'DARK_PATTERN';
    else if (raw.module === 'M2') category = 'SECURITY';
    else if (raw.module === 'M3') category = 'PRIVACY';
  }

  // Normalize severity
  let severity: SeverityLevel = 'INFO';
  const rawSev = (raw.severity || '').toString().toUpperCase();
  if (rawSev === 'CRITICAL' || rawSev === 'SEVERE') severity = 'CRITICAL';
  else if (rawSev === 'HIGH') severity = 'HIGH';
  else if (rawSev === 'MEDIUM') severity = 'MEDIUM';
  else if (rawSev === 'LOW') severity = 'LOW';

  // Normalize confidence
  let confidence: ConfidenceLevel = 'MEDIUM';
  if (raw.confidence && ['LOW', 'MEDIUM', 'HIGH'].includes(raw.confidence)) {
    confidence = raw.confidence as ConfidenceLevel;
  } else if (raw.confidenceState) {
    if (raw.confidenceState === 'confirmed') confidence = 'HIGH';
    else if (raw.confidenceState === 'disputed') confidence = 'LOW';
    else confidence = 'MEDIUM';
  }

  // Normalize interpretation
  const interpretation = raw.interpretation || raw.explanation || raw.ruleName || 'Flagged activity detected.';

  // Normalize evidence
  const evidence = raw.evidence ? {
    sourceType: raw.evidence.sourceType || 'DOM',
    sourceUrl: raw.evidence.sourceUrl || raw.pageUrl || '',
    capturedAt: typeof raw.evidence.capturedAt === 'number' 
      ? raw.evidence.capturedAt 
      : (raw.detectedAt ? new Date(raw.detectedAt).getTime() : Date.now()),
    documentHash: raw.evidence.documentHash,
    excerpt: raw.evidence.excerpt || raw.explanation || raw.ruleName,
    context: raw.evidence.context || raw.statuteRef
  } : {
    sourceType: 'DOM' as const,
    sourceUrl: raw.pageUrl || '',
    capturedAt: raw.detectedAt ? new Date(raw.detectedAt).getTime() : Date.now(),
    excerpt: raw.explanation || raw.ruleName,
    context: raw.statuteRef || ''
  };

  return {
    id: raw.id || crypto.randomUUID(),
    category,
    severity,
    confidence,
    reviewStatus: raw.reviewStatus || (confidence === 'HIGH' ? 'CONFIRMED' : 'REVIEW_NEEDED'),
    ruleId: raw.ruleId,
    ruleName: raw.ruleName,
    interpretation,
    evidence
  };
}

function calculateDimension(findings: Finding[], category: FindingCategory): DimensionScore {
  const cats = findings.filter(f => f.category === category);
  
  let score = 100;
  for (const f of cats) {
    if (f.severity === 'CRITICAL') score -= 50;
    else if (f.severity === 'HIGH') score -= 30;
    else if (f.severity === 'MEDIUM') score -= 15;
    else if (f.severity === 'LOW') score -= 5;
  }
  
  return {
    score: Math.max(0, score),
    confidence: cats.length > 0 ? 'HIGH' : 'LOW',
    evidenceCount: cats.length
  };
}

function groupFingerprintingFindings(findings: Finding[]): Finding[] {
  const fpFindings = findings.filter(f => {
    const rName = (f.ruleName || '').toLowerCase();
    const interp = (f.interpretation || '').toLowerCase();
    return rName.includes('fingerprint') || interp.includes('fingerprint');
  });
  
  const others = findings.filter(f => !fpFindings.includes(f));
  
  if (fpFindings.length > 1) {
    const merged: Finding = {
      id: crypto.randomUUID(),
      category: 'PRIVACY',
      severity: 'HIGH',
      confidence: 'HIGH',
      reviewStatus: 'CONFIRMED',
      ruleName: 'Fingerprinting Activity Detected',
      interpretation: `Detected ${fpFindings.length} distinct fingerprinting API interactions.`,
      evidence: {
        sourceType: 'DOM',
        sourceUrl: fpFindings[0]?.evidence?.sourceUrl || '',
        capturedAt: Date.now(),
        context: fpFindings.map(f => `• ${f.evidence?.context || f.ruleName || f.interpretation}`).join('\n')
      }
    };
    return [...others, merged];
  }
  
  return findings;
}

function groupSimilarDocumentFindings(findings: Finding[]): Finding[] {
  const grouped = new Map<string, Finding>();
  const others: Finding[] = [];

  for (const f of findings) {
    if (f.evidence?.sourceType === 'DOCUMENT' || f.category === 'LEGAL') {
      const key = `${f.ruleName || ''}|${f.interpretation || ''}`;
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        if (f.evidence?.excerpt && !existing.evidence?.excerpt?.includes(f.evidence.excerpt)) {
          existing.evidence.excerpt = (existing.evidence.excerpt ? existing.evidence.excerpt + '\n\n---\n\n' : '') + f.evidence.excerpt;
        }
      } else {
        grouped.set(key, JSON.parse(JSON.stringify(f)));
      }
    } else {
      others.push(f);
    }
  }

  return [...others, ...Array.from(grouped.values())];
}

export function correlateFindings(
  rawFindings: any[], 
  coverage: CoverageState,
  threatStatus: ThreatStatus = 'UNKNOWN'
): SiteAssessment {
  // 1. Normalize all findings into canonical format
  const normalized = (rawFindings || []).map(normalizeFinding);

  // 2. Correlate and group
  let correlated = groupFingerprintingFindings(normalized);
  correlated = groupSimilarDocumentFindings(correlated);
  
  // 3. Inject Threat Intel finding if flag set
  const hasThreat = correlated.some(f => f.category === 'SECURITY' && f.evidence?.sourceType === 'THREAT_INTEL');
  if (!hasThreat && (threatStatus === 'KNOWN_MALWARE' || threatStatus === 'KNOWN_PHISHING')) {
    correlated.push({
      id: crypto.randomUUID(),
      category: 'SECURITY',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      reviewStatus: 'CONFIRMED',
      ruleName: threatStatus === 'KNOWN_MALWARE' ? 'Malware Distribution' : 'Known Phishing',
      interpretation: 'Current URL matched local threat intelligence.',
      evidence: {
        sourceType: 'THREAT_INTEL',
        sourceUrl: '',
        capturedAt: Date.now(),
        context: `Status: ${threatStatus}`
      }
    });
  }

  // 4. Calculate dimensional scores
  const security = calculateDimension(correlated, 'SECURITY');
  const privacy = calculateDimension(correlated, 'PRIVACY');
  const fairness = calculateDimension(correlated, 'DARK_PATTERN');
  const legal = calculateDimension(correlated, 'LEGAL');

  const totalScore = Math.round((security.score + privacy.score + fairness.score + legal.score) / 4);

  let coverageScore = 0;
  if (coverage.pageBehavior) coverageScore++;
  if (coverage.threatIntel) coverageScore++;
  if (coverage.thirdPartyRequests) coverageScore++;
  if (coverage.legalReviewed) coverageScore++;
  if (coverage.strictPrivacyEnabled) coverageScore++;
  
  let overallConfidence: ConfidenceLevel = 'LOW';
  if (coverageScore >= 4) overallConfidence = 'HIGH';
  else if (coverageScore >= 2) overallConfidence = 'MEDIUM';

  return {
    security,
    privacy,
    fairness,
    legal,
    overall: totalScore,
    confidence: overallConfidence,
    coverage,
    threatStatus,
    findingCount: correlated.length,
    generatedAt: Date.now(),
    correlatedFindings: correlated
  };
}
