import { RotateCcw } from 'lucide-react';
import type { ConflictFiltersParams, ConflictStatus } from './types';

const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Middle East'];
const STATUSES: ConflictStatus[] = ['WAR', 'WARM', 'FROZEN', 'IMPROVING', 'RESOLVED'];

interface Props {
  filters: ConflictFiltersParams;
  onChange: (filters: ConflictFiltersParams) => void;
}

export default function ConflictFilters({ filters, onChange }: Props) {
  const update = (patch: Partial<ConflictFiltersParams>) =>
    onChange({ ...filters, ...patch });

  const reset = () => onChange({});

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Region</label>
        <select
          value={filters.region ?? ''}
          onChange={e => update({ region: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        >
          <option value="">All regions</option>
          {REGIONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={e => update({ status: (e.target.value || undefined) as ConflictStatus | undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">From</label>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={e => update({ from: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">To</label>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={e => update({ to: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        />
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 px-3 py-2 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </button>
    </div>
  );
}
