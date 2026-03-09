import { motion } from 'framer-motion';
import type { UcdpConflict } from './types';
import {
  INTENSITY_LABELS,
  CONFLICT_TYPE_LABELS,
  REGION_LABELS,
} from './types';

interface Props {
  conflicts: UcdpConflict[];
  isLoading: boolean;
}

export default function UcdpConflictList({ conflicts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-8 text-center text-slate-400">
        No UCDP conflicts found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conflicts.map((c, i) => {
        const intensityColor = c.intensityLevel === 2 ? '#ef4444' : '#f97316';
        const intensityLabel = c.intensityLevel === 2 ? 'War' : 'Minor';
        const regionName = REGION_LABELS[c.region] ?? `Region ${c.region}`;
        const conflictType = CONFLICT_TYPE_LABELS[c.typeOfConflict] ?? `Type ${c.typeOfConflict}`;

        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/60 p-4 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: intensityColor, boxShadow: `0 0 6px ${intensityColor}60` }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {c.location}
                </p>
                <p className="text-xs text-slate-400">
                  {c.sideA} vs {c.sideB}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${intensityColor}20`, color: intensityColor }}
              >
                {intensityLabel}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {conflictType}
              </span>
              <span className="text-xs text-slate-500 hidden md:inline">
                {regionName}
              </span>
              <span className="text-xs text-slate-500 hidden md:inline">
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
              </span>
              {!c.epEnd && (
                <span className="text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/10">
                  Ongoing
                </span>
              )}
              {c.epEnd && (
                <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full bg-slate-500/10">
                  Ended
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
