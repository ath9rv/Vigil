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
  'cookie', 'tracking', 'essential', 'strictly necessary', 'analytics', 'marketing', 'consent',
  'collect', 'personal data', 'personal information', 'retention', 'retain', 'delete',
  'children', 'minor', 'coppa', 'law enforcement', 'subpoena', 'government'
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
    'prohibited from', 'except as required by law', 'not sell', 'without your consent'
  ];
  
  return negationTerms.some(term => prefix.includes(term));
}

/**
 * Contextual Hierarchical Legal Classifier.
 * Multi-dimensional analysis covering data collection, sharing, cookies, user rights,
 * dispute terms, and artificial intelligence usage.
 */
export async function executeLocalSLM(candidates: SegmentedClause[]): Promise<ClauseAssessment[]> {
  const assessments: ClauseAssessment[] = [];
  
  for (const clause of candidates) {
    const text = clause.text.toLowerCase();
    
    let category: LegalClauseCategory | null = null;
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let rationale = '';

    // 1. Data Sale (with Negation Defense)
    if (text.includes('sell') && (text.includes('personal information') || text.includes('personal data') || text.includes('consumer data'))) {
      category = 'DATA_SALE';
      confidence = 'HIGH';
      if (isNegated(text, 'sell')) {
        rationale = 'FAIR: Site explicitly affirms that it DOES NOT sell your personal data.';
      } else {
        rationale = 'WARNING: Site reserves the right to sell or commercialize personal data.';
      }
    }

    // 2. Forced Arbitration & Class Action Waiver
    else if (text.includes('arbitration') || text.includes('jury trial')) {
      const isArbitrationNegated = isNegated(text, 'arbitration') || text.includes('does not apply to') || text.includes('opt-out of arbitration');
      category = 'ARBITRATION';
      if (isArbitrationNegated) {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Arbitration clause contains explicit carve-outs, jurisdiction exceptions, or opt-out rights.';
      } else if (text.includes('binding') || text.includes('mandatory') || text.includes('waive any right to a jury')) {
        confidence = 'HIGH';
        rationale = 'TRICKY: Mandatory binding arbitration with court trial waiver. Disables your right to seek legal remedies in public courts.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Site specifies private arbitration proceedings for legal dispute resolution.';
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
    else if (text.includes('cookie') || text.includes('tracking pixel') || text.includes('web beacon') || text.includes('local storage')) {
      category = 'COOKIE_POLICY';
      if ((text.includes('essential') || text.includes('strictly necessary')) && !text.includes('advertising') && !text.includes('marketing')) {
        confidence = 'HIGH';
        rationale = 'HARMLESS: Essential operational cookies. Safe to accept.';
      } else if (text.includes('marketing') || text.includes('advertising') || text.includes('third party') || text.includes('cross-context behavioral')) {
        confidence = 'HIGH';
        rationale = 'WARNING: Marketing and cross-site behavioral tracking cookies detected.';
      } else if (text.includes('analytics') || text.includes('performance') || text.includes('statistics')) {
        confidence = 'HIGH';
        rationale = 'NOTICE: Site deploys analytics cookies to measure site visits, traffic flow, and UX interactions.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Site utilizes analytics or preference tracking cookies.';
      }
    }

    // 5. Data Sharing & Third-Party Disclosure
    else if ((text.includes('share') || text.includes('disclose') || text.includes('transfer')) && 
             (text.includes('third party') || text.includes('partners') || text.includes('affiliates') || text.includes('vendors') || text.includes('service providers'))) {
      category = 'DATA_SHARING';
      if (isNegated(text, 'share') || isNegated(text, 'disclose')) {
        confidence = 'HIGH';
        rationale = 'FAIR: Site restricts third-party disclosure and promises not to share data without consent.';
      } else if (text.includes('advertising') || text.includes('marketing partners') || text.includes('commercial')) {
        confidence = 'HIGH';
        rationale = 'WARNING: Personal data is shared with third-party advertisers and commercial partners.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Data shared with third-party infrastructure vendors and cloud service providers.';
      }
    }

    // 6. User Rights & Data Control (GDPR / CCPA / DPDP)
    else if (text.includes('right to access') || text.includes('right to delete') || text.includes('request deletion') || text.includes('opt-out') || text.includes('rectification') || text.includes('data portability')) {
      category = 'USER_RIGHTS';
      confidence = 'HIGH';
      rationale = 'FAIR: Site outlines concrete privacy rights, allowing you to access, export, or delete your personal data.';
    }

    // 7. Government & Law Enforcement Disclosures
    else if ((text.includes('law enforcement') || text.includes('subpoena') || text.includes('court order') || text.includes('government agency') || text.includes('legal process')) && (text.includes('disclose') || text.includes('provide') || text.includes('comply'))) {
      category = 'GOVERNMENT_DISCLOSURE';
      confidence = 'HIGH';
      rationale = 'NOTICE: Site reserves the right to disclose records to law enforcement agencies or upon court orders.';
    }

    // 8. Data Retention Policies
    else if (text.includes('retain') && (text.includes('as long as necessary') || text.includes('indefinitely') || text.includes('retention period') || text.includes('until account deletion'))) {
      category = 'DATA_RETENTION';
      if (text.includes('indefinitely') || text.includes('perpetual')) {
        confidence = 'HIGH';
        rationale = 'WARNING: Personal information may be retained indefinitely even after account closure.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Personal data is retained for the duration necessary to provide services or satisfy statutory audits.';
      }
    }

    // 9. Children\'s Privacy Protection
    else if (text.includes('children') || text.includes('minor') || text.includes('under 13') || text.includes('under 16') || text.includes('under 18') || text.includes('coppa')) {
      category = 'CHILDREN_DATA';
      if (text.includes('do not knowingly collect') || text.includes('not directed to children')) {
        confidence = 'HIGH';
        rationale = 'HARMLESS: Site explicitly affirms it does not target minors or knowingly collect children\'s data.';
      } else {
        confidence = 'MEDIUM';
        rationale = 'NOTICE: Specific age-verification or parental consent provisions apply to minor users.';
      }
    }

    // 10. User Content Licensing
    else if (text.includes('perpetual') && text.includes('license') && (text.includes('content') || text.includes('submissions') || text.includes('materials') || text.includes('user content'))) {
      if (!isNegated(text, 'license')) {
        category = 'CONTENT_LICENSE';
        confidence = 'HIGH';
        rationale = 'TRICKY: Grants the platform a perpetual, irrevocable, royalty-free license to use or monetize your uploaded content.';
      }
    }

    // 11. AI Model Training on User Data
    else if ((text.includes('train') || text.includes('training')) && (text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('llm') || text.includes('generative ai'))) {
      category = 'AI_TRAINING';
      if (isNegated(text, 'train')) {
        confidence = 'HIGH';
        rationale = 'FAIR: Site confirms user content is NOT used to train proprietary AI/ML models.';
      } else {
        confidence = 'HIGH';
        rationale = 'TRICKY: Site uses your personal submissions or communications to train machine learning models.';
      }
    }

    // 12. Unilateral Modification & Termination
    else if (text.includes('sole discretion') && (text.includes('terminate') || text.includes('suspend') || text.includes('without notice') || text.includes('modify these terms'))) {
      category = 'TERMINATION';
      confidence = 'MEDIUM';
      rationale = 'UNFAIR: Reserves unconstrained authority to alter terms, terminate access, or seize accounts without prior notice.';
    }

    // 13. Broad Liability & Warranty Disclaimers
    else if ((text.includes('as is') || text.includes('without warranty') || text.includes('limitation of liability')) && (text.includes('consequential damages') || text.includes('indirect damages') || text.includes('disclaim all warranties'))) {
      category = 'LIABILITY';
      confidence = 'MEDIUM';
      rationale = 'NOTICE: Broad disclaimer of warranties and cap on liability for platform malfunctions or service outages.';
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
