import React, { useEffect, useState } from 'react';
import { usePermissionState } from './hooks/usePermissionState';
import { Onboarding } from './components/Onboarding';
import { StrictPrivacyModal } from './components/StrictPrivacyModal';
import { DeepAuditModal } from './components/DeepAuditModal';
import { PermissionDashboard } from './components/PermissionDashboard';
import { AssessmentGauge } from './components/AssessmentGauge';
import { FindingList } from './components/FindingList';
import { DebugPanel } from './components/DebugPanel';
import { EXTENSION_VERSION } from '../shared/constants';
import { correlateFindings } from '../correlation/correlate';

export default function App() {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const { state, updateState, revokePermission, requestPermission } = usePermissionState(currentDomain);
  
  // Navigation / Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showStrictJIT, setShowStrictJIT] = useState(false);
  const [showDeepAuditJIT, setShowDeepAuditJIT] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [legalDocsFound, setLegalDocsFound] = useState<{title:string, url:string}[]>([]);
  
  // Data State
  const [rawFindings, setRawFindings] = useState<any[]>([]); 

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 0) {
        // Prefer the active web page tab over the extension popup's own URL
        const targetTab = tabs.find(t => t.url && t.url.startsWith('http')) || tabs.find(t => t.active) || tabs[0];
        if (targetTab && targetTab.url) {
          const url = targetTab.url;
          setCurrentUrl(url);
          try {
            const domain = new URL(url).hostname;
            setCurrentDomain(domain);
            setLegalDocsFound([{ title: 'Terms of Service', url }]);
            
            chrome.storage.local.get('findings_cache', (res) => {
              if (res.findings_cache && res.findings_cache[domain]) {
                setRawFindings(res.findings_cache[domain]);
              }
            });
          } catch { /* ignore invalid URLs */ }
        }
      }
    });
  }, []);

  if (!state) {
    return <div className="p-8 text-center text-gray-500">Loading Vigil...</div>;
  }

  // 1. FIRST_RUN
  if (!state.onboardingComplete) {
    return <Onboarding onComplete={() => updateState({ onboardingComplete: true, lastConsentVersion: "3.0" })} />;
  }

  // Handle Restricted Pages (chrome://, edge://, file://, webstore)
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
    await requestPermission([`https://${currentDomain}/*`], { 
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
    legalReviewed: false,
    strictPrivacyEnabled: isStrictProtected
  });

  return (
    <div className="bg-gray-50 min-h-[480px] flex flex-col text-gray-800 font-sans relative">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h1 className="text-sm font-bold tracking-tight">VIGIL</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-gray-800 transition-colors"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-8">
        
        <AssessmentGauge assessment={assessment} />

        {/* Feature Triggers */}
        <div className="grid grid-cols-2 gap-2 mt-4 mb-6">
          <button 
            onClick={() => isStrictProtected ? alert('Already protected by capabilities.') : setShowStrictJIT(true)}
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${isStrictProtected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
          >
            <span className="text-lg mb-1">{isStrictProtected ? '🛡️' : '🔓'}</span>
            <span className="font-bold text-sm text-gray-900 leading-tight mb-1">Strict Privacy</span>
            <span className={`text-xs font-semibold ${isStrictProtected ? 'text-blue-600' : 'text-gray-500'}`}>
              {isStrictProtected ? 'Active' : 'OFF'}
            </span>
          </button>
          
          <button 
            onClick={() => setShowDeepAuditJIT(true)}
            className="flex flex-col items-start p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-left transition-colors"
          >
            <span className="text-lg mb-1">⚖️</span>
            <span className="font-bold text-sm text-gray-900 leading-tight mb-1">Deep Audit</span>
            <span className="text-xs text-gray-500 font-semibold">ActiveTab</span>
          </button>
        </div>

        <FindingList findings={assessment.correlatedFindings} domain={currentDomain} />
      </main>

      {/* Footer */}
      <footer 
        className="text-center py-2 text-[10px] text-gray-400 border-t bg-white cursor-default select-none"
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
          onAudit={async (targetUrl) => {
            setShowDeepAuditJIT(false);
            try {
              let texts: string[] = [];
              let pageTitle = targetUrl;
              
              if (targetUrl === currentUrl) {
                // Current page: Extract via activeTab scripting
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.id) {
                  if (tab.url && (tab.url.startsWith('chrome') || tab.url.startsWith('edge') || tab.url.startsWith('about'))) {
                    alert('Cannot audit internal browser pages.');
                    return;
                  }
                  const [injectionResult] = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                      const root = document.querySelector('main') || document.body;
                      const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, [class*="cookie"], [id*="cookie"]'));
                      return {
                        title: document.title,
                        texts: paragraphs.map(p => p.textContent?.trim().replace(/\s+/g, ' ') || '').filter(t => t.length >= 15)
                      };
                    }
                  });
                  if (injectionResult.result) {
                    texts = injectionResult.result.texts;
                    pageTitle = injectionResult.result.title;
                  }
                }
              } else {
                // External link: Fetch and parse in popup
                const res = await fetch(targetUrl);
                const html = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const root = doc.querySelector('main') || doc.body;
                const paragraphs = Array.from(root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
                texts = paragraphs.map(p => p.textContent?.trim().replace(/\s+/g, ' ') || '').filter(t => t.length >= 15);
                pageTitle = doc.title;
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
                url: targetUrl,
                title: pageTitle,
                hash: hashHex,
                retrievedAt: Date.now(),
                fullText,
                clauses
              };

              // We need to dynamically import auditor to avoid dependency loops or large bundle on boot
              const { processLegalDocument } = await import('../legal-auditor/auditor');
              const newFindings = await processLegalDocument(extractionResult);
              
              if (newFindings.length > 0) {
                setRawFindings(prev => {
                  const combined = [...prev, ...newFindings];
                  chrome.storage.local.get('findings_cache', (res) => {
                    const cache = res.findings_cache || {};
                    cache[currentDomain] = combined;
                    chrome.storage.local.set({ findings_cache: cache });
                  });
                  return combined;
                });
                alert(`Deep Audit Complete! Found ${newFindings.length} legally significant clauses. Check the findings list.`);
              } else {
                alert('Deep Audit Complete: No tricky clauses or malicious cookies found.');
              }
            } catch (err) {
              console.error(err);
              alert('Failed to run Deep Audit on this document.');
            }
          }}
        />
      )}

      {/* Debug Overlay */}
      {showDebug && <DebugPanel state={state} domain={currentDomain} rawCount={rawFindings.length} correlatedCount={assessment.correlatedFindings.length} onClose={() => setShowDebug(false)} />}
    </div>
  );
}
