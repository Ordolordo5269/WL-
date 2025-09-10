import { useState } from 'react';

type EventType = 'protest' | 'riot' | 'conflict' | 'battle';

interface Props {
  days: number;
  types: EventType[];
  onChange: (state: { days: number; types: EventType[] }) => void;
  onRefresh: () => void;
}

export default function EventFilters({ days, types, onChange, onRefresh }: Props) {
  const [localDays, setLocalDays] = useState(days);
  const [localTypes, setLocalTypes] = useState<Set<EventType>>(new Set(types));

  const toggle = (t: EventType) => {
    const next = new Set(localTypes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setLocalTypes(next);
    onChange({ days: localDays, types: Array.from(next) });
  };

  const onDays = (v: number) => {
    const d = Math.max(1, Math.min(30, Math.floor(v)));
    setLocalDays(d);
    onChange({ days: d, types: Array.from(localTypes) });
  };

  const entry = (value: EventType, label: string) => (
    <label className="inline-flex items-center gap-2 text-xs text-gray-200">
      <input type="checkbox" checked={localTypes.has(value)} onChange={() => toggle(value)} />
      {label}
    </label>
  );

  return (
    <div className="absolute top-20 left-4 z-20 bg-slate-900/80 backdrop-blur rounded-md p-3 border border-slate-700 space-y-2">
      <div className="flex items-center gap-3">
        {entry('protest', 'Protest')}
        {entry('riot', 'Riot')}
        {entry('conflict', 'Conflict')}
        {entry('battle', 'Battle')}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300">Days: {localDays}</span>
        <input type="range" min={1} max={30} value={localDays} onChange={(e) => onDays(Number(e.target.value))} />
        <button className="px-2 py-1 text-xs bg-blue-600 rounded" onClick={onRefresh}>Refresh</button>
      </div>
    </div>
  );
}

