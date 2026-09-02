import React from 'react';
import { ConfidenceState } from '../../shared/types';

interface ConfidenceBadgeProps {
  state: ConfidenceState;
}

const BADGE_CONFIG: Record<ConfidenceState, { label: string; className: string }> = {
  under_review: { label: 'Checking', className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  disputed: { label: 'Disputed', className: 'bg-orange-100 text-orange-700' },
};

/**
 * Tiny status pill — minimal, not attention-grabbing.
 */
export function ConfidenceBadge({ state }: ConfidenceBadgeProps) {
  const config = BADGE_CONFIG[state] || BADGE_CONFIG.under_review;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className}`}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
