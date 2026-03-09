import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, LayoutDashboard } from 'lucide-react';
import ConflictMap from '../features/map/ConflictMap';
import ConflictFilters from '../features/conflicts/ConflictFilters';
import ConflictList from '../features/conflicts/ConflictList';
import { useConflicts } from '../features/conflicts/useConflicts';
import type { ConflictFiltersParams } from '../features/conflicts/types';
import UcdpEventFilters from '../features/ucdp/UcdpEventFilters';
import UcdpConflictList from '../features/ucdp/UcdpConflictList';
import { useUcdpEvents } from '../features/ucdp/useUcdpEvents';
import { useUcdpConflicts } from '../features/ucdp/useUcdpConflicts';
import { useUcdpStats } from '../features/ucdp/useUcdpStats';
import type { UcdpEventFilters as UcdpEventFiltersType } from '../features/ucdp/types';

type Tab = 'ucdp' | 'curated';

export default function Conflicts() {
  const [tab, setTab] = useState<Tab>('ucdp');

  // Curated conflicts state
  const [curatedFilters, setCuratedFilters] = useState<ConflictFiltersParams>({});
  const { data: curatedData, isLoading: curatedLoading } = useConflicts(curatedFilters);
  const curatedConflicts = curatedData?.conflicts ?? [];

  // UCDP state
  const [ucdpFilters, setUcdpFilters] = useState<UcdpEventFiltersType>({});
  const { data: ucdpGeoJson, isLoading: ucdpEventsLoading } = useUcdpEvents(ucdpFilters);
  const { data: ucdpConflictsData, isLoading: ucdpConflictsLoading } = useUcdpConflicts({
    year: ucdpFilters.year,
    region: ucdpFilters.region ? undefined : undefined,
  });
  const { data: ucdpStats } = useUcdpStats();

  const navigate = useNavigate();

  const handleConflictClick = useCallback(
    (slug: string) => navigate(`/conflicts/${slug}`),
    [navigate]
  );

  const ucdpConflicts = ucdpConflictsData?.data ?? [];
  const ucdpConflictCount = ucdpConflictsData?.count ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">Conflict Monitor</h1>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <Globe className="w-4 h-4" /> Map
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats summary */}
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-slate-400">
            {curatedData?.count ?? '—'} curated conflicts
          </p>
          {ucdpStats && (
            <>
              <span className="text-slate-600">|</span>
              <p className="text-sm text-slate-400">
                {ucdpStats.totalEvents.toLocaleString()} UCDP events
              </p>
            </>
          )}
          {ucdpConflictCount > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <p className="text-sm text-slate-400">
                {ucdpConflictCount} active UCDP conflicts
              </p>
            </>
          )}
          {ucdpEventsLoading && (
            <span className="text-xs text-slate-500">Loading events...</span>
          )}
        </div>

        {/* Map with UCDP GeoJSON */}
        <ConflictMap
          conflicts={tab === 'curated' ? curatedConflicts : []}
          onConflictClick={handleConflictClick}
          ucdpGeoJson={tab === 'ucdp' ? ucdpGeoJson ?? undefined : undefined}
        />

        {/* Tab toggle */}
        <div className="flex gap-1 rounded-xl border border-slate-700/50 bg-slate-800/60 p-1 w-fit">
          <button
            onClick={() => setTab('ucdp')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'ucdp'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            UCDP Events
          </button>
          <button
            onClick={() => setTab('curated')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'curated'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Curated Conflicts
          </button>
        </div>

        {/* Tab content */}
        {tab === 'ucdp' ? (
          <>
            <UcdpEventFilters filters={ucdpFilters} onChange={setUcdpFilters} />
            <UcdpConflictList conflicts={ucdpConflicts} isLoading={ucdpConflictsLoading} />
          </>
        ) : (
          <>
            <ConflictFilters filters={curatedFilters} onChange={setCuratedFilters} />
            <ConflictList conflicts={curatedConflicts} isLoading={curatedLoading} />
          </>
        )}
      </div>
    </div>
  );
}
