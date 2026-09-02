import React from 'react';
import { PermissionState } from '../../shared/permission-state';

interface Props {
  state: PermissionState;
  domain: string;
  rawCount: number;
  correlatedCount: number;
  onClose: () => void;
}

export function DebugPanel({ state, domain, rawCount, correlatedCount, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[100] p-4 text-xs font-mono text-green-400 overflow-y-auto">
      <div className="flex justify-between items-center border-b border-green-800 pb-2 mb-4">
        <span className="font-bold uppercase tracking-widest text-green-300">Vigil Debug</span>
        <button onClick={onClose} className="text-white bg-red-900 hover:bg-red-800 px-3 py-1 rounded font-bold">CLOSE</button>
      </div>
      
      <div className="space-y-4">
        <section>
          <div className="text-green-200 font-bold mb-1 border-b border-green-900 uppercase">Context</div>
          <div>Origin: {domain || 'none'}</div>
          <div>Paused: {state.vigilPaused ? 'YES' : 'NO'}</div>
          <div>Consent Version: {state.lastConsentVersion}</div>
        </section>
        
        <section>
          <div className="text-green-200 font-bold mb-1 border-b border-green-900 uppercase">Permissions</div>
          <div>Intent (Strict): {state.strictIntent}</div>
          <div>Capability (Site Access): {state.capabilities.siteAccessGranted ? 'GRANTED' : 'NO'}</div>
          <div>Capability (All URLs): {state.capabilities.allSitesAccessGranted ? 'GRANTED' : 'NO'}</div>
          <div>Script Registered: {state.capabilities.scriptRegistered ? 'YES' : 'NO'}</div>
          <div className="mt-1">Protected Origins ({state.protectedOrigins.length}):</div>
          <ul className="pl-4 text-green-600 list-disc">
            {state.protectedOrigins.map(o => <li key={o}>{o}</li>)}
          </ul>
        </section>
        
        <section>
          <div className="text-green-200 font-bold mb-1 border-b border-green-900 uppercase">Evidence Pipeline</div>
          <div>Raw Findings: {rawCount}</div>
          <div>Correlations: {correlatedCount}</div>
        </section>
        
        <section>
          <div className="text-green-200 font-bold mb-1 border-b border-green-900 uppercase">Engines</div>
          <div>Threat DB Status: MOCK_ACTIVE</div>
          <div>Threat DB Age: 0m</div>
          <div>Legal Auditor Mode: {state.deepAudit}</div>
        </section>
      </div>
    </div>
  );
}
