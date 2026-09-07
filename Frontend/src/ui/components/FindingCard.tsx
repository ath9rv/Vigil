import React from 'react';
import type { ForensicReport } from '../../shared/types';

interface FindingCardProps {
  report: ForensicReport;
}

/**
 * FindingCard
 *
 * A purely presentational component that renders a ForensicReport.
 * It performs zero reasoning, simply displaying the structured explanation engine output.
 * It distinctly separates observations from interpretation, and clearly displays
 * the boundaries (rejected inferences) of the finding.
 */
export const FindingCard: React.FC<FindingCardProps> = ({ report }) => {
  // Map confidence labels to visual treatments
  const confidenceColor = {
    HIGH: 'text-red-700 bg-red-100 border-red-300',
    MODERATE: 'text-orange-700 bg-orange-100 border-orange-300',
    LOW: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  }[report.confidenceLabel];

  const formatVerdictType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden max-w-xl font-sans text-sm">
      
      {/* Header: Verdict and Confidence */}
      <div className={`px-4 py-3 border-b ${confidenceColor}`}>
        <h3 className="font-bold tracking-wide uppercase text-xs mb-1">
          {formatVerdictType(report.verdictType)}
        </h3>
        <span className="inline-flex items-center text-xs font-semibold">
          {report.confidenceLabel} CONFIDENCE
        </span>
      </div>

      {/* Body: Distinct separation of Evidence, Reasoning, and Boundaries */}
      <div className="px-4 py-4 space-y-5 text-gray-800">
        
        {/* Section 1: Observations (The Facts) */}
        <section>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">What Vigil Observed</h4>
          <ul className="list-disc pl-5 space-y-1">
            {report.observations.map((obs, idx) => (
              <li key={idx} className="leading-relaxed">{obs}</li>
            ))}
          </ul>
        </section>

        {/* Section 2: Interpretation (The Reasoning) */}
        <section>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Why This Matters</h4>
          <p className="leading-relaxed">
            {report.rationale}
          </p>
        </section>

        {/* Section 3: Boundaries (What we didn't conclude) */}
        {report.rejectedInferences.length > 0 && (
          <section className="pt-3 mt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">What Vigil Did NOT Conclude</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 italic">
              {report.rejectedInferences.map((inference, idx) => (
                <li key={idx} className="leading-relaxed">
                  {inference}
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  );
};
