import { Finding } from '../shared/types';
import { evaluateUrlThreat } from '../threat-intel/engine';
import { createForensicAnalysis } from '../evidence/forensics';

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
      const confidence = threatMatch.confidence === 'CONFIRMED' ? 'CONFIRMED' as const
        : threatMatch.confidence === 'SUGGESTIVE' ? 'SUGGESTIVE' as const
        : 'OBSERVED' as const;
      
      const analysis = createForensicAnalysis({
        confidence,
        reviewStatus: 'CONFIRMED',
        observed: [threatMatch.details],
        supportingEvidence: [`Matched local hash prefix: ${threatMatch.hashPrefixHex || 'N/A'}`],
        coverage: { threatIntel: true }
      });

      findings.push({
        id: crypto.randomUUID(),
        ruleId: isMalware ? 'M6-MALWARE' : 'M6-PHISHING',
        ruleName: isMalware ? 'Malware Distribution' : 'Known Phishing',
        module: 'M2',
        category: 'SECURITY',
        severity: 'CRITICAL',
        confidenceState: confidence,
        reviewStatus: 'CONFIRMED',
        statuteRef: 'Local Threat Intelligence',
        explanation: threatMatch.details,
        interpretation: threatMatch.details,
        elementSelector: 'html',
        pageUrl: url,
        detectedAt: new Date().toISOString(),
        context: {
          scan: { tabId: 0, navigationId: url, origin: url, hostname: domain, startedAt: Date.now() },
          evidence: [{
            sourceType: 'THREAT_INTEL',
            sourceUrl: url,
            capturedAt: Date.now(),
            context: `Matched local hash prefix: ${threatMatch.hashPrefixHex || 'N/A'}`,
            forensics: analysis
          }],
          coverage: { dom: false, threatIntel: true, network: false, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
        }
      });
    }
  } catch (e) {
    console.warn('Vigil: Local threat intelligence scan failed', e);
  }

  return findings;
}

function createSecurityFinding(id: string, name: string, explanation: string, severity: Finding['severity'], url: string): Finding {
  const analysis = createForensicAnalysis({
    confidence: 'CONFIRMED',
    reviewStatus: 'CONFIRMED',
    observed: [explanation],
    coverage: { network: true }
  });

  return {
    id: crypto.randomUUID(),
    ruleId: id,
    ruleName: name,
    module: 'M2',
    category: 'SECURITY',
    severity: severity,
    confidenceState: 'CONFIRMED',
    reviewStatus: 'CONFIRMED',
    statuteRef: 'Connection Security',
    explanation,
    interpretation: explanation,
    elementSelector: 'html',
    pageUrl: url,
    detectedAt: new Date().toISOString(),
    context: {
      scan: { tabId: 0, navigationId: url, origin: url, hostname: new URL(url).hostname, startedAt: Date.now() },
      evidence: [{
        sourceType: 'NETWORK',
        sourceUrl: url,
        capturedAt: Date.now(),
        context: 'Protocol check',
        forensics: analysis
      }],
      coverage: { dom: false, threatIntel: false, network: true, cookies: false, dynamicEvents: false, storage: false, crossSite: false }
    }
  };
}
