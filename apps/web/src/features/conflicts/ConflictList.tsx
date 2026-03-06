import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { ConflictV2 } from './types';
import { statusToSeverity, severityColor, statusLabel } from './types';

interface Props {
  conflicts: ConflictV2[];
  isLoading: boolean;
}

export default function ConflictList({ conflicts, isLoading }: Props) {
  const navigate = useNavigate();

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
        No conflicts found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conflicts.map((c, i) => {
        const severity = statusToSeverity(c.status);
        const color = severityColor(severity);
        const totalCasualties = c.casualties.reduce((sum, cas) => sum + cas.total, 0);

        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/conflicts/${c.slug}`)}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/60 p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs text-slate-400">
                  {c.region} &middot; {new Date(c.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {statusLabel(c.status)}
              </span>
              {totalCasualties > 0 && (
                <span className="text-xs text-slate-400">
                  {totalCasualties.toLocaleString()} casualties
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
