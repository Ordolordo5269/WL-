import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, LayoutDashboard } from 'lucide-react';
import ConflictMap from '../features/map/ConflictMap';
import ConflictFilters from '../features/conflicts/ConflictFilters';
import ConflictList from '../features/conflicts/ConflictList';
import { useConflicts } from '../features/conflicts/useConflicts';
import type { ConflictFiltersParams } from '../features/conflicts/types';

export default function Conflicts() {
  const [filters, setFilters] = useState<ConflictFiltersParams>({});
  const { data, isLoading } = useConflicts(filters);
  const navigate = useNavigate();

  const conflicts = data?.conflicts ?? [];

  const handleConflictClick = useCallback(
    (slug: string) => navigate(`/conflicts/${slug}`),
    [navigate]
  );

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
        <p className="text-sm text-slate-400">
          {data?.count ?? '—'} conflicts tracked worldwide
        </p>

        <ConflictMap conflicts={conflicts} onConflictClick={handleConflictClick} />
        <ConflictFilters filters={filters} onChange={setFilters} />
        <ConflictList conflicts={conflicts} isLoading={isLoading} />
      </div>
    </div>
  );
}
