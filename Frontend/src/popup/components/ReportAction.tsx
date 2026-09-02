import React from 'react';
import { Finding } from '../../shared/types';
import { JAGRITI_DEEPLINK_TEMPLATE } from '../../shared/constants';

interface ReportActionProps {
  finding: Finding;
  domain: string;
}

/**
 * Simple "Report this" button — opens Jagriti complaint portal.
 */
export function ReportAction({ finding, domain }: ReportActionProps) {
  const handleReport = () => {
    const url = JAGRITI_DEEPLINK_TEMPLATE
      .replace('{domain}', encodeURIComponent(domain))
      .replace('{category}', encodeURIComponent(finding.ruleName))
      .replace('{description}', encodeURIComponent(finding.explanation));

    chrome.tabs.create({ url });
  };

  return (
    <button
      onClick={handleReport}
      className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
      aria-label={`Report ${finding.ruleName} to authorities`}
    >
      📋 Report this
    </button>
  );
}
