import React from 'react';
import { ModuleScore } from '../../shared/types';

interface TrustScoreGaugeProps {
  score: number;
  moduleScores: ModuleScore[];
}

/**
 * Simple, friendly trust score display.
 * Shows a big emoji + score + one-line verdict. That's it.
 */
export function TrustScoreGauge({ score }: TrustScoreGaugeProps) {
  let emoji = '🛡️';
  let verdict = 'This site looks safe';
  let bgClass = 'bg-green-50 border-green-200';
  let textClass = 'text-green-700';
  let scoreClass = 'text-green-600';

  if (score <= 40) {
    emoji = '🚨';
    verdict = 'Be careful on this site';
    bgClass = 'bg-red-50 border-red-200';
    textClass = 'text-red-700';
    scoreClass = 'text-red-600';
  } else if (score <= 70) {
    emoji = '⚠️';
    verdict = 'Some issues found';
    bgClass = 'bg-amber-50 border-amber-200';
    textClass = 'text-amber-700';
    scoreClass = 'text-amber-600';
  }

  return (
    <div className={`flex flex-col items-center p-5 rounded-2xl border ${bgClass}`}>
      <span className="text-5xl mb-3" role="img" aria-label={verdict}>{emoji}</span>
      <p className={`text-lg font-bold ${textClass} mb-1`}>{verdict}</p>
      <p className={`text-3xl font-black ${scoreClass}`}>
        {score}<span className="text-base font-medium text-gray-400">/100</span>
      </p>
    </div>
  );
}
