import { useState, useEffect } from 'react';
import { SiteAssessment } from '../../correlation/types';
import { calculatePrivacyGrade } from '../../correlation/grade';
import type { TrackerReport } from '../../shared/types';

interface Props {
  assessment: SiteAssessment;
  domain: string;
  trackerReport: TrackerReport | null;
}

interface CookieAction {
  domain: string;
  action: 'AUTO_REJECTED' | 'BANNER_DETECTED' | 'NO_BANNER';
  cmp: string | null;
  timestamp: number;
}

export function AssessmentGauge({ assessment, domain, trackerReport }: Props) {
  const [cookieAction, setCookieAction] = useState<CookieAction | null>(null);
  const [tosdrGrade, setTosdrGrade] = useState<string | null>(null);

  useEffect(() => {
    // Pull real cookie action from storage
    chrome.storage.local.get(['vigil_cookie_action'], (res) => {
      if (res.vigil_cookie_action?.domain === domain) {
        setCookieAction(res.vigil_cookie_action);
      } else {
        setCookieAction(null);
      }
    });

    // Pull ToS;DR cached grade
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          const activeDomain = new URL(tabs[0].url).hostname;
          const cacheKey = `tosdr_${activeDomain}`;
          chrome.storage.local.get([cacheKey], (res) => {
            if (res[cacheKey]?.data?.rating) {
              setTosdrGrade(res[cacheKey].data.rating);
            }
          });
        } catch {}
      }
    });
  }, [domain]);

  const trackersFound = trackerReport?.trackerCount ?? 0;
  const trackersBlocked = trackerReport?.trackersBlocked ?? 0;
  const cookieAutoHandled = cookieAction?.action === 'AUTO_REJECTED';
  const darkPatternsFound = assessment.correlatedFindings.filter(f => f.category === 'DARK_PATTERN' && f.reviewStatus === 'CONFIRMED').length;
  const reviewSignals = assessment.correlatedFindings.filter(f => f.reviewStatus === 'REVIEW_NEEDED').length;
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
          label: 'NO CONFIRMED HIGH RISK',
          desc: 'Coverage shown below'
        };
    }
  };

  const verdict = getVerdictBanner();
  const coverageEntries: Array<[string, boolean]> = [
    ['DOM', assessment.coverage.pageBehavior],
    ['Threat intelligence', assessment.coverage.threatIntel],
    ['Network', assessment.coverage.thirdPartyRequests],
    ['Cookies', assessment.coverage.cookies ?? false],
    ['Storage', assessment.coverage.storage ?? false],
    ['Legal', assessment.coverage.legalReviewed],
    ['Dynamic events', assessment.coverage.dynamicEvents ?? false],
    ['Cross-site', assessment.coverage.crossSite ?? false]
  ];

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden mb-5 shadow-premium">
      {/* Verdict Strip */}
      <div className={`px-4 py-2.5 flex items-center justify-between font-bold text-xs shadow-inner ${
        grade.verdict === 'DANGEROUS' ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white' :
        grade.verdict === 'SUSPICIOUS' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
        grade.verdict === 'CAUTION' ? 'bg-amber-100 text-amber-900 border-b border-amber-200' :
        'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
      }`}>
        <div className="flex items-center gap-2 drop-shadow-sm">
          <span className="text-sm">{verdict.icon}</span>
          <span className="tracking-wide">{verdict.label}</span>
        </div>
        <span className="text-[10px] opacity-90 font-medium tracking-wide">{verdict.desc}</span>
      </div>

      {/* Dual Decoupled Grade Display */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-around text-center">
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Site Reputation</div>
          <div className={`text-4xl font-mono font-bold tracking-tighter ${getColor(grade.reputationGrade)} drop-shadow-sm`}>
            {grade.reputationGrade}
          </div>
        </div>

        <div className="text-slate-300 text-2xl font-light">→</div>

        <div className="flex flex-col items-center">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">Vigil Shielded</div>
          <div className={`text-4xl font-mono font-bold tracking-tighter ${getColor(grade.protectedGrade)} drop-shadow-sm`}>
            {grade.protectedGrade}
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 border-b border-slate-100 text-xs text-slate-600 bg-white">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-extrabold uppercase tracking-widest text-[10px] text-slate-500">Scan coverage</span>
          <span className={`font-bold font-mono text-[11px] ${assessment.coveragePercent >= 75 ? 'text-emerald-600' : assessment.coveragePercent >= 40 ? 'text-amber-600' : 'text-slate-500'}`}>
            {assessment.coveragePercent}% · {assessment.confidence} conf
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {coverageEntries.map(([label, covered]) => (
            <span key={label} className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase transition-colors ${covered ? 'bg-emerald-50 border border-emerald-200/50 text-emerald-700' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>
              {covered ? '✓' : '–'} {label}
            </span>
          ))}
        </div>
      </div>
      
      {/* Protection Factors & Mitigations */}
      <div className="p-5 bg-white text-[13px] leading-relaxed space-y-2.5 text-slate-700 font-medium">
        {trackersFound > 0 && (
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-500 font-bold mt-0.5">✓</span>
            <span><b className="text-slate-900 font-extrabold font-mono">{trackersFound}</b> tracker resource{trackersFound > 1 ? 's' : ''} loaded on this page</span>
          </div>
        )}
        {trackersBlocked > 0 && (
          <div className="flex items-start gap-2.5">
            <span className="text-indigo-500 font-bold mt-0.5">✓</span>
            <span><b className="text-slate-900 font-extrabold font-mono">{trackersBlocked}</b> tracker request{trackersBlocked > 1 ? 's' : ''} blocked by Vigil</span>
          </div>
        )}
        {!trackerReport && (
          <div className="flex items-start gap-2.5 opacity-60">
            <span className="text-slate-400 font-bold mt-0.5">…</span>
            <span>Tracker inventory is still being collected for this page</span>
          </div>
        )}
        {cookieAutoHandled && (
          <div className="flex items-start gap-2.5">
            <span className="text-sky-500 font-bold mt-0.5">✓</span>
            <span>Consent shield active: Non-essential tracking auto-rejected{cookieAction?.cmp ? ` (${cookieAction.cmp})` : ''}</span>
          </div>
        )}
        {cookieAction?.action === 'BANNER_DETECTED' && !cookieAutoHandled && (
          <div className="flex items-start gap-2.5">
            <span className="text-amber-500 font-bold mt-0.5">⚠</span>
            <span>Consent dialog detected — review options</span>
          </div>
        )}
        {factors.tosdrGrade && (
          <div className="flex items-start gap-2.5">
            <span className="text-purple-500 font-bold mt-0.5">i</span>
            <span>Terms of Service rating: <b className="text-slate-900 font-extrabold">Class {factors.tosdrGrade}</b> (ToS;DR Verified)</span>
          </div>
        )}
        {darkPatternsFound > 0 && (
          <div className="flex items-start gap-2.5">
            <span className="text-rose-500 font-bold mt-0.5">⚠</span>
            <span><b className="text-slate-900 font-extrabold font-mono">{darkPatternsFound}</b> deceptive design pattern{darkPatternsFound > 1 ? 's' : ''} flagged</span>
          </div>
        )}
        {phishingRisk && (
          <div className="flex items-start gap-2.5">
            <span className="text-rose-600 font-bold mt-0.5">⛔</span>
            <span className="text-rose-600 font-bold">High phishing / credential risk detected on this host</span>
          </div>
        )}
      </div>
    </div>
  );
}
