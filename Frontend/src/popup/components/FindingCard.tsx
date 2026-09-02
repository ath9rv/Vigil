import React, { useState } from 'react';
import { Finding } from '../../evidence/evidence';

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
  INFO: '📝'
};

export function FindingCard({ finding }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);
  
  const isThreat = finding.evidence?.sourceType === 'THREAT_INTEL';
  const headerColor = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.INFO;
  const icon = SEVERITY_ICONS[finding.severity] || SEVERITY_ICONS.INFO;

  // Threat card rendering (Critical priority)
  if (isThreat) {
    return (
      <div className="border-2 border-red-500 bg-white rounded-xl overflow-hidden mb-3">
        <div className="bg-red-500 text-white px-4 py-2 font-bold flex items-center gap-2">
          <span>🚨</span> {finding.ruleName?.toUpperCase()}
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
          <div className="flex gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Confidence</div>
              <div className="text-sm font-bold text-gray-900">{finding.confidence}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</div>
              <div className="text-sm font-bold text-red-600">{finding.ruleName === 'Malware Distribution' ? 'KNOWN_MALWARE' : 'KNOWN_PHISHING'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard Evidence Card
  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden mb-3 shadow-sm">
      <div className={`px-4 py-2 border-b flex items-center gap-2 text-sm font-bold ${headerColor}`}>
        <span>{icon}</span> {finding.ruleName?.toUpperCase() || finding.category}
      </div>
      
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {finding.category}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {finding.confidence} CONFIDENCE
          </span>
          {finding.reviewStatus === 'REVIEW_NEEDED' && (
            <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded">
              REVIEW NEEDED
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-800 font-medium mb-3">
          {finding.interpretation}
        </p>

        <button 
          onClick={() => setShowEvidence(!showEvidence)}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {showEvidence ? 'Hide Evidence ▾' : 'Show Evidence ▸'}
        </button>

        {showEvidence && (
          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700">
            {finding.evidence?.sourceType === 'DOCUMENT' && (
              <>
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <span className="font-bold">Source Document:</span>{' '}
                  <a 
                    href={finding.evidence?.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate block text-blue-600 hover:underline"
                  >
                    {finding.evidence?.sourceUrl || 'N/A'}
                  </a>
                  {finding.evidence?.documentHash && (
                    <span className="text-gray-400 font-mono text-[10px] block mt-1">Hash: {finding.evidence.documentHash.substring(0,16)}...</span>
                  )}
                </div>
              </>
            )}
            
            <div className="mb-2">
              <span className="font-bold block mb-1">Exact excerpt:</span>
              <div className="font-mono bg-white p-2 border border-gray-200 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                {finding.evidence?.excerpt || finding.evidence?.context || finding.interpretation || 'No excerpt available.'}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-gray-400 mt-2">
              <div>
                <span className="block">Captured: {finding.evidence?.capturedAt ? new Date(finding.evidence.capturedAt).toLocaleDateString() : 'N/A'}</span>
                <span className="block">Source: {finding.evidence?.sourceType || 'DOM'}</span>
              </div>
              
              {(finding.evidence?.sourceType === 'DOCUMENT' || finding.evidence?.sourceType === 'DOM' || !finding.evidence) && (finding.evidence?.excerpt || finding.interpretation) && (
                <button 
                  onClick={() => {
                    const textToHighlight = finding.evidence?.excerpt || finding.interpretation;
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                      if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                          type: 'VIGIL_HIGHLIGHT_TEXT',
                          text: textToHighlight
                        });
                      }
                    });
                  }}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-colors"
                >
                  Locate on Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
