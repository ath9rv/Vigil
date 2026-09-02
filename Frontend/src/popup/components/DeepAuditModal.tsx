import React, { useState } from 'react';

interface Props {
  documentsFound: { title: string; url: string }[];
  onAudit: (url: string) => void;
  onCancel: () => void;
}

export function DeepAuditModal({ documentsFound, onAudit, onCancel }: Props) {
  const [selectedDoc, setSelectedDoc] = useState<string>(documentsFound[0]?.url || '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>⚖️</span> Legal Terms Review
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Vigil can inspect legal documents you choose and analyze them locally.
          </p>
          
          {documentsFound.length > 0 ? (
            <div className="mb-4">
              <p className="font-semibold text-sm mb-2">Found on this page:</p>
              <div className="flex flex-col gap-2">
                {documentsFound.map(doc => (
                  <label key={doc.url} className="flex items-center gap-2 text-sm">
                    <input 
                      type="radio" 
                      name="legalDoc" 
                      checked={selectedDoc === doc.url}
                      onChange={() => setSelectedDoc(doc.url)}
                      className="text-blue-600"
                    />
                    <span>{doc.title}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-600 mb-4 font-medium">
              No standard legal links detected. Run on current page?
            </p>
          )}

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
            <p className="font-semibold mb-1">What will happen:</p>
            <ol className="list-decimal pl-4 space-y-1 mb-2">
              <li>Vigil retrieves the document you select.</li>
              <li>The document is analyzed locally.</li>
              <li>Findings include the exact source passage.</li>
            </ol>
            <p className="italic text-gray-500 mt-2">
              ⚠ Vigil does not determine whether a term is legally enforceable.
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex flex-col gap-2">
          <button 
            onClick={() => onAudit(selectedDoc)}
            disabled={!selectedDoc && documentsFound.length > 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
          >
            Audit Terms
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
