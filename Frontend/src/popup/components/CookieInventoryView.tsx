import React, { useState } from 'react';
import { DetailedCookie, CookieCategory } from '../../network/cookie-classifier';

interface Props {
  cookies: DetailedCookie[];
  trackersBlockedCount: number;
  thirdPartyTrackers: { domain: string; category: string; count: number }[];
  domain: string;
  onRefresh: () => void;
}

const CATEGORY_STYLES: Record<CookieCategory, { bg: string; text: string; border: string; icon: string }> = {
  ESSENTIAL: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: '🛡️' },
  ANALYTICS: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: '📊' },
  MARKETING: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: '🎯' },
  FUNCTIONAL: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: '⚙️' },
  UNKNOWN: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', icon: '❓' }
};

export function CookieInventoryView({ cookies, trackersBlockedCount, thirdPartyTrackers, domain, onRefresh }: Props) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | CookieCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCookie, setExpandedCookie] = useState<string | null>(null);

  const categoryCounts = cookies.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredCookies = cookies.filter(c => {
    const matchesFilter = activeFilter === 'ALL' || c.category === activeFilter;
    const matchesSearch = searchTerm === '' || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const marketingCount = categoryCounts['MARKETING'] || 0;
  const analyticsCount = categoryCounts['ANALYTICS'] || 0;
  const essentialCount = categoryCounts['ESSENTIAL'] || 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs text-gray-500 font-medium">Active Cookies</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-gray-900">{cookies.length}</span>
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">on {domain}</span>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap text-[10px]">
            {marketingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                {marketingCount} Ad
              </span>
            )}
            {analyticsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                {analyticsCount} Analytics
              </span>
            )}
            {essentialCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                {essentialCount} Safe
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Network Shield</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{trackersBlockedCount}</span>
              <span className="text-[10px] text-gray-400">trackers</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
            <span className="text-emerald-500">●</span> DNR Blocklist Active
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-xs ${activeFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          All ({cookies.length})
        </button>
        <button
          onClick={() => setActiveFilter('MARKETING')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-xs ${activeFilter === 'MARKETING' ? 'bg-rose-600 text-white' : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'}`}
        >
          Marketing ({marketingCount})
        </button>
        <button
          onClick={() => setActiveFilter('ANALYTICS')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-xs ${activeFilter === 'ANALYTICS' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
        >
          Analytics ({analyticsCount})
        </button>
        <button
          onClick={() => setActiveFilter('ESSENTIAL')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap text-xs ${activeFilter === 'ESSENTIAL' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
        >
          Essential ({essentialCount})
        </button>
      </div>

      {/* Search & Refresh */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search cookie name or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onRefresh}
          title="Refresh cookies"
          className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs"
        >
          🔄
        </button>
      </div>

      {/* Itemized Cookie List */}
      <div className="flex flex-col gap-2">
        {filteredCookies.length === 0 ? (
          <div className="bg-white p-5 rounded-xl border border-gray-200 text-center text-gray-500">
            <span className="text-xl block mb-1">🍪</span>
            <p className="text-xs font-semibold text-gray-700">No matching cookies found</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {cookies.length === 0 
                ? 'No cookies currently stored for this site.' 
                : 'No cookies match the selected filter.'}
            </p>
          </div>
        ) : (
          filteredCookies.map((cookie) => {
            const style = CATEGORY_STYLES[cookie.category] || CATEGORY_STYLES.UNKNOWN;
            const isExpanded = expandedCookie === cookie.name;

            return (
              <div 
                key={cookie.name}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-left"
              >
                <div 
                  onClick={() => setExpandedCookie(isExpanded ? null : cookie.name)}
                  className="p-3 cursor-pointer hover:bg-gray-50 flex items-start justify-between gap-2"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-mono font-bold text-xs text-gray-900 truncate">
                        {cookie.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                        {style.icon} {cookie.category}
                      </span>
                      {cookie.risk === 'HIGH' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          HIGH RISK
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 truncate">
                      Provider: <strong className="text-gray-700">{cookie.provider}</strong>
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs mt-1">
                    {isExpanded ? '▴' : '▾'}
                  </span>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/60 text-xs flex flex-col gap-2">
                    <div>
                      <span className="font-bold text-gray-700 block mb-0.5 text-[11px]">Purpose:</span>
                      <p className="text-gray-600 leading-relaxed text-xs">{cookie.purpose}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-white p-2 rounded-lg border border-gray-200 font-mono">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Domain Scope</span>
                        <span className="text-gray-700 truncate block">{cookie.domain}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Path</span>
                        <span className="text-gray-700 block">{cookie.path || '/'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Security</span>
                        <span className="text-gray-700 block">
                          {cookie.secure ? '🔒 HTTPS Secure' : '⚠️ Insecure'}
                          {cookie.httpOnly && ' • HttpOnly'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Lifespan</span>
                        <span className="text-gray-700 block">{cookie.expiryText || 'Session'}</span>
                      </div>
                    </div>

                    {cookie.value && (
                      <div>
                        <span className="font-bold text-gray-700 block mb-0.5 text-[11px]">Value Preview:</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 block truncate select-all">
                          {cookie.value}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Third-Party Embedded Trackers On Page */}
      {thirdPartyTrackers.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mt-1 text-left">
          <h3 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
            <span>📡</span> Third-Party Embedded Resources ({thirdPartyTrackers.length})
          </h3>
          <div className="flex flex-col gap-1.5 text-xs max-h-40 overflow-y-auto">
            {thirdPartyTrackers.map(t => (
              <div key={t.domain} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="font-mono text-gray-800 text-[11px] truncate max-w-[200px]">{t.domain}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                  {t.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
