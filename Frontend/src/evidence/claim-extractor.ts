import { EvidenceClaim } from '../shared/types';
import { EvidenceNode } from './graph';
import { CLAIM_PREDICATES, ClaimFactory } from './claims';

/**
 * Maps legal clause categories from the auditor to the corresponding
 * claim predicates registered in the Trust Engine.
 */
const LEGAL_CATEGORY_TO_PREDICATE: Record<string, string> = {
  DATA_SALE: CLAIM_PREDICATES.LEGAL_DATA_SALE,
  ARBITRATION: CLAIM_PREDICATES.LEGAL_ARBITRATION,
  CLASS_ACTION: CLAIM_PREDICATES.LEGAL_CLASS_ACTION,
  DATA_SHARING: CLAIM_PREDICATES.LEGAL_DATA_SHARING,
  USER_RIGHTS: CLAIM_PREDICATES.LEGAL_USER_RIGHTS,
  AI_TRAINING: CLAIM_PREDICATES.LEGAL_AI_TRAINING,
  CONTENT_LICENSE: CLAIM_PREDICATES.LEGAL_CONTENT_LICENSE,
  AUTO_RENEWAL: CLAIM_PREDICATES.LEGAL_AUTO_RENEWAL,
  TERMINATION: CLAIM_PREDICATES.LEGAL_TERMINATION,
  INDEMNIFICATION: CLAIM_PREDICATES.LEGAL_INDEMNIFICATION,
  GOVERNING_LAW: CLAIM_PREDICATES.LEGAL_GOVERNING_LAW,
  DATA_BREACH: CLAIM_PREDICATES.LEGAL_DATA_BREACH,
  DATA_COLLECTION: CLAIM_PREDICATES.LEGAL_DATA_COLLECTION,
  DATA_RETENTION: CLAIM_PREDICATES.LEGAL_DATA_RETENTION,
  CHILDREN_DATA: CLAIM_PREDICATES.LEGAL_CHILDREN_DATA,
  GOVERNMENT_DISCLOSURE: CLAIM_PREDICATES.LEGAL_GOV_DISCLOSURE,
  COOKIE_POLICY: CLAIM_PREDICATES.LEGAL_COOKIE_POLICY,
  PRICE_CHANGE: CLAIM_PREDICATES.LEGAL_PRICE_CHANGE,
  LIABILITY: CLAIM_PREDICATES.LEGAL_LIABILITY,
};

export class ClaimExtractor {
  /**
   * Deterministically derives EvidenceClaims from EvidenceNodes.
   */
  extractClaims(nodes: EvidenceNode<any>[]): EvidenceClaim[] {
    const claims: EvidenceClaim[] = [];
    const claimSet = new Set<string>(); // Prevent duplicate claims for same nav/predicate

    const addClaim = (navigationId: string, predicate: string) => {
      const key = `${navigationId}:${predicate}`;
      if (!claimSet.has(key)) {
        claimSet.add(key);
        claims.push(ClaimFactory.fromBehavior(navigationId, 'Target', predicate));
      }
    };

    const addLegalClaim = (navigationId: string, predicate: string, context?: { excerpt?: string; category?: string }) => {
      const key = `${navigationId}:${predicate}`;
      if (!claimSet.has(key)) {
        claimSet.add(key);
        claims.push(ClaimFactory.fromLegalClassification('Site', predicate, context?.excerpt, {
          scope: context?.category,
        }));
      }
    };

    const networkNodes = nodes.filter(n => n.type === 'NETWORK');
    const storageNodes = nodes.filter(n => n.type === 'STORAGE');
    const documentNodes = nodes.filter(n => n.type === 'DOCUMENT');
    const threatNodes = nodes.filter(n => n.type === 'THREAT_INTEL');

    for (const node of threatNodes) {
      if (node.data?.threatStatus === 'KNOWN_PHISHING' || node.data?.threatStatus === 'KNOWN_MALWARE') {
        addClaim(node.navigationId, CLAIM_PREDICATES.M2_DETECTED);
      }
    }

    for (const node of networkNodes) {
      if (node.data.crossSite) {
        addClaim(node.navigationId, CLAIM_PREDICATES.CROSS_SITE_TRANSMISSION);

        // Only derive SHARES_DATA if there is explicit evidence of an identifier or PII in the payload
        if (node.data.containsIdentifier || node.data.containsPII) {
          addClaim(node.navigationId, CLAIM_PREDICATES.SHARES_DATA);
        }
      }
    }

    for (const node of storageNodes) {
      // Only derive USES_TRACKERS if the trusted threat intel collector flagged it
      if (node.data.isTracker && node.provenance.collector === 'threat-intel') {
        addClaim(node.navigationId, CLAIM_PREDICATES.USES_TRACKERS);
      }
    }

    // Collects identifier if there are both storage and network operations involving the same ID
    // Note: A more advanced version would match the specific identifier string
    const hasNetworkWithId = networkNodes.some(n => n.data.containsIdentifier);
    const hasStorageWithId = storageNodes.some(n => n.data.cookieName || n.data.key);
    
    if (hasNetworkWithId && hasStorageWithId) {
       // Group by navigation to ensure they happened in the same context
       const navsWithBoth = new Set(
         networkNodes.filter(n => n.data.containsIdentifier).map(n => n.navigationId)
       );
       for (const navId of navsWithBoth) {
         if (storageNodes.some(n => n.navigationId === navId && (n.data.cookieName || n.data.key))) {
           addClaim(navId, CLAIM_PREDICATES.COLLECTS_IDENTIFIER);
         }
       }
    }

    // ─── Legal Auditor Claims ──────────────────────────────────────────────
    // The legal auditor produces DOCUMENT-type nodes with a `category` field
    // (e.g., "DATA_SALE", "ARBITRATION") derived from the ML/keyword classifier.
    // We map each category to its registered claim predicate so the Trust Engine
    // can evaluate legal evidence through the same claim→verdict pipeline.
    for (const node of documentNodes) {
      const category = node.data?.category;
      if (!category) continue;

      const predicate = LEGAL_CATEGORY_TO_PREDICATE[category];
      if (!predicate) continue;

      addLegalClaim(node.navigationId, predicate, {
        excerpt: node.data.excerpt,
        category,
      });
    }

    return claims;
  }
}
