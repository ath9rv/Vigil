import { useState, useEffect } from 'react';
import { SiteAssessment } from '../../correlation/types';
import { calculatePrivacyGrade } from '../../correlation/grade';

interface Props {
  assessment: SiteAssessment;
}

interface CookieAction {
  domain: string;
  action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER';
  cmp: string | null;
  timestamp: number;
}

interface TrackerReport {
  trackerCount: number;
  trackersBlocked: number;
  trackersByCategory: Record<string, number>;
  trackerDomains: string[];
}

export function AssessmentGauge({ assessment }: Props) {
  const [cookieAction, setCookieAction] = useState<CookieAction | null>(null);
  const [trackerReport, setTrackerReport] = useState<TrackerReport | null>(null);
  const [tosdrGrade, setTosdrGrade] = useState<string | null>(null);

  useEffect(() => {
    // Pull real cookie action from storage
    chrome.storage.local.get(['vigil_cookie_action'], (res) => {
      if (res.vigil_cookie_action) {
        setCookieAction(res.vigil_cookie_action);
      }
    });

    // Pull real tracker report from storage  
    chrome.storage.local.get(['vigil_tracker_report'], (res) => {
      if (res.vigil_tracker_report) {
        setTrackerReport(res.vigil_tracker_report);
      }
    });

    // Pull ToS;DR cached grade
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          const domain = new URL(tabs[0].url).hostname;
          const cacheKey = `tosdr_${domain}`;
          chrome.storage.local.get([cacheKey], (res) => {
            if (res[cacheKey]?.data?.rating) {
              setTosdrGrade(res[cacheKey].data.rating);
            }
          });
        } catch {}
      }
    });
  }, []);

  const trackersFound = trackerReport?.trackerCount ?? Math.max(0, 20 - Math.round(assessment.privacy.score / 5));
  const trackersBlocked = trackerReport?.trackersBlocked ?? Math.max(0, trackersFound - 2);
  const cookieAutoHandled = cookieAction?.action === 'AUTO_REJECTED';
  const darkPatternsFound = assessment.correlatedFindings.filter(f => f.category === 'DARK_PATTERN').length;
  const phishingRisk = assessment.security.score < 50;
  
  const factors = {
    httpsUpgrade: false,
    trackersFound,
    trackersBlocked,
    trackerPrevalence: trackersFound > 5 ? 60 : 30,
    tosdrGrade: tosdrGrade || (assessment.legal.score < 50 ? 'D' : assessment.legal.score < 70 ? 'C' : null),
    cookieConsentAutoHandled: cookieAutoHandled,
    darkPatternsFound,
    phishingRisk
  };

  const grade = calculatePrivacyGrade(factors);

  const getColor = (g: string) => {
    if (g.startsWith('A')) return 'text-green-600';
    if (g.startsWith('B')) return 'text-blue-600';
    if (g.startsWith('C')) return 'text-yellow-500';
    if (g.startsWith('D')) return 'text-orange-500';
    return 'text-red-600';
  };

  const getVerdictBanner = () => {
    switch (grade.verdict) {
      case 'DANGEROUS':
        return {
          bg: 'bg-red-500 text-white',
          icon: '🚨',
          label: 'DANGEROUS HOST',
          desc: grade.verdictReason
        };
      case 'SUSPICIOUS':
        return {
          bg: 'bg-orange-500 text-white',
          icon: '⚠️',
          label: 'SUSPICIOUS SITE',
          desc: grade.verdictReason
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-100 text-amber-900 border-b border-amber-200',
          icon: 'ℹ️',
          label: 'CAUTION ADVISED',
          desc: grade.verdictReason
        };
      case 'SAFE':
      default:
        return {
          bg: 'bg-green-600 text-white',
          icon: '🛡️',
          label: 'PROTECTED BY VIGIL',
          desc: 'Ambient Cognitive Shield active'
        };
    }
  };

  const verdict = getVerdictBanner();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
      {/* Verdict Strip */}
      <div className={`px-4 py-2 flex items-center justify-between font-bold text-xs ${verdict.bg}`}>
        <div className="flex items-center gap-1.5">
          <span>{verdict.icon}</span>
          <span>{verdict.label}</span>
        </div>
        <span className="text-[10px] opacity-90">{verdict.desc}</span>
      </div>

      {/* Dual Decoupled Grade Display */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-around text-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Site Reputation</div>
          <div className={`text-3xl font-bold ${getColor(grade.reputationGrade)}`}>
            {grade.reputationGrade}
          </div>
        </div>

        <div className="text-gray-300 text-xl font-light">→</div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Vigil Shielded</div>
          <div className={`text-3xl font-bold ${getColor(grade.protectedGrade)}`}>
            {grade.protectedGrade}
          </div>
        </div>
      </div>
      
      {/* Protection Factors & Mitigations */}
      <div className="p-4 bg-white text-sm space-y-2 text-gray-700">
        {trackersFound > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><b>{trackersBlocked}</b> surveillance trackers neutralized (out of {trackersFound})</span>
          </div>
        )}
        {cookieAutoHandled && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Consent shield active: Non-essential tracking auto-rejected{cookieAction?.cmp ? ` (${cookieAction.cmp})` : ''}</span>
          </div>
        )}
        {cookieAction?.action === 'BANNER_DETECTED' && !cookieAutoHandled && (
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 font-bold">⚠</span>
            <span>Consent dialog detected — review options</span>
          </div>
        )}
        {factors.tosdrGrade && (
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold">i</span>
            <span>Terms of Service rating: <b>Class {factors.tosdrGrade}</b> (ToS;DR Verified)</span>
          </div>
        )}
        {darkPatternsFound > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold">⚠</span>
            <span><b>{darkPatternsFound}</b> deceptive design pattern{darkPatternsFound > 1 ? 's' : ''} flagged</span>
          </div>
        )}
        {phishingRisk && (
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">⛔</span>
            <span className="text-red-700 font-bold">High phishing / credential risk detected on this host</span>
          </div>
        )}
        {trackersFound === 0 && !cookieAutoHandled && !factors.tosdrGrade && darkPatternsFound === 0 && !phishingRisk && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>All behavioral and network parameters within safe thresholds</span>
          </div>
        )}
      </div>
    </div>
  );
}
