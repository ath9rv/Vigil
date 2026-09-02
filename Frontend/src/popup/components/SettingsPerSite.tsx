import React from 'react';
import { useStorageState } from '../hooks/useStorageState';

interface SettingsPerSiteProps {
  domain: string;
  enabled: boolean;
}

/**
 * Toggle switch for global enable and site-specific enable/disable.
 */
export function SettingsPerSite({ domain, enabled }: SettingsPerSiteProps) {
  const [, setEnabled] = useStorageState('enabled');
  const [denylist, setDenylist] = useStorageState('site_denylist');

  const safeDenylist = denylist || [];
  const isSiteActive = !safeDenylist.includes(domain);

  const toggleSite = () => {
    if (isSiteActive) {
      setDenylist([...safeDenylist, domain]);
    } else {
      setDenylist(safeDenylist.filter(d => d !== domain));
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <label className="flex items-center gap-2 cursor-pointer group" title={`Active on ${domain}`}>
        <span className="text-xs font-medium text-gray-600 truncate max-w-[120px]">
          Active on {domain}
        </span>
        <div className="relative inline-flex items-center">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isSiteActive} 
            onChange={toggleSite}
            disabled={!enabled}
            aria-label={`Enable Vigil on ${domain}`}
          />
          <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
        </div>
      </label>
      
      <label className="flex items-center gap-2 cursor-pointer group" title="Vigil Global Toggle">
        <span className="text-xs font-medium text-gray-600">Vigil Enabled</span>
        <div className="relative inline-flex items-center">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={enabled} 
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Enable Vigil globally"
          />
          <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
        </div>
      </label>
    </div>
  );
}
