import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecentConflicts } from './useRecentConflicts';

const statusColors: Record<string, string> = {
  WAR: '#ef4444',
  WARM: '#f59e0b',
  FROZEN: '#06b6d4',
  IMPROVING: '#22c55e',
  RESOLVED: '#6b7280',
};

const statusLabels: Record<string, string> = {
  WAR: 'War',
  WARM: 'Warm',
  FROZEN: 'Frozen',
  IMPROVING: 'Improving',
  RESOLVED: 'Resolved',
};

export default function RecentConflicts() {
  const { data: conflicts, isLoading, error } = useRecentConflicts();
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
        Failed to load conflicts
      </div>
    );
  }

  const recent = conflicts?.slice(0, 5) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl"
      style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(71, 85, 105, 0.3)',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Recent Conflicts
        </h3>
        <span className="text-xs text-slate-400">
          {conflicts?.length ?? 0} total
        </span>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No conflicts found</div>
      ) : (
        <ul className="divide-y divide-slate-700/30">
          {recent.map((conflict) => {
            const totalCasualties = conflict.casualties?.reduce((s, c) => s + c.total, 0) ?? 0;
            return (
              <li
                key={conflict.id}
                onClick={() => navigate(`/`)}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-700/20 transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusColors[conflict.status] ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{conflict.name}</p>
                  <p className="text-xs text-slate-400">
                    {conflict.region} &middot; {conflict.factions?.length ?? 0} factions
                    {totalCasualties > 0 && ` \u00B7 ${totalCasualties.toLocaleString()} casualties`}
                  </p>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{
                    color: statusColors[conflict.status] ?? '#6b7280',
                    backgroundColor: `${statusColors[conflict.status] ?? '#6b7280'}20`,
                  }}
                >
                  {statusLabels[conflict.status] ?? conflict.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
