import { motion } from 'framer-motion';
import { Swords, Flame, Globe, Activity } from 'lucide-react';
import { useDashboardSummary } from './useDashboardSummary';

const statCards = [
  { key: 'totalConflicts', label: 'Total Conflicts', icon: Swords, color: '#3b82f6', context: 'Across all regions' },
  { key: 'activeConflicts', label: 'Active Conflicts', icon: Flame, color: '#ef4444', context: 'Ongoing hostilities' },
  { key: 'countriesAffected', label: 'Countries Affected', icon: Globe, color: '#f59e0b', context: 'Directly involved' },
  { key: 'avgSeverity', label: 'Avg Severity', icon: Activity, color: '#8b5cf6', context: 'Scale 1-5' },
] as const;

function SeverityBar({ total, active }: { total: number; active: number }) {
  if (total === 0) return null;
  const activePercent = Math.round((active / total) * 100);
  const frozenPercent = 100 - activePercent;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>Active {activePercent}%</span>
        <span>Other {frozenPercent}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden flex">
        <div
          className="h-full rounded-l-full transition-all duration-500"
          style={{ width: `${activePercent}%`, backgroundColor: '#ef4444' }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{ width: `${frozenPercent}%`, backgroundColor: '#64748b' }}
        />
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const { data, isLoading, error } = useDashboardSummary();

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
        Failed to load dashboard stats
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map(({ key, label, icon: Icon, color, context }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-lg p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(71, 85, 105, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="text-xl font-bold text-white mb-0.5">
            {isLoading ? (
              <div className="h-6 w-14 rounded bg-slate-700/50 animate-pulse" />
            ) : (
              key === 'avgSeverity'
                ? data?.[key]?.toFixed(2) ?? '—'
                : data?.[key]?.toLocaleString() ?? '—'
            )}
          </div>
          <div className="text-[10px] text-slate-500">{context}</div>

          {/* Severity distribution bar on first card */}
          {key === 'totalConflicts' && !isLoading && data && (
            <SeverityBar total={data.totalConflicts} active={data.activeConflicts} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
