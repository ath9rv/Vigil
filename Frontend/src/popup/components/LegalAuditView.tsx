import React, { useState } from 'react';
import { Finding } from '../../evidence/evidence';

interface Props {
  legalFindings: Finding[];
  discoveredDocs: { title: string; url: string }[];
  isAuditing: boolean;
  onRunAudit: (url: string) => void;
  domain: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  DATA_SALE: '💰',
  DATA_SHARING: '👥',
  COOKIE_POLICY: '🍪',
  ARBITRATION: '⚖️',
  CLASS_ACTION: '🚫',
  CONTENT_LICENSE: '📄',
  AI_TRAINING: '🤖',
  TERMINATION: '⚠️',
  USER_RIGHTS: '🛡️',
  GOVERNMENT_DISCLOSURE: '🏛️',
  DATA_RETENTION: '⏳',
  CHILDREN_DATA: '👶',
  LIABILITY: '📜'
};

export function LegalAuditView({ legalFindings, discoveredDocs, isAuditing, onRunAudit, domain }: Props) {
  const [selectedDocUrl, setSelectedDocUrl] = useState<string>(discoveredDocs[0]?.url || '');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null);

  // Derive counts
  const trickyCount = legalFindings.filter(f => f.interpretation.includes('TRICKY') || f.interpretation.includes('WARNING') || f.interpretation.includes('UNFAIR')).length;
  const fairCount = legalFindings.filter(f => f.interpretation.includes('FAIR') || f.interpretation.includes('HARMLESS')).length;
  const noticeCount = legalFindings.filter(f => f.interpretation.includes('NOTICE')).length;

  const filteredFindings = legalFindings.filter(f => {
    if (activeCategoryFilter === 'ALL') return true;
    if (activeCategoryFilter === 'TRICKY') return f.interpretation.includes('TRICKY') || f.interpretation.includes('WARNING') || f.interpretation.includes('UNFAIR');
    if (activeCategoryFilter === 'FAIR') return f.interpretation.includes('FAIR') || f.interpretation.includes('HARMLESS');
    if (activeCategoryFilter === 'COOKIES') return f.ruleId?.includes('COOKIE') || f.ruleName?.toLowerCase().includes('cookie') || f.interpretation.toLowerCase().includes('cookie');
    return true;
  });

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Policy Selection Card */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span>📜</span> Discovered Policies ({discoveredDocs.length})
          </span>
          <span className="text-[10px] text-gray-400 font-medium">Local Analysis</span>
        </div>

        {discoveredDocs.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <select
              value={selectedDocUrl}
              onChange={(e) => setSelectedDocUrl(e.target.value)}
              className="text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {discoveredDocs.map((doc, idx) => (
                <option key={doc.url + idx} value={doc.url}>
                  {doc.title}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => onRunAudit(selectedDocUrl || discoveredDocs[0]?.url)}
              disabled={isAuditing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {isAuditing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Analyzing Document Clauses...
                </>
              ) : (
                <>
                  <span>🔍</span> Deep Audit Selected Policy
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">
              No direct policy links found in footer. You can audit the current page directly.
            </p>
            <button
              onClick={() => onRunAudit(window.location.href)}
              disabled={isAuditing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {isAuditing ? 'Analyzing Page...' : '🔍 Audit Current Page'}
            </button>
          </div>
        )}
      </div>

      {/* Summary Scoreboard */}
      {legalFindings.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div 
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'TRICKY' ? 'ALL' : 'TRICKY')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${activeCategoryFilter === 'TRICKY' ? 'ring-2 ring-rose-500' : ''} bg-rose-50 border-rose-200`}
          >
            <span className="text-lg font-bold text-rose-700 block">{trickyCount}</span>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Tricky Terms</span>
          </div>
          <div 
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'COOKIES' ? 'ALL' : 'COOKIES')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${activeCategoryFilter === 'COOKIES' ? 'ring-2 ring-blue-500' : ''} bg-blue-50 border-blue-200`}
          >
            <span className="text-lg font-bold text-blue-700 block">
              {legalFindings.filter(f => f.ruleId?.includes('COOKIE') || f.ruleName?.toLowerCase().includes('cookie')).length}
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Cookie Clauses</span>
          </div>
          <div 
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'FAIR' ? 'ALL' : 'FAIR')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${activeCategoryFilter === 'FAIR' ? 'ring-2 ring-emerald-500' : ''} bg-emerald-50 border-emerald-200`}
          >
            <span className="text-lg font-bold text-emerald-700 block">{fairCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Fair Terms</span>
          </div>
        </div>
      )}

      {/* Clause Findings List */}
      <div className="flex flex-col gap-2 mt-1">
        {filteredFindings.length === 0 ? (
          <div className="bg-white p-5 rounded-xl border border-gray-200 text-center text-gray-500">
            <span className="text-xl block mb-1">⚖️</span>
            <p className="text-xs font-semibold text-gray-700">No legal clauses audited yet</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Select a policy above and click "Deep Audit" to inspect terms and conditions in detail.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isTricky = finding.interpretation.includes('TRICKY') || finding.interpretation.includes('WARNING') || finding.interpretation.includes('UNFAIR');
            const isFair = finding.interpretation.includes('FAIR') || finding.interpretation.includes('HARMLESS');
            const isExpanded = expandedClauseId === finding.id;

            const badgeBg = isTricky ? 'bg-rose-100 text-rose-800 border-rose-200' : 
                            isFair ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                            'bg-yellow-100 text-yellow-800 border-yellow-200';

            const statusIcon = isTricky ? '🚨' : isFair ? '🛡️' : '⚠️';
            const categoryKey = finding.ruleId?.replace('LEGAL-', '') || '';
            const catIcon = CATEGORY_ICONS[categoryKey] || '📝';

            return (
              <div 
                key={finding.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div 
                  onClick={() => setExpandedClauseId(isExpanded ? null : finding.id)}
                  className="p-3 cursor-pointer hover:bg-gray-50 flex items-start justify-between gap-2"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeBg}`}>
                        {statusIcon} {finding.ruleName?.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {catIcon} {finding.confidence} CONFIDENCE
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-snug">
                      {finding.interpretation}
                    </p>
                  </div>
                  <span className="text-gray-400 text-xs mt-1">
                    {isExpanded ? '▴' : '▾'}
                  </span>
                </div>

                {/* Excerpt Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/60 text-xs flex flex-col gap-2">
                    {finding.evidence?.sourceUrl && (
                      <div className="text-[11px] text-gray-500 truncate">
                        <span className="font-bold text-gray-700">Source:</span>{' '}
                        <a 
                          href={finding.evidence.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {finding.evidence.sourceUrl}
                        </a>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-gray-700 block mb-0.5 text-[11px]">Exact Document Excerpt:</span>
                      <div className="font-mono text-[10px] bg-white p-2 border border-gray-200 rounded leading-relaxed text-gray-700 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                        {finding.evidence?.excerpt || 'Excerpt unavailable.'}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400">
                      <span>Source: {finding.evidence?.sourceType || 'DOCUMENT'}</span>
                      <button 
                        onClick={() => {
                          const excerpt = finding.evidence?.excerpt || finding.interpretation;
                          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs[0]?.id) {
                              chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'VIGIL_HIGHLIGHT_TEXT',
                                text: excerpt
                              });
                            }
                          });
                        }}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-bold text-[10px]"
                      >
                        Locate on Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
