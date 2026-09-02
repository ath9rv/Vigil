export type LegalClauseCategory = 
  | 'DATA_SHARING' 
  | 'DATA_SALE' 
  | 'CONTENT_LICENSE' 
  | 'AI_TRAINING' 
  | 'ARBITRATION' 
  | 'CLASS_ACTION' 
  | 'AUTO_RENEWAL' 
  | 'PRICE_CHANGE' 
  | 'TERMINATION' 
  | 'LIABILITY' 
  | 'GOVERNING_LAW';

export interface SegmentedClause {
  id: string; // Deterministic ID, e.g., 'CLAUSE_12'
  startOffset: number;
  endOffset: number;
  text: string;
  context: string; // Surrounding paragraphs for review
}

export interface ClauseAssessment {
  clauseId: string;
  category: LegalClauseCategory;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
}

export interface DocumentExtractionResult {
  url: string;
  title: string;
  hash: string;
  retrievedAt: number;
  fullText: string;
  clauses: SegmentedClause[];
}
