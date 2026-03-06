import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConflictMap from '../features/map/ConflictMap';
import ConflictFilters from '../features/conflicts/ConflictFilters';
import ConflictList from '../features/conflicts/ConflictList';
import { useConflicts } from '../features/conflicts/useConflicts';
import type { ConflictFiltersParams } from '../features/conflicts/types';

export default function Conflicts() {
  const [filters, setFilters] = useState<ConflictFiltersParams>({});
  const { data, isLoading } = useConflicts(filters);
  const navigate = useNavigate();

  const conflicts = data?.data ?? [];

  const handleConflictClick = useCallback(
    (slug: string) => navigate(`/conflicts/${slug}`),
    [navigate]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Conflict Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">
            {data?.count ?? '—'} conflicts tracked worldwide
          </p>
        </div>

        <ConflictMap conflicts={conflicts} onConflictClick={handleConflictClick} />
        <ConflictFilters filters={filters} onChange={setFilters} />
        <ConflictList conflicts={conflicts} isLoading={isLoading} />
      </div>
    </div>
  );
}
