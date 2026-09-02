import React from 'react';
import { Finding } from '../../evidence/evidence';
import { FindingCard } from './FindingCard';

interface Props {
  findings: Finding[];
  domain: string;
}

export function FindingList({ findings, domain }: Props) {
  if (findings.length === 0) {
    return null; // The empty state is handled by the parent
  }

  // Sort by severity (CRITICAL/severe first)
  const severityOrder: Record<string, number> = { 
    CRITICAL: 0, SEVERE: 0, 
    HIGH: 1, 
    MEDIUM: 2, 
    LOW: 3, 
    INFO: 4 
  };
  const getSeverityRank = (s: string) => severityOrder[(s || 'INFO').toUpperCase()] ?? 5;
  const sorted = [...findings].sort((a, b) => getSeverityRank(a.severity) - getSeverityRank(b.severity));

  return (
    <div className="flex flex-col mt-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
        Correlated Findings ({findings.length})
      </h3>
      
      <div className="flex flex-col gap-1">
        {sorted.map(finding => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </div>
  );
}
