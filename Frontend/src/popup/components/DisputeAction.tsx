import React, { useState } from 'react';

interface DisputeActionProps {
  findingId: string;
}

/**
 * Action link to dispute a finding.
 */
export function DisputeAction({ findingId }: DisputeActionProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    try {
      const storageData = await chrome.storage.local.get('user_disputes');
      const disputes = storageData.user_disputes || {};
      disputes[findingId] = {
        feedback,
        timestamp: new Date().toISOString()
      };
      await chrome.storage.local.set({ user_disputes: disputes });
      setSubmitted(true);
      setTimeout(() => setExpanded(false), 2000);
    } catch (e) {
      console.error('Failed to save dispute:', e);
    }
  };

  if (submitted) {
    return <span className="text-xs text-green-600 font-medium">Feedback received</span>;
  }

  if (expanded) {
    return (
      <div className="flex flex-col gap-2 w-full pr-2">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Why is this incorrect?"
          className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none h-16 bg-white text-gray-800"
          aria-label="Dispute feedback"
        />
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!feedback.trim()}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="text-xs font-medium text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-2"
      aria-label="Dispute this finding"
    >
      This seems wrong?
    </button>
  );
}
