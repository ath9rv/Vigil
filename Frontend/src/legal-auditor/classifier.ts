import { SegmentedClause, ClauseAssessment, LegalClauseCategory } from './types';

const RISK_KEYWORDS = [
  'arbitration', 'class action', 'jury', 'dispute',
  'license', 'perpetual', 'irrevocable', 'reproduce', 'modify',
  'sell', 'share', 'third party', 'partner', 'advertising',
  'ai ', 'artificial intelligence', 'machine learning', 'train',
  'renew', 'subscription', 'cancel', 'billing',
  'change', 'modify the terms', 'price', 'fee',
  'terminate', 'suspend', 'sole discretion',
  'liability', 'as is', 'warranty',
  'governing law', 'jurisdiction',
  'cookie', 'tracking', 'essential', 'strictly necessary', 'analytics', 'marketing', 'consent'
];

export function filterCandidateClauses(clauses: SegmentedClause[]): SegmentedClause[] {
  return clauses.filter(c => {
    const text = c.text.toLowerCase();
    return RISK_KEYWORDS.some(kw => text.includes(kw));
  });
}

/**
 * Checks whether a matched phrase is preceded or qualified by an explicit negation
 * (e.g. "we do not sell", "will never share", "arbitration does not apply to EU residents").
 */
function isNegated(text: string, phrase: string): boolean {
  const idx = text.indexOf(phrase);
  if (idx === -1) return false;
  
  // Inspect the window of 45 characters before the phrase
  const windowStart = Math.max(0, idx - 45);
  const prefix = text.substring(windowStart, idx);
  
  const negationTerms = [
    'do not', "don't", 'does not', "doesn't", 'will not', "won't",
    'never', 'not applicable to', 'shall not', 'no right to',
    'prohibited from', 'except as required by law', 'not sell'
  ];
  
  return negationTerms.some(term => prefix.includes(term));
}

/**
 * Contextual Hierarchical Legal Classifier.
 * Replaces naive keyword matching with negation-aware, qualified clause evaluation.
 */
export async function executeLocalSLM(candidates: SegmentedClause[]): Promise<ClauseAssessment[]> {
  const assessments: ClauseAssessment[] = [];
  
  for (const clause of candidates) {
    const text = clause.text.toLowerCase();
    
    let category: LegalClauseCategory | null = null;
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let rationale = '';

    // 1. Data Sale & Sharing (with Negation Defense)
    if (text.includes('sell') && (text.includes('personal information') || text.includes('personal data'))) {
      if (isNegated(text, 'sell')) {
        // Explicit non-sale statement (Positive finding)
        category = 'DATA_SALE';
        confidence = 'HIGH';
        rationale = 'FAIR: Site explicitly affirms that it DOES NOT sell your personal data.';
      } else {
        category = 'DATA_SALE';
        confidence = 'HIGH';
        rationale = 'WARNING: Site reserves the right to sell or commercialize personal data.';
      }
    }

    // 2. Forced Arbitration & Class Action Waiver
    else if (text.includes('arbitration') || text.includes('jury trial')) {
      const isArbitrationNegated = isNegated(text, 'arbitration') || text.includes('does not apply to') || text.includes('opt-out of arbitration');
      
      if (isArbitrationNegated) {
        category = 'ARBITRATION';
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Arbitration clause contains explicit carve-outs, jurisdiction exceptions, or opt-out rights.';
      } else if (text.includes('binding') || text.includes('mandatory') || text.includes('waive any right to a jury')) {
        category = 'ARBITRATION';
        confidence = 'HIGH';
        rationale = 'TRICKY: Mandatory binding arbitration with court trial waiver. Disables your right to seek legal remedies in public courts.';
      }
    }

    // 3. Class Action Waiver
    else if (text.includes('class action') && (text.includes('waive') || text.includes('prohibit') || text.includes('solely in individual capacity'))) {
      if (!isNegated(text, 'class action')) {
        category = 'CLASS_ACTION';
        confidence = 'HIGH';
        rationale = 'TRICKY: Explicit class-action lawsuit waiver. Requires all disputes to be handled strictly as individual proceedings.';
      }
    }

    // 4. Cookies & Trackers
    else if (text.includes('cookie') || text.includes('tracking pixel') || text.includes('web beacon')) {
      category = 'DATA_SHARING';
      if ((text.includes('essential') || text.includes('strictly necessary')) && !text.includes('advertising') && !text.includes('marketing')) {
        confidence = 'HIGH';
        rationale = 'HARMLESS: Essential operational cookies. Safe to accept.';
      } else if (text.includes('marketing') || text.includes('third party') || text.includes('cross-context behavioral')) {
        confidence = 'HIGH';
        rationale = 'WARNING: Marketing and cross-site behavioral tracking cookies detected.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Site utilizes analytics or preference tracking cookies.';
      }
    }

    // 5. User Content Licensing
    else if (text.includes('perpetual') && text.includes('license') && (text.includes('content') || text.includes('submissions') || text.includes('materials'))) {
      if (!isNegated(text, 'license')) {
        category = 'CONTENT_LICENSE';
        confidence = 'HIGH';
        rationale = 'TRICKY: Grants the platform a perpetual, irrevocable, royalty-free license to use or monetize your uploaded content.';
      }
    }

    // 6. AI Model Training on User Data
    else if ((text.includes('train') || text.includes('training')) && (text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('llm') || text.includes('generative ai'))) {
      if (isNegated(text, 'train')) {
        category = 'AI_TRAINING';
        confidence = 'HIGH';
        rationale = 'FAIR: Site confirms user content is NOT used to train proprietary AI/ML models.';
      } else {
        category = 'AI_TRAINING';
        confidence = 'HIGH';
        rationale = 'TRICKY: Site uses your personal submissions or communications to train machine learning models.';
      }
    }

    // 7. Unilateral Modification
    else if (text.includes('sole discretion') && (text.includes('terminate') || text.includes('suspend') || text.includes('without notice'))) {
      category = 'TERMINATION';
      confidence = 'MEDIUM';
      rationale = 'UNFAIR: Reserves unconstrained authority to terminate access or seize account assets without prior notice.';
    }

    if (category) {
      assessments.push({
        clauseId: clause.id,
        category,
        confidence,
        rationale
      });
    }
  }
  
  return assessments;
}
