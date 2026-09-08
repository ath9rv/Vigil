import React, { useState } from 'react';
import { ExplainAuditResult } from '../../certification/field-validation';

interface Props {
  explanation: ExplainAuditResult;
  onRestore?: () => void;
  onViewEvidence?: () => void;
}

export function ExplainModeView({ explanation, onRestore, onViewEvidence }: Props) {
  const [restored, setRestored] = useState(false);

  const handleRestore = () => {
    if (onRestore) {
      onRestore();
      setRestored(true);
    }
  };

  if (explanation.acted) {
    return (
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Vigil Protected This Page
            </span>
          </div>
          {explanation.compatibilityScore && (
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
              {explanation.compatibilityScore}/100 Diagnostic
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-gray-900 mb-1">
          {explanation.ruleName}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3 bg-white/70 p-2 rounded-lg border border-emerald-100">
          <div>
            <span className="font-semibold text-gray-700">Confidence: </span>
            <span className="font-bold text-emerald-700">{explanation.detectionConfidence}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Safety Class: </span>
            <span className="font-bold text-emerald-700">{explanation.safetyClass}</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
            Why Vigil Acted
          </div>
          <ul className="text-xs text-gray-700 space-y-1">
            {explanation.evidenceBulletPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
            Action Taken
          </div>
          <p className="text-xs text-gray-800 font-medium bg-emerald-100/50 p-2 rounded border border-emerald-200">
            Deceptive UI elements neutralized without altering host page structure.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-emerald-100">
          {explanation.canRestore && !restored && (
            <button
              onClick={handleRestore}
              className="text-xs px-3 py-1.5 font-bold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-xs"
            >
              ↺ 1-Click Restore
            </button>
          )}
          {restored && (
            <span className="text-xs font-semibold text-emerald-700 py-1">
              ✓ Restored to original site state
            </span>
          )}
          {onViewEvidence && (
            <button
              onClick={onViewEvidence}
              className="text-xs px-3 py-1.5 font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs ml-auto"
            >
              View Evidence Lineage ▸
            </button>
          )}
        </div>
      </div>
    );
  }

  // When Vigil stayed passive (BLOCKED / GOVERNED)
  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 shadow-sm mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">⚠️</span>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
          Vigil Detected Suspicious Behavior
        </span>
      </div>

      <div className="text-xs font-bold text-amber-800 mb-2 bg-amber-100 px-2 py-1 rounded inline-block">
        Automatic Protection: BLOCKED
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-2">
        {explanation.ruleName}
      </h3>

      <div className="mb-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
          Why Vigil Stayed Passive
        </div>
        <p className="text-xs text-gray-700 leading-relaxed mb-2">
          Target element resides within an authentication, payment, or interactive user control context. 
          Vigil's safety invariants strictly forbid modifying login credentials or checkout inputs.
        </p>
        <ul className="text-xs text-gray-700 space-y-1">
          {explanation.evidenceBulletPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-amber-600 font-bold">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-gray-500 italic mb-3">
        Vigil continues monitoring and will report the threat, but leaves sensitive input elements unmodified.
      </p>

      {onViewEvidence && (
        <div className="pt-2 border-t border-amber-100 flex justify-end">
          <button
            onClick={onViewEvidence}
            className="text-xs px-3 py-1.5 font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
          >
            View Evidence Lineage ▸
          </button>
        </div>
      )}
    </div>
  );
}
