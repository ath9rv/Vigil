import React, { useState } from 'react';

interface Props {
  currentDomain: string;
  onGrantSite: () => void;
  onGrantAll: () => void;
  onCancel: () => void;
}

export function StrictPrivacyModal({ currentDomain, onGrantSite, onGrantAll, onCancel }: Props) {
  const [showAllOptions, setShowAllOptions] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Enable Strict Privacy?</h2>
          <p className="text-sm text-gray-600 mb-4">
            You asked Vigil to protect this site before its scripts run.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-4">
            <p className="mb-2">
              To do that, Vigil needs temporary/host access. This means Vigil can inspect and modify selected fingerprint APIs.
            </p>
            <p className="font-semibold mb-1">Vigil will not:</p>
            <ul className="space-y-1 text-gray-600">
              <li>✗ upload your browsing history</li>
              <li>✗ read passwords</li>
              <li>✗ send page contents to Vigil</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex flex-col gap-2">
          {!showAllOptions ? (
            <>
              <button 
                onClick={onGrantSite}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Protect this site
              </button>
              <button 
                onClick={() => setShowAllOptions(true)}
                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Choose protected sites...
              </button>
              <button 
                onClick={onCancel}
                className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onGrantSite}
                className="w-full py-2.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-colors"
              >
                Protect {currentDomain} only
              </button>
              <button 
                onClick={onGrantAll}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex flex-col items-center leading-tight"
              >
                <span>Protect all sites</span>
                <span className="text-[10px] opacity-80 font-normal">Requires broader access</span>
              </button>
              <button 
                onClick={onCancel}
                className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors mt-1"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
