import { EvidenceClaim } from '../shared/types';
import { EvidenceNode } from './graph';
import { CLAIM_PREDICATES, ClaimFactory } from './claims';

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

    const networkNodes = nodes.filter(n => n.type === 'NETWORK');
    const storageNodes = nodes.filter(n => n.type === 'STORAGE');

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

    return claims;
  }
}
