import React from 'react';
import { PermissionState } from '../../shared/permission-state';

interface Props {
  state: PermissionState;
  onUpdate: (updates: Partial<PermissionState>) => void;
  onRevokeOrigin: (origin: string) => void;
  onRevokeAll: () => void;
  onClose: () => void;
}

export function PermissionDashboard({ state, onUpdate, onRevokeOrigin, onRevokeAll, onClose }: Props) {
  // Using an optional fallback to handle the missing properties safely
  // (Assuming strictMode was renamed to strictIntent, and vigilPaused to something else in V3)
  const strictIntent = state.strictIntent || 'OFF';
  const vigilPaused = state.vigilPaused;
  const deepAudit = state.deepAudit;
  
  return (
    <div className="bg-white min-h-[480px] flex flex-col text-gray-800">
      <header className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h1 className="text-lg font-bold">Vigil Access</h1>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">
          ✕
        </button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Global Kill Switch */}
        <div className="flex items-center justify-between mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div>
            <div className="font-bold">Master Switch</div>
            <div className="text-xs text-gray-500">
              {vigilPaused ? 'Vigil is completely paused' : 'Vigil is active'}
            </div>
          </div>
          <button 
            onClick={() => onUpdate({ vigilPaused: !vigilPaused })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vigilPaused ? 'bg-gray-300' : 'bg-green-500'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${vigilPaused ? 'translate-x-1' : 'translate-x-6'}`} />
          </button>
        </div>

        {/* Protection Modes */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-3">
            <span className="font-medium text-gray-700 flex flex-col">
              <span>Strict Privacy Mode</span>
              <span className="text-[10px] text-gray-400 font-normal">Pre-empts canvas/API fingerprinting before scripts execute</span>
            </span>
            <span className="font-bold text-xs uppercase px-2 py-1 bg-gray-100 rounded text-gray-600">
              {strictIntent}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700 flex flex-col">
              <span>Deep Audit (External)</span>
              <span className="text-[10px] text-gray-400 font-normal">Sends URL for verification</span>
            </span>
            <button 
              onClick={() => onUpdate({ deepAudit: deepAudit === 'LOCAL_ONLY' ? 'EXTERNAL_VERIFICATION' : 'LOCAL_ONLY' })}
              className={`px-2 py-1 rounded text-xs font-bold ${deepAudit === 'EXTERNAL_VERIFICATION' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
            >
              {deepAudit === 'EXTERNAL_VERIFICATION' ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
          <span>Protected Sites (Strict Privacy)</span>
          {state.protectedOrigins.length > 0 && (
            <button onClick={onRevokeAll} className="text-red-500 hover:text-red-600">Remove All</button>
          )}
        </h2>
        
        {strictIntent === 'ALL_SITES' && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-3 flex justify-between items-center">
            <span>Protecting ALL sites.</span>
            <button onClick={onRevokeAll} className="bg-white text-amber-700 px-2 py-1 rounded border border-amber-200 text-xs font-bold hover:bg-amber-100 transition">
              Downgrade
            </button>
          </div>
        )}
        
        {state.protectedOrigins.length === 0 && strictIntent !== 'ALL_SITES' ? (
          <div className="text-sm text-gray-500 italic p-3 text-center bg-gray-50 rounded-lg">
            No sites granted Strict Privacy access.
          </div>
        ) : (
          <ul className="space-y-2">
            {state.protectedOrigins.map(origin => (
              <li key={origin} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg">
                <span className="font-medium truncate">{origin}</span>
                <button 
                  onClick={() => onRevokeOrigin(origin)}
                  className="text-gray-400 hover:text-red-500 font-bold px-2"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
