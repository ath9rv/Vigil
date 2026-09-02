export type JurisdictionCode = 'AUTO' | 'GLOBAL_OECD' | 'US_CCPA' | 'EU_GDPR' | 'IN_DPDP';

export interface StatuteReference {
  authority: string;
  statute: string;
  article: string;
  summary: string;
}

export type DeceptiveTaxonomy = 
  | 'ASYMMETRIC_CHOICE'
  | 'HIDDEN_SUBSCRIPTION'
  | 'COERCIVE_URGENCY'
  | 'CONFIRMSHAMING'
  | 'PRE_CHECKED_BOX'
  | 'SNEAK_INTO_BASKET'
  | 'CREDENTIAL_MISDIRECTION'
  | 'UNAUTHORIZED_TRACKING'
  | 'HOSTILE_ARBITRATION';

export const UNIVERSAL_TAXONOMY_NAMES: Record<DeceptiveTaxonomy, string> = {
  ASYMMETRIC_CHOICE: 'Asymmetric Choice Architecture',
  HIDDEN_SUBSCRIPTION: 'Hidden Subscription / Continuity Trap',
  COERCIVE_URGENCY: 'Manufactured Urgency & Scarcity',
  CONFIRMSHAMING: 'Emotionally Manipulative Language (Confirmshaming)',
  PRE_CHECKED_BOX: 'Pre-Selected Financial or Marketing Consent',
  SNEAK_INTO_BASKET: 'Undisclosed Item Added to Cart',
  CREDENTIAL_MISDIRECTION: 'Credential Theft / Domain Mismatch',
  UNAUTHORIZED_TRACKING: 'Pre-Consent Surveillance Tracking',
  HOSTILE_ARBITRATION: 'Forced Binding Dispute Waiver'
};

export function getStatuteReference(
  taxonomy: DeceptiveTaxonomy, 
  jurisdiction: JurisdictionCode = 'AUTO'
): StatuteReference {
  // Infer jurisdiction if AUTO: inspect browser language/locale
  let effectiveJurisdiction = jurisdiction;
  if (effectiveJurisdiction === 'AUTO') {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.includes('in') || lang.includes('hi')) effectiveJurisdiction = 'IN_DPDP';
    else if (lang.includes('de') || lang.includes('fr') || lang.includes('es') || lang.includes('it') || lang.includes('nl')) effectiveJurisdiction = 'EU_GDPR';
    else if (lang.includes('en-us') || lang.includes('en-ca')) effectiveJurisdiction = 'US_CCPA';
    else effectiveJurisdiction = 'GLOBAL_OECD';
  }

  switch (taxonomy) {
    case 'ASYMMETRIC_CHOICE':
      if (effectiveJurisdiction === 'EU_GDPR') {
        return {
          authority: 'European Data Protection Board (EDPB)',
          statute: 'GDPR Art. 4(11) & Art. 7',
          article: 'Consent must be as easy to withdraw as to give',
          summary: 'Asymmetric button styling violates equal freedom of choice.'
        };
      }
      if (effectiveJurisdiction === 'IN_DPDP') {
        return {
          authority: 'Central Consumer Protection Authority (CCPA India)',
          statute: 'Dark Pattern Guidelines 2023, Annexure 1(5)',
          article: 'False Urgency & Asymmetric Presentation',
          summary: 'Disproportionately prominent accept button constitutes deceptive presentation.'
        };
      }
      if (effectiveJurisdiction === 'US_CCPA') {
        return {
          authority: 'Federal Trade Commission (FTC)',
          statute: 'FTC Act Section 5 / CCPA Regulations § 7004',
          article: 'Prohibition on Dark Patterns in Choice Architecture',
          summary: 'Burdening the choice to refuse violates reasonable consumer expectations.'
        };
      }
      return {
        authority: 'OECD Consumer Protection',
        statute: 'OECD Guidelines on E-Commerce (2022)',
        article: 'Fair Choice Principle § 14',
        summary: 'Traders should not use design architectures that impair consumer autonomy.'
      };

    case 'HIDDEN_SUBSCRIPTION':
      if (effectiveJurisdiction === 'US_CCPA') {
        return {
          authority: 'Federal Trade Commission (FTC)',
          statute: 'Restore Online Shoppers Confidence Act (ROSCA) / Negative Option Rule',
          article: 'Clear & Conspicuous Disclosure of Recurring Billing',
          summary: 'Failing to disclose recurring charges prior to billing details is unlawful.'
        };
      }
      if (effectiveJurisdiction === 'IN_DPDP') {
        return {
          authority: 'CCPA India',
          statute: 'Dark Pattern Guidelines 2023, Rule 4(g)',
          article: 'Subscription Trap',
          summary: 'Making cancellation impossible or hiding renewal fees is explicitly prohibited.'
        };
      }
      return {
        authority: 'Consumer Protection Framework',
        statute: 'Fair Trading Standards',
        article: 'Negative Option Billing Prohibition',
        summary: 'Subscriptions must require unambiguous affirmative opt-in with equal cancellation ease.'
      };

    case 'COERCIVE_URGENCY':
      if (effectiveJurisdiction === 'IN_DPDP') {
        return {
          authority: 'CCPA India',
          statute: 'Dark Pattern Guidelines 2023, Rule 4(a)',
          article: 'False Urgency',
          summary: 'Falsely stating limited time or scarcity to force immediate purchase.'
        };
      }
      return {
        authority: 'FTC & OECD Fair Trade',
        statute: 'Unfair and Deceptive Trade Practices',
        article: 'Deceptive Scarcity Claims',
        summary: 'Synthetic timers without true inventory exhaustion violate truth-in-advertising laws.'
      };

    case 'PRE_CHECKED_BOX':
      if (effectiveJurisdiction === 'EU_GDPR') {
        return {
          authority: 'Court of Justice of the EU (Planet49 C-673/17)',
          statute: 'GDPR Recital 32',
          article: 'Silence or Pre-Ticked Boxes Do Not Constitute Consent',
          summary: 'Pre-ticked consent checkboxes are legally invalid.'
        };
      }
      return {
        authority: 'Consumer Rights Regulations',
        statute: 'Consumer Rights Directive Art. 22',
        article: 'Additional Payments (Pre-Ticked Boxes)',
        summary: 'Consumers are entitled to reimbursement for fees added via default opt-in.'
      };

    case 'CREDENTIAL_MISDIRECTION':
      return {
        authority: 'Cybersecurity & Infrastructure Security Agency (CISA)',
        statute: 'Phishing & Credential Harvester Directive',
        article: 'Cross-Origin Form Interception',
        summary: 'Submitting sensitive credentials to an unverified third-party host.'
      };

    default:
      return {
        authority: 'Global Privacy & Consumer Alliance',
        statute: 'Fair Digital Commerce Standard',
        article: 'Ethical Design Requirement',
        summary: 'Consumer rights require transparent, unmanipulated interaction.'
      };
  }
}
