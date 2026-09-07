import { SegmentedClause, ClauseAssessment, LegalClauseCategory } from './types';
import { findClauseNegation } from './negation-parser';

/**
 * High-precision regex patterns for filtering candidate clauses.
 * Uses strict word boundaries (\b) to eliminate substring collisions
 * (e.g. preventing "seller" or "bookseller" from matching data sale,
 * or "injury" from matching jury trial).
 */
const CANDIDATE_PATTERNS: RegExp[] = [
  /\b(arbitrat(e|ion|or)|jury\s+trial|trial\s+by\s+jury|class\s+action)\b/i,
  /\b(perpetual|irrevocable)\b.*\b(license|reproduce|modify|sub[- ]?license)\b/i,
  /\b(sell|selling|sale\s+of|monetiz(e|ation)|commercializ(e|ation))\b/i,
  /\b(share|shared|disclos(e|ure)|transfer)\b.*\b(third\s+part(y|ies)|affiliates|partners|vendors|service\s+providers)\b/i,
  /\b(artificial\s+intelligence|machine\s+learning|ai\s+models?|llms?|generative\s+ai)\b/i,
  /\b(train|training)\b.*\b(ai|artificial\s+intelligence|machine\s+learning|model)\b/i,
  /\b(auto[- ]renew|automatic\s+renewal|subscription|recurring\s+charge)\b/i,
  /\b(sole\s+discretion)\b.*\b(terminat(e|ion)|suspend|modify\s+these\s+terms|cancel)\b/i,
  /\b(disclaim(er|s)?|limitation\s+of\s+liability|as\s+is|without\s+warrant(y|ies))\b/i,
  /\b(cookie|tracking\s+pixel|web\s+beacon|local\s+storage)\b/i,
  /\b(right\s+to\s+(access|delete|erasure|portability)|request\s+deletion|opt[- ]out)\b/i,
  /\b(law\s+enforcement|subpoena|court\s+order|government\s+agenc(y|ies)|legal\s+process)\b/i,
  /\b(retain|retention\s+period)\b.*\b(indefinitely|as\s+long\s+as\s+necessary|years)\b/i,
  /\b(children|minor|under\s+(13|16|18)|coppa)\b/i,
  /\b(indemnify|hold\s+harmless|defend\s+us)\b/i,
  /\b(governing\s+law|jurisdiction|venue|resolved\s+in\s+the\s+courts\s+of)\b/i,
  /\b(prices?|fees?|subscription\s+rates?|charges?)\b.*\b(change|increase|modify)\b/i,
  /\b(data\s+breach|security\s+breach|unauthorized\s+access)\b/i,
  /\b(biometric|precise\s+geolocation|health\s+information|financial\s+information)\b/i
];

export function filterCandidateClauses(clauses: SegmentedClause[]): SegmentedClause[] {
  return clauses.filter(c => {
    const text = c.text;
    return CANDIDATE_PATTERNS.some(pat => pat.test(text));
  });
}

/**
 * Precision Negation Engine.
 * Detects explicit negations, carve-outs, and statutory disclaimers
 * across both global sentence patterns and prefix windows.
 */
export function isNegated(text: string, keywordOrPattern: string | RegExp): boolean {
  const pattern = typeof keywordOrPattern === 'string' ? new RegExp(`\\b${keywordOrPattern}\\b`, 'i') : keywordOrPattern;
  const findings = findClauseNegation(text, pattern);
  return findings.some(f => f.negated);
}

/**
 * Contextual Hierarchical Legal Classifier.
 * Multi-dimensional analysis with rigorous word-boundary parsing,
 * distinguishing data sales from operational service providers, business transfers, and affiliate sharing.
 */
export async function executeLocalSLM(candidates: SegmentedClause[]): Promise<ClauseAssessment[]> {
  const assessments: ClauseAssessment[] = [];

  for (const clause of candidates) {
    const text = clause.text;
    const lower = text.toLowerCase();

    let category: LegalClauseCategory | null = null;
    let confidence: 'OBSERVED' | 'SUGGESTIVE' | 'CONFIRMED' = 'OBSERVED';
    let rationale = '';

    // ─── 1. Commercial Data Sale (Strict Verb & Object Binding) ──────────────
    // Matches \b(sell|selling|sale of|monetize)\b bound to personal/consumer/customer data
    const isSaleVerbPresent = /\b(sell|selling|sale\s+of|monetiz(e|ing)|commercializ(e|ing))\b/i.test(lower);
    const isPersonalDataPresent = /\b(personal\s+information|personal\s+data|consumer\s+data|customer\s+(personal\s+)?information|user\s+data)\b/i.test(lower);
    const isBusinessTransferContext = /\b(business\s+transfers?|merger|acquisition|transferred\s+business\s+assets?|sell\s+or\s+buy\s+other\s+businesses)\b/i.test(lower);

    if (isSaleVerbPresent && isPersonalDataPresent && !isBusinessTransferContext) {
      const negationFindings = findClauseNegation(text, /\b(sell|selling|sale\s+of|monetiz(e|ing)|commercializ(e|ing))\b/i);
      
      if (negationFindings.length > 0) {
        const finding = negationFindings[0];
        category = 'DATA_SALE';
        
        if (finding.classification === 'FAIR') {
          confidence = 'CONFIRMED';
          rationale = 'FAIR: Site explicitly confirms that it DOES NOT sell customer personal information to third parties.';
        } else if (finding.classification === 'REVIEW') {
          confidence = 'SUGGESTIVE';
          rationale = 'REVIEW: Site states it does not sell data, but includes a hedge or reservation of rights that may invalidate this promise.';
        } else {
          confidence = 'CONFIRMED';
          rationale = 'WARNING: Site explicitly reserves the right to sell or commercialize personal consumer data.';
        }
      } else if (/\b(we|may|reserves?\s+the\s+right\s+to)\s+(sell|monetiz(e|ing)|commercializ(e|ing))\b/i.test(lower) || /\b(is|are)\s+sold\s+to\b/i.test(lower)) {
        category = 'DATA_SALE';
        confidence = 'CONFIRMED';
        rationale = 'WARNING: Site explicitly reserves the right to sell or commercialize personal consumer data.';
      }
    }

    // ─── 2. Forced Arbitration & Trial Waivers ────────────────────────────────
    else if (/\b(arbitrat(e|ion|or)|jury\s+trial|trial\s+by\s+jury)\b/i.test(lower)) {
      const negationFindings = findClauseNegation(text, /\b(arbitrat(e|ion|or)|jury\s+trial|trial\s+by\s+jury)\b/i);
      const isCarveOut = negationFindings.some(f => f.negated) || /\b(does\s+not\s+apply\s+to|opt[- ]out\s+of\s+arbitration|small\s+claims\s+court\s+exception)\b/i.test(lower);
      category = 'ARBITRATION';

      if (isCarveOut) {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Dispute clause specifies arbitration with explicit carve-outs, small claims exceptions, or opt-out rights.';
      } else if (/\b(binding\s+arbitration|mandatory\s+arbitration|waiv(e|ing)\s+(any\s+right\s+to\s+a\s+)?jury\s+trial)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'TRICKY: Mandatory binding arbitration with court trial waiver. Disables your right to seek legal remedies in public courts.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Site specifies private arbitration proceedings for legal dispute resolution.';
      }
    }

    // ─── 3. Class Action Lawsuit Waiver ───────────────────────────────────────
    else if (/\bclass\s+action\b/i.test(lower) && /\b(waiv(e|er|ing)|prohibit(ed)?|solely\s+in\s+individual\s+capacity|cannot\s+be\s+brought\s+as\s+a\s+class)\b/i.test(lower)) {
      const caNegation = findClauseNegation(text, /\bclass action\b/i);
      if (!caNegation.some(f => f.classification === 'FAIR')) {
        category = 'CLASS_ACTION';
        confidence = 'CONFIRMED';
        rationale = 'TRICKY: Explicit class-action lawsuit waiver. Requires all disputes to be handled strictly as individual proceedings.';
      }
    }

    // ─── 4. Cookies, Storage & Tracking Beacons ───────────────────────────────
    else if (/\b(cookie|cookies|tracking\s+pixel|web\s+beacon|local\s+storage)\b/i.test(lower)) {
      category = 'COOKIE_POLICY';
      if (/\b(strictly\s+necessary|essential)\b/i.test(lower) && !/\b(marketing|advertising|cross[- ]context)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'HARMLESS: Essential operational cookies required for page navigation, security, and cart features.';
      } else if (/\b(marketing|advertising|targeted|commercial\s+partners?|cross[- ]context)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'WARNING: Marketing and cross-site behavioral tracking cookies deployed for targeted advertising.';
      } else if (/\b(analytics|performance|statistics|telemetry)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'NOTICE: Site deploys analytics cookies to measure site visits, render latency, and UX performance.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Discloses deployment of browser cookies and tracking tags.';
      }
    }

    // ─── 5. Third-Party Data Sharing, Service Providers & Business Transfers ───
    else if (
      isBusinessTransferContext ||
      /\b(service\s+providers?|contractors?|vendors?)\b.*\b(perform\s+functions|have\s+access\s+to|process\s+personal|fulfill)\b/i.test(lower) ||
      (/\b(share|shared|disclos(e|ure)|transfer|transferr(ed|ing)|provid(e|ing)|access)\b/i.test(lower) && 
       /\b(third\s+part(y|ies)|partners?|affiliates?|subsidiaries|vendors?|service\s+providers?|contractors?)\b/i.test(lower))
    ) {
      category = 'DATA_SHARING';

      if (findClauseNegation(text, /\b(share|disclose)\b/i).some(f => f.classification === 'FAIR')) {
        confidence = 'CONFIRMED';
        rationale = 'FAIR: Platform restricts third-party disclosures and commits not to share personal data without affirmative consent.';
      } else if (findClauseNegation(text, /\b(share|disclose)\b/i).some(f => f.classification === 'REVIEW')) {
        confidence = 'SUGGESTIVE';
        rationale = 'REVIEW: Platform claims it does not share data, but includes a hedge or exception that weakens this commitment.';
      } else if (isBusinessTransferContext) {
        confidence = 'CONFIRMED';
        rationale = 'NOTICE: Customer information may be transferred as a business asset during a merger, acquisition, or sale of assets, subject to pre-existing privacy notice commitments.';
      } else if (/\b(service\s+providers?|vendors?|contractors?|fulfill(ing|ment)?|payment\s+processing|delivery|cloud\s+infrastructure|customer\s+service)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'NOTICE: Personal information shared with contracted service providers (e.g. order fulfillment, payment processing, delivery, and analytics) subject to purpose restrictions.';
      } else if (/\b(advertising\s+partners?|marketing\s+partners?|commercial\s+promotions?|data\s+brokers?)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'WARNING: Personal data is shared with third-party advertising networks or commercial marketing partners for promotional targeting.';
      } else if (/\b(affiliates?|subsidiaries|corporate\s+group)\b/i.test(lower)) {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Personal information shared across corporate affiliates and subsidiaries subject to common privacy practices.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Data shared with third-party service providers and operational infrastructure vendors.';
      }
    }

    // ─── 6. User Rights & Data Control (GDPR / CCPA / DPDP) ───────────────────
    else if (/\b(right\s+to\s+(access|delete|erasure|portability|rectification)|request\s+deletion|opt[- ]out|data\s+protection\s+officer)\b/i.test(lower)) {
      category = 'USER_RIGHTS';
      confidence = 'CONFIRMED';
      rationale = 'FAIR: Site outlines concrete privacy rights, allowing you to access, export, rectify, or delete your personal data.';
    }

    // ─── 7. Law Enforcement & Statutory Disclosures ───────────────────────────
    else if (/\b(law\s+enforcement|subpoena|court\s+order|government\s+agenc(y|ies)|legal\s+process|comply\s+with\s+the\s+law)\b/i.test(lower) && 
             /\b(disclos(e|ure)|provide|release|comply)\b/i.test(lower)) {
      category = 'GOVERNMENT_DISCLOSURE';
      confidence = 'CONFIRMED';
      rationale = 'NOTICE: Platform discloses records to law enforcement agencies or judicial authorities when required by subpoena or statutory process.';
    }

    // ─── 8. Data Retention Policies ───────────────────────────────────────────
    else if (/\b(retain|retention\s+period)\b/i.test(lower) && 
             /\b(indefinitely|perpetual|as\s+long\s+as\s+necessary|until\s+account\s+deletion|statutory\s+period)\b/i.test(lower)) {
      category = 'DATA_RETENTION';
      if (/\b(indefinitely|perpetual)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'WARNING: Personal information may be retained indefinitely even after account closure.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Personal data is retained for the duration necessary to deliver services, satisfy statutory audits, or resolve disputes.';
      }
    }

    // ─── 9. Children's Privacy Protection ─────────────────────────────────────
    else if (/\b(children|minor|minors|under\s+(13|16|18)|coppa)\b/i.test(lower)) {
      category = 'CHILDREN_DATA';
      if (/\b(do\s+not\s+knowingly\s+collect|not\s+directed\s+to\s+children|parental\s+consent\s+required)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'HARMLESS: Site explicitly affirms it does not target minors or knowingly collect personal data from children without parental consent.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Specific age verification or parental consent provisions apply to minor users.';
      }
    }

    // ─── 10. User Content Licensing ───────────────────────────────────────────
    else if (/\b(perpetual|irrevocable)\b/i.test(lower) && 
             /\blicense\b/i.test(lower) && 
             /\b(user\s+content|submissions?|reviews?|feedback|materials?)\b/i.test(lower)) {
      const licenseNegation = findClauseNegation(text, /\blicense\b/i);
      
      if (!licenseNegation.some(f => f.classification === 'FAIR')) {
        category = 'CONTENT_LICENSE';
        confidence = 'CONFIRMED';
        rationale = 'TRICKY: Grants the platform an irrevocable, perpetual, royalty-free license to reproduce, adapt, and distribute your submitted content or reviews.';
      }
    }

    // ─── 11. AI Model Training on User Data ───────────────────────────────────
    else if (/\b(train|training)\b/i.test(lower) && 
             /\b(artificial\s+intelligence|machine\s+learning|ai\s+models?|llms?|generative\s+ai)\b/i.test(lower)) {
      category = 'AI_TRAINING';
      const trainNegation = findClauseNegation(text, /\btrain\b/i);
      
      if (trainNegation.some(f => f.classification === 'FAIR')) {
        confidence = 'CONFIRMED';
        rationale = 'FAIR: Platform confirms user content is NOT ingested or used to train artificial intelligence or machine learning models.';
      } else if (trainNegation.some(f => f.classification === 'REVIEW')) {
        confidence = 'SUGGESTIVE';
        rationale = 'REVIEW: Platform states it does not train AI on your data, but includes a hedge or exception.';
      } else {
        confidence = 'CONFIRMED';
        rationale = 'TRICKY: Platform reserves the right to use your personal submissions, chats, or communications to train machine learning models.';
      }
    }

    // ─── 12. Unilateral Modification & Termination ────────────────────────────
    else if (/\b(terminat(e|ion)|suspend|without\s+prior\s+notice|modify\s+these\s+terms|update\s+these\s+terms|reserves?\s+the\s+right\s+to\s+modify)\b/i.test(lower)) {
      if (/\bsole\s+discretion\b/i.test(lower) || /\bwithout\s+(prior\s+)?notice\b/i.test(lower) || /\b(at\s+any\s+time)\b/i.test(lower)) {
        category = 'TERMINATION';
        confidence = 'CONFIRMED';
        rationale = 'UNFAIR: Reserves unconstrained authority to alter terms, suspend accounts, or terminate access without prior notice.';
      }
    }

    // ─── 13. Broad Liability & Warranty Disclaimers ───────────────────────────
    else if (/\b(as\s+is|without\s+warrant(y|ies)|limitation\s+of\s+liability)\b/i.test(lower) && 
             /\b(consequential\s+damages|indirect\s+damages|disclaim\s+all\s+warranties)\b/i.test(lower)) {
      category = 'LIABILITY';
      confidence = 'SUGGESTIVE';
      rationale = 'NOTICE: Broad disclaimer of warranties and standard cap on liability for service interruptions or platform downtime.';
    }

    // ─── 14. Auto-Renewal & Negative Option Billing ───────────────────────────
    else if (/\b(auto[- ]renew|automatic\s+renewal|recurring\s+charge|automatically\s+renew)\b/i.test(lower)) {
      category = 'AUTO_RENEWAL';
      confidence = 'CONFIRMED';
      rationale = 'WARNING: Subscription automatically renews with recurring charges unless affirmatively canceled.';
    }

    // ─── 15. Indemnification ──────────────────────────────────────────────────
    else if (/\b(indemnify|hold\s+harmless|defend\s+us)\b/i.test(lower)) {
      category = 'INDEMNIFICATION';
      confidence = 'CONFIRMED';
      rationale = 'TRICKY: Extreme liability shift. You agree to pay the company\'s legal fees and defend them in court if they are sued due to your usage.';
    }

    // ─── 16. Governing Law & Venue ────────────────────────────────────────────
    else if (/\b(governing\s+law|jurisdiction|venue|resolved\s+in\s+the\s+courts\s+of|shall\s+be\s+governed\s+by)\b/i.test(lower)) {
      category = 'GOVERNING_LAW';
      confidence = 'SUGGESTIVE';
      rationale = 'NOTICE: Forces disputes to be resolved under the laws and courts of a specific, potentially distant jurisdiction.';
    }

    // ─── 17. Unilateral Price Changes ─────────────────────────────────────────
    else if (/\b(prices?|fees?|subscription\s+rates?|charges?)\b/i.test(lower) && /\b(change|increase|modify|at\s+any\s+time|sole\s+discretion)\b/i.test(lower)) {
      category = 'PRICE_CHANGE';
      confidence = 'CONFIRMED';
      rationale = 'UNFAIR: Platform reserves the right to increase subscription fees or prices at any time without affirmative re-consent.';
    }

    // ─── 18. Data Breach Notification & Liability ──────────────────────────────
    else if (/\b(data\s+breach|security\s+breach|unauthorized\s+access|security\s+incident)\b/i.test(lower)) {
      category = 'DATA_BREACH';
      if (/\b(shall\s+not\s+be\s+liable|no\s+guarantee|cannot\s+guarantee)\b/i.test(lower)) {
        confidence = 'CONFIRMED';
        rationale = 'TRICKY: Disclaims liability for unauthorized access or data breaches involving your personal information.';
      } else {
        confidence = 'SUGGESTIVE';
        rationale = 'NOTICE: Defines procedures or disclaimers regarding security incidents and data breach notifications.';
      }
    }

    // ─── 19. Sensitive Data Collection ─────────────────────────────────────────
    else if (/\b(biometric|precise\s+geolocation|health\s+information|financial\s+information)\b/i.test(lower)) {
      category = 'DATA_COLLECTION';
      confidence = 'CONFIRMED';
      rationale = 'WARNING: Explicitly collects highly sensitive personal data such as biometrics, precise location, or health information.';
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

/**
 * Returns plain-English explanations of why a legal clause is tricky or fair for normal people.
 */
export function getPlainEnglishLegalExplanation(category: string, isTricky: boolean, isFair: boolean, isReview: boolean = false): { title: string; explanation: string } {
  if (isReview) {
    return {
      title: '🤔 Needs Human Review (Hedged Language):',
      explanation: 'The policy appears to make a consumer-friendly promise (e.g., not selling data), but it immediately includes a loophole, exception, or "reservation of rights" that might weaken or invalidate that promise.'
    };
  }

  if (isFair) {
    switch (category) {
      case 'DATA_SALE':
        return {
          title: '🛡️ Fair Commitment (No Data Sale):',
          explanation: 'Good news! The company explicitly promises that it does NOT sell your personal browsing habits, email, or account data to third-party data brokers.'
        };
      case 'USER_RIGHTS':
        return {
          title: '🛡️ Your Legal Privacy Rights Protected:',
          explanation: 'You have the explicit right to request a complete copy of all personal data they have collected about you, and demand they delete it permanently.'
        };
      case 'AI_TRAINING':
        return {
          title: '🛡️ Your Content Protected from AI:',
          explanation: 'The company explicitly confirms they will NOT feed your posts, files, or personal messages into AI or machine learning models.'
        };
      case 'DATA_SHARING':
        return {
          title: '🛡️ Strict Sharing Safeguards:',
          explanation: 'The platform commits not to disclose or share your personal records with outside third parties without your affirmative consent.'
        };
      default:
        return {
          title: '🛡️ Consumer-Friendly Term:',
          explanation: 'This clause protects your rights and establishes clear boundaries on how your information is handled.'
        };
    }
  }

  // Tricky or notice terms
  switch (category) {
    case 'ARBITRATION':
      return {
        title: '🚨 Why this is tricky for you (Forced Arbitration):',
        explanation: 'If this company breaks their promises, overcharges your card, or loses your sensitive data in a hack, you CANNOT take them to a public court of law. You are forced into private arbitration where companies pick the rules and win most disputes.'
      };
    case 'CLASS_ACTION':
      return {
        title: '🚨 Why this is tricky for you (No Group Lawsuits):',
        explanation: 'You waive your right to team up with other affected customers in a class-action lawsuit. If the company commits fraud, you must arbitrate completely alone at your own expense.'
      };
    case 'DATA_SALE':
      return {
        title: '🚨 Why this is tricky for you (Commercial Data Sale):',
        explanation: 'The company explicitly reserves the right to sell or commercialize your personal profile, contact information, or browsing habits to outside data brokers for money.'
      };
    case 'AI_TRAINING':
      return {
        title: '🤖 What this means for you (AI Model Training):',
        explanation: 'Anything you post, write, or upload to this site can be fed into their Artificial Intelligence / Machine Learning models without paying you, crediting you, or asking for your permission again.'
      };
    case 'DATA_SHARING':
      return {
        title: '👥 What this means for you (Third-Party Sharing):',
        explanation: 'Personal information is shared with authorized contractors (e.g. delivery couriers, payment processors, and cloud infrastructure) to complete your orders, or with marketing partners subject to notice.'
      };
    case 'CONTENT_LICENSE':
      return {
        title: '📄 Why this is tricky (Broad Content License):',
        explanation: 'You give the company an irrevocable, perpetual license to use, display, reproduce, and adapt any photos, product reviews, or comments you submit.'
      };
    case 'TERMINATION':
      return {
        title: '⚠️ Why this is tricky (Account Termination):',
        explanation: 'The company reserves unconstrained authority to alter terms, freeze accounts, or delete stored data at any time in its sole discretion without prior notice.'
      };
    case 'LIABILITY':
      return {
        title: '📜 What this means for you (Liability Disclaimer):',
        explanation: 'The platform disclaims warranties for uninterrupted service. If the platform experiences downtime or technical errors, their financial liability to you is strictly limited.'
      };
    case 'DATA_RETENTION':
      return {
        title: '⏳ What this means for you (Data Retention):',
        explanation: 'The company discloses how long it retains your personal data on its servers, which may continue for statutory accounting or audit requirements.'
      };
    case 'CHILDREN_DATA':
      return {
        title: '👶 Children\'s Data Protection Notice:',
        explanation: 'Discloses whether minors are permitted to use this site and how parental consent is handled under applicable child protection laws.'
      };
    case 'GOVERNMENT_DISCLOSURE':
      return {
        title: '🏛️ Government Disclosure Terms:',
        explanation: 'The platform discloses customer records to law enforcement agencies or judicial authorities when formally required by subpoena, search warrant, or court order.'
      };
    case 'COOKIE_POLICY':
      return {
        title: '🍪 Cookie & Tracking Notice:',
        explanation: 'The company discloses that it stores tracking tags, analytics cookies, or session tokens on your browser to identify your device and monitor site performance.'
      };
    default:
      return {
        title: isTricky ? '🚨 Why this is tricky for you:' : '⚠️ Important Notice:',
        explanation: 'This legal clause specifies rights, operational terms, or company authority regarding your account and data.'
      };
  }
}
