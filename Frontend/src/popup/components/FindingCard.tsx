import React, { useState } from 'react';
import { Finding, extractLocationTarget } from '../../evidence/evidence';
import { ExplainModePanel } from './ExplainModePanel';
import { ReportAdapter } from '../../evidence/forensic-report/report-adapter';

interface Props {
  finding: Finding;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  INFO: 'bg-gray-100 text-gray-800 border-gray-200',
};

const SEVERITY_ICONS: Record<string, string> = {
  CRITICAL: '🚨',
  HIGH: '⚠️',
  MEDIUM: '👀',
  LOW: 'ℹ️',
  INFO: '📝',
};

export function FindingCard({ finding }: Props) {
  const [showExplain, setShowExplain] = useState(false);

  const isThreat = finding.evidence?.sourceType === 'THREAT_INTEL';
  const headerColor = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.INFO;
  const icon = SEVERITY_ICONS[finding.severity] || SEVERITY_ICONS.INFO;
  const report = ReportAdapter.ensureCanonicalReport(finding);
  const locationTarget = extractLocationTarget(finding);

  const handleLocate = () => {
    if (!locationTarget) return;

    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'LOCATE_ON_PAGE',
            selector: locationTarget.selector,
            text: locationTarget.text,
            ruleName: locationTarget.ruleName,
            severity: locationTarget.severity,
            findingId: locationTarget.findingId,
          });
        }
      });
    }
  };


  // Threat card rendering (Critical priority)
  if (isThreat) {
    return (
      <div className="border-2 border-red-500 bg-white rounded-xl overflow-hidden mb-3 shadow-sm">
        <div className="bg-red-500 text-white px-4 py-2 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🚨</span> {finding.ruleName?.toUpperCase()}
          </div>
          <span className="text-[10px] bg-red-700 text-red-100 px-2 py-0.5 rounded font-mono font-bold">
            {finding.confidence}
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Source</div>
            <div className="text-sm font-medium">{finding.ruleId || 'Local Threat Index'}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Evidence</div>
            <div className="text-sm text-gray-800">{finding.interpretation}</div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowExplain(!showExplain)}
              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <span>🔍</span>
              <span>{showExplain ? 'Hide Explanation ▾' : 'Why did Vigil flag this? ▸'}</span>
            </button>
            {Boolean(locationTarget) && (
              <button
                onClick={handleLocate}
                className="text-red-600 hover:text-red-800 text-[11px] font-bold transition-colors"
              >
                Locate on Page ↗
              </button>
            )}
          </div>
          {showExplain && <ExplainModePanel report={report} />}
        </div>
      </div>
    );
  }

  // Standard Evidence Card with Explain Mode
  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden mb-3 shadow-sm">
      <div className={`px-4 py-2 border-b flex items-center justify-between text-sm font-bold ${headerColor}`}>
        <div className="flex items-center gap-2">
          <span>{icon}</span> {finding.ruleName?.toUpperCase() || finding.category}
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/60 text-gray-700">
          {finding.confidence} CONFIDENCE
        </span>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {finding.category}
          </span>
          {finding.reviewStatus === 'REVIEW_NEEDED' && (
            <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded">
              REVIEW NEEDED
            </span>
          )}
        </div>

        <p className="text-sm text-gray-800 font-medium mb-3 leading-relaxed">
          {finding.interpretation}
        </p>

        {/* Explain Mode Trigger & Page Locator */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowExplain(!showExplain)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <span>🔍</span>
            <span>{showExplain ? 'Hide Explanation ▾' : 'Why did Vigil flag this? ▸'}</span>
          </button>

          {Boolean(locationTarget) && (
            <button
              onClick={handleLocate}
              className="text-gray-500 hover:text-gray-700 text-[11px] font-medium transition-colors"
            >
              Locate on Page ↗
            </button>
          )}
        </div>

        {/* Explain Mode Progressive Disclosure Panel (Levels 1, 2, 3 & Export) */}
        {showExplain && <ExplainModePanel report={report} />}
      </div>
    </div>
  );
}
