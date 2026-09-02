export type ThreatStatus = 'NO_KNOWN_THREAT' | 'KNOWN_MALWARE' | 'KNOWN_PHISHING' | 'UNKNOWN';
export type ThreatSource = 'LOCAL_HEURISTIC' | 'WEB_RISK' | 'PHISHTANK' | 'URLHAUS';
export type WebRiskThreatType = 'MALWARE' | 'SOCIAL_ENGINEERING' | 'UNWANTED_SOFTWARE';

export interface ThreatMatch {
  status: ThreatStatus;
  source?: ThreatSource;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string;
  hashPrefixHex?: string;
}

export interface HashPrefixEntry {
  prefix: string; // Base64 encoded prefix
  prefixSize: number; // typically 4, but can be up to 32
  threatTypes: WebRiskThreatType[];
}

export interface WebRiskState {
  versionToken: string;
  nextUpdateTimestamp: number;
  checksum?: string;
}

export interface HashConfirmationCacheEntry {
  fullHash: string; // Base64 encoded full SHA-256 hash
  threatTypes: WebRiskThreatType[]; // Empty array means negative cache (safe)
  expireTimestamp: number; 
}
