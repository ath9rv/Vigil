import React, { useEffect, useState, useCallback } from 'react';
import { usePermissionState } from './hooks/usePermissionState';
import { Onboarding } from './components/Onboarding';
import { StrictPrivacyModal } from './components/StrictPrivacyModal';
import { DeepAuditModal } from './components/DeepAuditModal';
import { PermissionDashboard } from './components/PermissionDashboard';
import { AssessmentGauge } from './components/AssessmentGauge';
import { FindingList } from './components/FindingList';
import { DebugPanel } from './components/DebugPanel';
import { CookieInventoryView } from './components/CookieInventoryView';
import { LegalAuditView } from './components/LegalAuditView';
import { EXTENSION_VERSION } from '../shared/constants';
import { correlateFindings } from '../correlation/correlate';
import { DetailedCookie, classifyCookie, parseDocumentCookies } from '../network/cookie-classifier';
import { Finding } from '../evidence/evidence';

type NavigationTab = 'OVERVIEW' | 'COOKIES' | 'LEGAL';

export default function App() {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const { state, updateState, revokePermission, requestPermission } = usePermissionState(currentDomain);
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<NavigationTab>('OVERVIEW');
  const [showSettings, setShowSettings] = useState(false);
  const [showStrictJIT, setShowStrictJIT] = useState(false);
  const [showDeepAuditJIT, setShowDeepAuditJIT] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Data States
  const [rawFindings, setRawFindings] = useState<Finding[]>([]);
  const [legalDocsFound, setLegalDocsFound] = useState<{title: string, url: string}[]>([]);
  const [cookies, setCookies] = useState<DetailedCookie[]>([]);
  const [trackersBlockedCount, setTrackersBlockedCount] = useState<number>(0);
  const [thirdPartyTrackers, setThirdPartyTrackers] = useState<{ domain: string; category: string; count: number }[]>([]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Helper to fetch cookies via chrome.cookies or content script fallback
  const loadCookiesForDomain = useCallback((domain: string, tabId?: number) => {
    if (!domain) return;

    if (chrome.cookies && chrome.cookies.getAll) {
      chrome.cookies.getAll({ domain }, (cookieList) => {
        if (cookieList && cookieList.length > 0) {
          const parsed: DetailedCookie[] = cookieList.map(c => {
            const meta = classifyCookie(c.name, c.value, c.domain);
            return {
              name: c.name,
              value: c.value ? (c.value.length > 40 ? c.value.substring(0, 37) + '...' : c.value) : '',
              domain: c.domain,
              path: c.path,
              category: meta.category,
              risk: meta.risk,
              provider: meta.provider,
              purpose: meta.purpose,
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.sameSite,
              session: c.session,
              expiryText: c.session ? 'Session' : (c.expirationDate ? new Date(c.expirationDate * 1000).toLocaleDateString() : 'Persistent')
            };
          });
          setCookies(parsed);
          return;
        }

        // Fallback if chrome.cookies returned empty (e.g. host access limitation)
        if (tabId) {
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.cookie
          }).then(([res]) => {
            if (res && res.result) {
              setCookies(parseDocumentCookies(res.result, domain));
            }
          }).catch(() => {});
        }
      });
    } else if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.cookie
      }).then(([res]) => {
        if (res && res.result) {
          setCookies(parseDocumentCookies(res.result, domain));
        }
      }).catch(() => {});
    }
  }, []);

  // Main Tab & URL Detection
  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 0) {
        const targetTab = tabs.find(t => t.url && t.url.startsWith('http')) || tabs.find(t => t.active) || tabs[0];
        if (targetTab && targetTab.url) {
          const url = targetTab.url;
          setCurrentUrl(url);
          try {
            const domain = new URL(url).hostname;
            setCurrentDomain(domain);

            // 1. Initial document
            setLegalDocsFound([{ title: 'Terms of Service', url }]);

            // 2. Discover real legal policies on the active tab
            if (targetTab.id && !url.startsWith('chrome') && !url.startsWith('edge')) {
              chrome.scripting.executeScript({
                target: { tabId: targetTab.id },
                func: () => {
                  const keywords = [
                    'privacy policy', 'privacy statement', 'privacy notice', 'privacy',
                    'terms of service', 'terms & conditions', 'terms of use', 'terms and conditions', 'terms',
                    'user agreement', 'acceptable use', 'cookie policy', 'cookies', 'use of cookies',
                    'website policies', 'disclaimer', 'legal notice', 'hyperlinking policy', 'copyright policy',
                    'data protection', 'legal terms'
                  ];
                  const hrefPatterns = [/privacy/i, /terms/i, /cookie/i, /tos/i, /legal/i, /disclaimer/i, /policy/i, /policies/i];
                  const links = Array.from(document.querySelectorAll('a[href]'));
                  const found: { title: string; url: string }[] = [];
                  const unique = new Set<string>();

                  for (const l of links) {
                    const raw = l.getAttribute('href') || '';
                    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
                    try {
                      const abs = new URL(raw, window.location.href).href;
                      const text = `${l.textContent || ''} ${l.getAttribute('title') || ''}`.toLowerCase().trim();
                      if (keywords.some(k => text.includes(k)) || hrefPatterns.some(p => p.test(raw))) {
                        if (!unique.has(abs)) {
                          unique.add(abs);
                          const t = (l.textContent?.trim() || l.getAttribute('title')?.trim() || 'Legal Policy');
                          found.push({ title: t.length > 40 ? t.substring(0, 37) + '...' : t, url: abs });
                        }
                      }
                    } catch {}
                  }
                  return found;
                }
              }).then(([res]) => {
                if (res && res.result && res.result.length > 0) {
                  setLegalDocsFound(res.result);
                }
              }).catch(() => {});
            }

            // 3. Load cookies
            loadCookiesForDomain(domain, targetTab.id);

            // 4. Load findings cache
            chrome.storage.local.get(['findings_cache', 'vigil_tracker_report'], (res) => {
              if (res.findings_cache && res.findings_cache[domain]) {
                setRawFindings(res.findings_cache[domain]);
              }
              if (res.vigil_tracker_report) {
                setTrackersBlockedCount(res.vigil_tracker_report.trackerCount || 0);
                if (res.vigil_tracker_report.trackerDomains) {
                  const mapped = (res.vigil_tracker_report.trackerDomains as string[]).map(d => ({
                    domain: d,
                    category: 'TRACKER',
                    count: 1
                  }));
                  setThirdPartyTrackers(mapped);
                }
              }
            });
          } catch { /* ignore invalid URLs */ }
        }
      }
    });
  }, [loadCookiesForDomain]);

  // Deep Audit Execution Logic
  const handleAuditDocument = async (targetUrl: string) => {
    setIsAuditing(true);
    try {
      const finalUrl = targetUrl || currentUrl;
      let texts: string[] = [];
      let pageTitle = finalUrl;

      const isCurrentPage = finalUrl === currentUrl || !targetUrl;

      if (isCurrentPage) {
        // Active page extract
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          const [injectionResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const root = document.querySelector('main, article, [role="main"], .legal-content, .terms-content') || document.body;
              const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, dt, dd, [class*="cookie"], [id*="cookie"]'));
              let found = paragraphs.map(p => p.textContent?.trim().replace(/\s+/g, ' ') || '').filter(t => t.length >= 15);
              if (found.length === 0) {
                const bodyText = (root as HTMLElement).innerText || document.body.innerText || '';
                found = bodyText.split(/\n\s*\n/).map(t => t.trim().replace(/\s+/g, ' ')).filter(t => t.length >= 20);
              }
              return {
                title: document.title,
                texts: found
              };
            }
          });
          if (injectionResult?.result) {
            texts = injectionResult.result.texts;
            pageTitle = injectionResult.result.title;
          }
        }
      } else {
        // Fetch external linked policy HTML
        try {
          const res = await fetch(finalUrl, { credentials: 'omit' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = await res.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const root = doc.querySelector('main, article, [role="main"], .legal-content, .terms-content, .policy-content') || doc.body;
          const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, dt, dd'));
          texts = paragraphs.map(p => p.textContent?.trim().replace(/\s+/g, ' ') || '').filter(t => t.length >= 15);
          if (texts.length === 0) {
            const bodyText = (root as HTMLElement).innerText || doc.body.innerText || '';
            texts = bodyText.split(/\n\s*\n/).map(t => t.trim().replace(/\s+/g, ' ')).filter(t => t.length >= 20);
          }
          pageTitle = doc.title || finalUrl;
        } catch (fetchErr) {
          console.warn('Vigil: External fetch failed, falling back to active tab DOM extraction:', fetchErr);
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            const [injectionResult] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const root = document.querySelector('main, article, [role="main"]') || document.body;
                const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, dt, dd'));
                let found = paragraphs.map(p => p.textContent?.trim().replace(/\s+/g, ' ') || '').filter(t => t.length >= 15);
                if (found.length === 0) {
                  const bodyText = (root as HTMLElement).innerText || document.body.innerText || '';
                  found = bodyText.split(/\n\s*\n/).map(t => t.trim().replace(/\s+/g, ' ')).filter(t => t.length >= 20);
                }
                return {
                  title: document.title,
                  texts: found
                };
              }
            });
            if (injectionResult?.result?.texts?.length) {
              texts = injectionResult.result.texts;
              pageTitle = injectionResult.result.title;
            } else {
              throw fetchErr;
            }
          } else {
            throw fetchErr;
          }
        }
      }

      // If still no texts, create a fallback clause to analyze
      if (texts.length === 0) {
        texts = [`Policy document for ${pageTitle} located at ${finalUrl}.`];
      }

      // Build clauses
      let fullText = '';
      const clauses = [];
      let currentOffset = 0;
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const prevText = i > 0 ? texts[i-1] : '';
        const nextText = i < texts.length - 1 ? texts[i+1] : '';
        const context = `${prevText}\n\n>>> ${text} <<<\n\n${nextText}`;
        
        clauses.push({
          id: `CLAUSE_${i}`,
          startOffset: currentOffset,
          endOffset: currentOffset + text.length,
          text,
          context
        });
        fullText += text + '\n\n';
        currentOffset += text.length + 2;
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullText));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const extractionResult = {
        url: finalUrl,
        title: pageTitle,
        hash: hashHex,
        retrievedAt: Date.now(),
        fullText,
        clauses
      };

      const { processLegalDocument } = await import('../legal-auditor/auditor');
      const newFindings = await processLegalDocument(extractionResult);

      // If document had 0 tricky clauses, create positive confirmation finding
      if (newFindings.length === 0) {
        newFindings.push({
          id: crypto.randomUUID(),
          category: 'LEGAL',
          severity: 'INFO',
          confidence: 'HIGH',
          reviewStatus: 'CONFIRMED',
          ruleId: 'LEGAL-AUDIT_COMPLETE',
          ruleName: 'Terms & Conditions Audited',
          interpretation: `FAIR: Audited ${clauses.length} clauses across "${pageTitle}". No binding arbitration, commercial data sales, or predatory terms were detected.`,
          evidence: {
            sourceType: 'DOCUMENT',
            sourceUrl: finalUrl,
            capturedAt: Date.now(),
            documentHash: hashHex,
            excerpt: texts.slice(0, 2).join(' ... '),
            context: `Successfully evaluated ${clauses.length} clauses locally.`
          }
        });
      }

      setRawFindings(prev => {
        const existingExcerpts = new Set(prev.map(f => f.evidence?.excerpt || ''));
        const fresh = newFindings.filter(f => !existingExcerpts.has(f.evidence?.excerpt || ''));
        const combined = [...prev, ...fresh];
        chrome.storage.local.get('findings_cache', (res) => {
          const cache = res.findings_cache || {};
          cache[currentDomain] = combined;
          chrome.storage.local.set({ findings_cache: cache });
        });
        return combined;
      });

      // Switch to Legal tab automatically to see results
      setActiveTab('LEGAL');
    } catch (err: any) {
      console.error('Deep Audit Error:', err);
      setRawFindings(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          category: 'LEGAL',
          severity: 'INFO',
          confidence: 'MEDIUM',
          reviewStatus: 'REVIEW_NEEDED',
          ruleId: 'LEGAL-AUDIT_NOTICE',
          ruleName: 'Policy Access Restricted',
          interpretation: `NOTICE: Could not automatically fetch external policy (${err?.message || 'CORS/Protected'}). Navigate directly to the policy page and click "Audit Current Page" to analyze live.`,
          evidence: {
            sourceType: 'DOCUMENT',
            sourceUrl: targetUrl || currentUrl,
            capturedAt: Date.now(),
            documentHash: '',
            excerpt: `Target: ${targetUrl || currentUrl}`,
            context: 'Host server protected or authentication-walled.'
          }
        }
      ]);
      setActiveTab('LEGAL');
    } finally {
      setIsAuditing(false);
    }
  };

  if (!state) {
    return <div className="p-8 text-center text-gray-500">Loading Vigil...</div>;
  }

  // 1. FIRST_RUN
  if (!state.onboardingComplete) {
    return <Onboarding onComplete={() => updateState({ onboardingComplete: true, lastConsentVersion: "3.0" })} />;
  }

  // Handle Restricted Pages
  const isRestricted = currentUrl ? (
    (currentUrl.startsWith('chrome:') && !currentUrl.startsWith('chrome-extension:')) || 
    (currentUrl.startsWith('edge:') && !currentUrl.startsWith('edge-extension:')) || 
    currentUrl.startsWith('about:') || 
    currentUrl.includes('chrome.google.com/webstore')
  ) : false;
  
  if (isRestricted) {
    return (
      <div className="flex flex-col bg-gray-50 min-h-[480px] items-center justify-center p-6 text-center border border-gray-200">
        <span className="text-4xl mb-3">🛡️</span>
        <p className="font-bold text-gray-700 mb-1">Protection unavailable</p>
        <p className="text-sm text-gray-500">Vigil cannot analyze internal browser pages or restricted URLs.</p>
        <div className="mt-8 text-[10px] text-gray-400">Vigil v{EXTENSION_VERSION}</div>
      </div>
    );
  }

  // 2. Settings Dashboard
  if (showSettings) {
    return (
      <PermissionDashboard 
        state={state} 
        onUpdate={updateState}
        onRevokeOrigin={async (origin) => {
          await revokePermission([`https://${origin}/*`]);
        }}
        onRevokeAll={async () => {
          const origins = state.protectedOrigins.map(o => `https://${o}/*`);
          if (state.capabilities.allSitesAccessGranted) origins.push('<all_urls>');
          if (origins.length > 0) {
            await revokePermission(origins);
          }
        }}
        onClose={() => setShowSettings(false)} 
      />
    );
  }

  const isStrictProtected = state.capabilities.allSitesAccessGranted || state.capabilities.siteAccessGranted;

  const handleGrantStrictSite = async () => {
    const isLocal = currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';
    await requestPermission([`${proto}://${currentDomain}/*`], { 
      strictIntent: state.strictIntent === 'OFF' ? 'SITE' : state.strictIntent, 
      protectedOrigins: [...new Set([...state.protectedOrigins, currentDomain])] 
    });
    setShowStrictJIT(false);
  };

  const handleGrantStrictAll = async () => {
    await requestPermission(['<all_urls>'], { 
      strictIntent: 'ALL_SITES' 
    });
    setShowStrictJIT(false);
  };

  // Run correlation engine
  const assessment = correlateFindings(rawFindings, {
    pageBehavior: true, 
    threatIntel: true,
    thirdPartyRequests: true,
    legalReviewed: rawFindings.some(f => f.category === 'LEGAL'),
    strictPrivacyEnabled: isStrictProtected
  });

  const legalFindings = rawFindings.filter(f => f.category === 'LEGAL');

  return (
    <div className="bg-gray-50 min-h-[480px] w-[380px] flex flex-col text-gray-800 font-sans relative">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h1 className="text-sm font-bold tracking-tight">VIGIL</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'OVERVIEW' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('COOKIES')}
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'COOKIES' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Cookies {cookies.length > 0 && `(${cookies.length})`}
          </button>
          <button
            onClick={() => setActiveTab('LEGAL')}
            className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'LEGAL' ? 'bg-white shadow-xs text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Terms {legalFindings.length > 0 && `(${legalFindings.length})`}
          </button>
        </div>

        <button 
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-gray-800 transition-colors ml-1"
          title="Settings"
        >
          <span className="text-base">⚙️</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto pb-8">
        {activeTab === 'OVERVIEW' && (
          <>
            <AssessmentGauge assessment={assessment} />

            {/* Feature Triggers */}
            <div className="grid grid-cols-2 gap-2 mt-4 mb-5">
              <button 
                onClick={() => isStrictProtected ? alert('Strict Privacy is already active on this origin.') : setShowStrictJIT(true)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${isStrictProtected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
              >
                <span className="text-lg mb-1">{isStrictProtected ? '🛡️' : '🔓'}</span>
                <span className="font-bold text-sm text-gray-900 leading-tight mb-1">Strict Privacy</span>
                <span className={`text-xs font-semibold ${isStrictProtected ? 'text-blue-600' : 'text-gray-500'}`}>
                  {isStrictProtected ? 'Active' : 'OFF'}
                </span>
              </button>
              
              <button 
                onClick={() => setActiveTab('LEGAL')}
                className="flex flex-col items-start p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-left transition-colors"
              >
                <span className="text-lg mb-1">⚖️</span>
                <span className="font-bold text-sm text-gray-900 leading-tight mb-1">Deep Audit</span>
                <span className="text-xs text-gray-500 font-semibold">
                  {legalDocsFound.length} Policies Found
                </span>
              </button>
            </div>

            <FindingList findings={assessment.correlatedFindings} domain={currentDomain} />
          </>
        )}

        {activeTab === 'COOKIES' && (
          <CookieInventoryView 
            cookies={cookies}
            trackersBlockedCount={trackersBlockedCount}
            thirdPartyTrackers={thirdPartyTrackers}
            domain={currentDomain}
            onRefresh={() => {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) loadCookiesForDomain(currentDomain, tabs[0].id);
              });
            }}
          />
        )}

        {activeTab === 'LEGAL' && (
          <LegalAuditView 
            legalFindings={legalFindings}
            discoveredDocs={legalDocsFound}
            isAuditing={isAuditing}
            onRunAudit={handleAuditDocument}
            domain={currentDomain}
            currentUrl={currentUrl}
          />
        )}
      </main>

      {/* Footer */}
      <footer 
        className="text-center py-2 text-[10px] text-gray-400 border-t bg-white cursor-default select-none sticky bottom-0"
        onDoubleClick={() => setShowDebug(!showDebug)}
      >
        Vigil v{EXTENSION_VERSION}
      </footer>

      {/* Modals */}
      {showStrictJIT && (
        <StrictPrivacyModal 
          currentDomain={currentDomain} 
          onCancel={() => setShowStrictJIT(false)} 
          onGrantSite={handleGrantStrictSite}
          onGrantAll={handleGrantStrictAll}
        />
      )}

      {showDeepAuditJIT && (
        <DeepAuditModal 
          documentsFound={legalDocsFound}
          onCancel={() => setShowDeepAuditJIT(false)}
          onAudit={(targetUrl) => {
            setShowDeepAuditJIT(false);
            handleAuditDocument(targetUrl);
          }}
        />
      )}

      {/* Debug Overlay */}
      {showDebug && (
        <DebugPanel 
          state={state} 
          domain={currentDomain} 
          rawCount={rawFindings.length} 
          correlatedCount={assessment.correlatedFindings.length} 
          onClose={() => setShowDebug(false)} 
        />
      )}
    </div>
  );
}
