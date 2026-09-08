/**
 * Vigil Site Governance Subsystem
 *
 * Implements per-domain policy overrides and user protection settings.
 *
 * Core Invariant: Setting a site to OBSERVE_ONLY or "never intervene on this site"
 * MUST NEVER disable passive intelligence gathering. TrustEngine, EvidenceGraph,
 * TemporalCorrelator, and forensic scoring continue running normally while
 * DOM mutations are suppressed.
 *
 * Security Invariant: Site governance can only be configured via extension-trusted
 * channels (popup, options, or storage). Web page scripts cannot modify their own policy.
 */

import { ProtectionMode, SiteOverridePolicy } from './types';

export class SiteGovernance {
  private static instance: SiteGovernance | null = null;
  private policies = new Map<string, SiteOverridePolicy>();

  public static getInstance(): SiteGovernance {
    if (!SiteGovernance.instance) {
      SiteGovernance.instance = new SiteGovernance();
    }
    return SiteGovernance.instance;
  }

  public setPolicy(
    domain: string,
    mode: ProtectionMode,
    neverIntervene: boolean = false,
    source: 'USER' | 'POLICY' = 'USER'
  ): void {
    const normalizedDomain = domain.toLowerCase().trim();
    this.policies.set(normalizedDomain, {
      domain: normalizedDomain,
      protectionMode: mode,
      neverIntervene,
      setAt: Date.now(),
      source,
    });
  }

  public getPolicy(domain: string): SiteOverridePolicy {
    const normalizedDomain = domain.toLowerCase().trim();
    const existing = this.policies.get(normalizedDomain);
    if (existing) {
      return existing;
    }

    // Default policy: ACTIVE
    return {
      domain: normalizedDomain,
      protectionMode: 'ACTIVE',
      neverIntervene: false,
      setAt: 0,
      source: 'POLICY',
    };
  }

  /**
   * Determines whether passive observation (TrustEngine, network monitoring, cookie classification)
   * is allowed for the given domain.
   *
   * Core Invariant: Passive observation continues under ACTIVE, SAFE_ONLY, and OBSERVE_ONLY.
   * It is disabled ONLY if the domain is explicitly switched OFF.
   */
  public shouldObserve(domain: string): boolean {
    const policy = this.getPolicy(domain);
    return policy.protectionMode !== 'OFF';
  }

  /**
   * Determines whether active DOM interventions are permitted on this domain.
   */
  public shouldMutate(domain: string): boolean {
    const policy = this.getPolicy(domain);
    if (policy.neverIntervene) return false;
    if (policy.protectionMode === 'OFF') return false;
    if (policy.protectionMode === 'OBSERVE_ONLY') return false;
    return true;
  }

  public clear(): void {
    this.policies.clear();
  }
}

export const siteGovernance = SiteGovernance.getInstance();
