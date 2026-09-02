import { DocumentExtractionResult } from './types';
import { filterCandidateClauses, executeLocalSLM } from './classifier';
import { Finding } from '../evidence/evidence';
import { fetchTosDrService } from './tosdr-client';

export async function processLegalDocument(extraction: DocumentExtractionResult): Promise<Finding[]> {
  console.log(`Vigil: Analyzing document ${extraction.title} (${extraction.hash})`);
  
  const findings: Finding[] = [];
  
  try {
    const urlObj = new URL(extraction.url);
    const domain = urlObj.hostname;
    const tosdrData = await fetchTosDrService(domain);
    
    if (tosdrData && tosdrData.points && tosdrData.points.length > 0) {
      console.log(`Vigil: Found ToS;DR data for ${domain}`);
      for (const point of tosdrData.points) {
        let severity: Finding['severity'] = 'INFO';
        if (point.classification === 'blocker') severity = 'CRITICAL';
        else if (point.classification === 'bad') severity = 'HIGH';
        else if (point.classification === 'neutral') severity = 'MEDIUM';
        
        findings.push({
          id: crypto.randomUUID(),
          category: 'LEGAL',
          severity,
          confidence: 'HIGH',
          reviewStatus: 'CONFIRMED',
          ruleId: `TOSDR-${point.id}`,
          ruleName: point.topic || 'Terms Clause',
          interpretation: `${point.title} - ${point.analysis}`,
          evidence: {
            sourceType: 'DOCUMENT',
            sourceUrl: point.source || extraction.url,
            capturedAt: Date.now(),
            documentHash: extraction.hash,
            excerpt: point.title,
            context: point.analysis
          }
        });
      }
      return findings;
    }
  } catch (err) {
    console.error('Vigil: Failed to fetch ToS;DR', err);
  }
  
  // 1. Deterministic Filtering
  const candidates = filterCandidateClauses(extraction.clauses);
  console.log(`Vigil: Filtered down to ${candidates.length} candidate clauses.`);
  
  // 2. SLM Inference
  const assessments = await executeLocalSLM(candidates);
  
  // 3. Evidence Construction & Finding Generation
  for (const assessment of assessments) {
    // Crucial: The model returned the ID, deterministic code maps it back to exact source text
    const sourceClause = extraction.clauses.find(c => c.id === assessment.clauseId);
    if (!sourceClause) continue; // Safety check
    
    findings.push({
      id: crypto.randomUUID(),
      category: 'LEGAL',
      severity: 'MEDIUM',
      confidence: assessment.confidence,
      reviewStatus: 'REVIEW_NEEDED',
      
      ruleId: `LEGAL-${assessment.category}`,
      ruleName: assessment.category.replace(/_/g, ' '),
      
      interpretation: assessment.rationale,
      
      evidence: {
        sourceType: 'DOCUMENT',
        sourceUrl: extraction.url,
        capturedAt: extraction.retrievedAt,
        documentHash: extraction.hash,
        excerpt: sourceClause.text, // EXACT extraction
        context: sourceClause.context
      }
    });
  }
  
  return findings;
}
