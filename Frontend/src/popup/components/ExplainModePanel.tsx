import React, { useState } from 'react';
import type { CanonicalForensicReport } from '../../evidence/forensic-report/types';
import { ForensicReportFormatter } from '../../evidence/forensic-report/report-formatter';

interface Props {
  report: CanonicalForensicReport;
}

/**
 * ExplainModePanel (Layer 3 Product Surface)
 *
 * Interactive progressive disclosure view for findings:
 * - Level 1: What happened and why it matters (casual, non-technical)
 * - Level 2: Show receipts (timeline, supporting signals, rejected alternatives)
 * - Level 3: Technical trace (observation IDs, collector provenance, DAG claim lineage)
 * - Download forensic report (structured markdown receipt)
 *
 * Invariants Enforced:
 * - INV-V4-022: Zero mutation; pure read-only view.
 * - INV-V4-023: Semantic Fidelity; preserves exact confidence without inflation.
 * - PERF-V4-013: Zero Duplicate Reasoning; purely renders pre-computed report.
 */
export function ExplainModePanel({ report }: Props) {
  const [activeTier, setActiveTier] = useState<1 | 2 | 3>(1);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const l1 = ForensicReportFormatter.toLevel1UserExplanation(report);
  const l2 = ForensicReportFormatter.toLevel2EvidenceView(report);
  const l3 = ForensicReportFormatter.toLevel3ForensicView(report);

  const handleDownloadReport = () => {
    try {
      const markdown = ForensicReportFormatter.toStructuredInvestigationMarkdown(report);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vigil-report-${report.reportId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error('[Vigil] Failed to export forensic report', e);
    }
  };

  return (
    <div className="mt-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 p-4 shadow-lg text-xs">
      {/* Tier Switcher / Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-blue-400" aria-hidden="true">ðŸ›¡ï¸ Vigil Explain</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-300 font-mono text-[10px]">{report.reportId}</span>
        </div>
        <div
  role="tablist"
  aria-label="Explanation level"
  className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg"
>
  <button
    type="button"
    id="tier-1-tab"
    role="tab"
    aria-selected={activeTier === 1}
    aria-controls="tier-1-panel"
    onClick={() => setActiveTier(1)}
    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 ${activeTier === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
  >
    Overview
  </button>

  <button
    type="button"
    id="tier-2-tab"
    role="tab"
    aria-selected={activeTier === 2}
    aria-controls="tier-2-panel"
    onClick={() => setActiveTier(2)}
    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 ${activeTier === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
  >
    Receipts
  </button>

  <button
    type="button"
    id="tier-3-tab"
    role="tab"
    aria-selected={activeTier === 3}
    aria-controls="tier-3-panel"
    onClick={() => setActiveTier(3)}
    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 ${activeTier === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
  >
    Technical Trace
  </button>
</div>
    </div>
      {/* LEVEL 1: USER EXPLANATION (Human-First Narrative) */}
      {activeTier === 1 && (
        <div role="tabpanel" id="tier-1-panel" aria-labelledby="tier-1-tab" hidden={activeTier!==1} className="space-y-3">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
              What happened & why it matters
            </div>
            <p className="text-sm font-medium text-slate-100 leading-snug">
              {l1.headline}
            </p>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {l1.whyThisMatters}
            </p>
          </div>

          {/* Considered Alternatives Table */}
          {l1.consideredAlternatives.length > 0 && (
            <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                Possible explanations considered
              </div>
              <div className="space-y-1.5">
                {l1.consideredAlternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-start justify-between text-[11px] gap-2">
                    <span className="text-slate-200 font-medium capitalize">{alt.name}</span>
                    <div className="flex items-center gap-1 text-right">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          alt.verdict === 'Supported'
                            ? 'bg-amber-900/60 text-amber-200'
                            : alt.verdict === 'Unsupported'
                            ? 'bg-emerald-900/60 text-emerald-200'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {alt.verdict}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Epistemic Confidence & Non-Intent Disclaimer */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">Confidence:</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800">
                {l1.confidenceDisplay.label}
              </span>
            </div>
            <button
              onClick={() => setActiveTier(2)}
              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5"
            >
              Show receipts â–¸
            </button>
          </div>

          <div className="bg-slate-950/60 rounded p-2 text-[10px] text-slate-400 italic border border-slate-800">
            âš–ï¸ {l1.nonIntentDisclaimer}
          </div>
        </div>
      )}

      {/* LEVEL 2: EVIDENCE VIEW (Timeline & Receipts) */}
      {activeTier === 2 && (
        <div role="tabpanel" id="tier-2-panel" aria-labelledby="tier-2-tab" hidden={activeTier!==2} className="space-y-3">
          {/* Progression Timeline */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              Progression Timeline
            </div>
            <div className="space-y-2 border-l-2 border-blue-500/40 pl-3 ml-1.5">
              {l2.timelineEntries.map((t, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-blue-400" />
                  <div className="text-[10px] text-slate-400 font-mono">
                    T+{t.relativeTimeMs}ms Â· <span className="uppercase text-slate-500">{t.eventType}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-200">{t.summary}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Supports & Rejected Alternatives Checklists */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {l2.supports && l2.supports.length > 0 && (
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide mb-1">
                  Supported by observations
                </div>
                <ul className="space-y-1 text-[11px] text-emerald-100">
                  {l2.supports.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">âœ“</span>
                      <span>{s.replace(/^âœ“\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {l2.rejectedAlternatives && l2.rejectedAlternatives.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wide mb-1">
                  Ruled-out explanations
                </div>
                <ul className="space-y-1 text-[11px] text-rose-100">
                  {l2.rejectedAlternatives.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">âœ•</span>
                      <span>{r.replace(/^âœ—\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Remaining Uncertainty Callout */}
          {l2.remainingUncertainty && (
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-2.5 text-[10px]">
              <span className="font-bold text-amber-300 block mb-0.5">Remaining uncertainty:</span>
              <span className="text-slate-300">{l2.remainingUncertainty}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 text-[10px]">
            <button
              onClick={() => setActiveTier(1)}
              className="text-slate-400 hover:text-slate-200"
            >
              â—‚ Back to overview
            </button>
            <button
              onClick={() => setActiveTier(3)}
              className="text-blue-400 hover:text-blue-300 font-bold"
            >
              Technical trace â–¸
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 3: FORENSIC TRACE VIEW (Full Lineage) */}
      {activeTier === 3 && (
        <div role="tabpanel" id="tier-3-panel" aria-labelledby="tier-3-tab" hidden={activeTier!==3} className="space-y-3 font-mono text-[11px]">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-sans">
            Technical Audit Lineage
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300">
            <div><span className="text-slate-500">Navigation ID:</span> {l3.auditLineage.navigationId}</div>
            <div><span className="text-slate-500">Report ID:</span> {l3.auditLineage.reportId}</div>
            <div><span className="text-slate-500">Total Observations:</span> {l3.auditLineage.observationCount}</div>
            <div><span className="text-slate-500">Contradictions Found:</span> {l3.auditLineage.contradictionCount}</div>
            {l3.auditLineage.modelProvenance && (
                            <div><span className="text-slate-500">Model Assistance:</span> {l3.auditLineage.modelProvenance} (Î”c: {l3.auditLineage.reconciliationDelta ?? 0})</div>
            )}
          </div>

          {/* Primary Observations with Collector IDs */}
          <div className="space-y-1.5 font-sans">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Observed Raw Nodes (Immutable)
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {report.observations.map((obs, idx) => (
                <div key={idx} className="bg-slate-800/80 p-1.5 rounded text-[10px] border border-slate-700/60 font-mono">
                  <span className="text-blue-400 font-bold">{obs.observationId}</span> Â· {obs.description}
                </div>
              ))}
            </div>
          </div>

          {/* Formal Limitations */}
          {report.limitations.length > 0 && (
            <div className="bg-slate-950 p-2 rounded text-[10px] text-slate-400 font-sans border border-slate-800">
              <span className="font-bold text-slate-300 block mb-1">Audit Limitations:</span>
              <ul className="list-disc pl-3.5 space-y-0.5">
                {report.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-1 text-[10px] font-sans">
            <button
              onClick={() => setActiveTier(2)}
              className="text-slate-400 hover:text-slate-200"
            >
              â—‚ Back to receipts
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOAD FORENSIC REPORT BUTTON */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-sans">
          A structured record of observations and reasoning.
        </span>
        <button
          onClick={handleDownloadReport}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow transition-colors flex items-center gap-1"
        >
          <span aria-hidden="true">ðŸ“¥</span>
          <span>{downloadSuccess ? 'Downloaded!' : 'Download forensic report'}</span>
        </button>
      </div>
    </div>
  );
}
