import { Finding } from '../shared/types';
import { evaluateUrlThreat } from '../threat-intel/engine';

/**
 * Performs a privacy-preserving local threat evaluation.
 * Does not send raw URLs to any external service.
 */
export async function performLiveVerification(domain: string, url: string, isDeepAudit = false): Promise<Finding[]> {
  const findings: Finding[] = [];
  // Allow localhost port 8080 during testing so adversarial fixtures can be exercised
  const isTestHarness = domain === 'localhost:8080' || url.includes(':8080');
  if (!isTestHarness && (domain === 'localhost' || domain.includes('127.0.0.1'))) {
    return findings;
  }

  // 1. Connection Security (HTTPS)
  if (url.startsWith('http://') && !isTestHarness) {
    findings.push(createSecurityFinding(
      'M6-001', 
      'Unencrypted Connection', 
      'This site is not using HTTPS. Your connection is completely exposed to interception.',
      'CRITICAL',
      url
    ));
  }

  // 2. Local Threat Intelligence Engine
  try {
    const threatMatch = await evaluateUrlThreat(url, isDeepAudit);
    
    if (threatMatch.status !== 'NO_KNOWN_THREAT' && threatMatch.status !== 'UNKNOWN') {
      const isMalware = threatMatch.status === 'KNOWN_MALWARE';
      
      findings.push({
        id: crypto.randomUUID(),
        ruleId: isMalware ? 'M6-MALWARE' : 'M6-PHISHING',
        ruleName: isMalware ? 'Malware Distribution' : 'Known Phishing',
        module: 'M2', // M2 is Threat Shield
        category: 'SECURITY',
        severity: 'CRITICAL',
        confidenceState: threatMatch.confidence,
        reviewStatus: 'CONFIRMED',
        statuteRef: 'Local Threat Intelligence',
        explanation: threatMatch.details,
        interpretation: threatMatch.details,
        elementSelector: 'html',
        pageUrl: url,
        detectedAt: new Date().toISOString(),
        evidence: {
          sourceType: 'THREAT_INTEL',
          sourceUrl: url,
          capturedAt: Date.now(),
          context: `Matched local hash prefix: ${threatMatch.hashPrefixHex || 'N/A'}`
        }
      });
    }
  } catch (e) {
    console.warn('Vigil: Local threat intelligence scan failed', e);
  }

  // Note: Automated Legal Auditing (M7) has been removed from the background scanner.
  // It is now an on-demand activeTab feature triggered by the user.

  return findings;
}

function createSecurityFinding(id: string, name: string, explanation: string, severity: Finding['severity'], url: string): Finding {
  return {
    id: crypto.randomUUID(),
    ruleId: id,
    ruleName: name,
    module: 'M2' as any,
    category: 'SECURITY',
    severity: severity,
    confidenceState: 'HIGH',
    reviewStatus: 'CONFIRMED',
    statuteRef: 'Connection Security',
    explanation,
    interpretation: explanation,
    elementSelector: 'html',
    pageUrl: url,
    detectedAt: new Date().toISOString(),
    evidence: {
      sourceType: 'NETWORK',
      sourceUrl: url,
      capturedAt: Date.now(),
      context: 'Protocol check'
    }
  };
}
