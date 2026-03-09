import { RotateCcw } from 'lucide-react';
import type { UcdpEventFilters as UcdpEventFiltersType } from './types';
import { VIOLENCE_TYPES, REGION_LABELS } from './types';

interface Props {
  filters: UcdpEventFiltersType;
  onChange: (filters: UcdpEventFiltersType) => void;
}

const YEARS = Array.from({ length: 2025 - 1989 + 1 }, (_, i) => 2025 - i);

export default function UcdpEventFilters({ filters, onChange }: Props) {
  const update = (patch: Partial<UcdpEventFiltersType>) =>
    onChange({ ...filters, ...patch });

  const reset = () => onChange({});

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Year</label>
        <select
          value={filters.year ?? ''}
          onChange={e => update({ year: e.target.value ? Number(e.target.value) : undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        >
          <option value="">All years</option>
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Violence Type</label>
        <select
          value={filters.typeOfViolence ?? ''}
          onChange={e => update({ typeOfViolence: e.target.value ? Number(e.target.value) : undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        >
          <option value="">All types</option>
          {Object.entries(VIOLENCE_TYPES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Region</label>
        <select
          value={filters.region ?? ''}
          onChange={e => update({ region: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        >
          <option value="">All regions</option>
          {Object.entries(REGION_LABELS).map(([key, label]) => (
            <option key={key} value={label}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Country</label>
        <input
          type="text"
          placeholder="e.g. Syria"
          value={filters.country ?? ''}
          onChange={e => update({ country: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2 placeholder-slate-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">From</label>
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={e => update({ dateFrom: e.target.value || undefined })}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">To</label>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={e => update({ dateTo: e.target.value || undefined })}
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
