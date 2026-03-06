import { motion } from 'framer-motion';
import { Swords, Flame, Globe, Activity } from 'lucide-react';
import { useDashboardSummary } from './useDashboardSummary';

const statCards = [
  { key: 'totalConflicts', label: 'Total Conflicts', icon: Swords, color: '#3b82f6' },
  { key: 'activeConflicts', label: 'Active Conflicts', icon: Flame, color: '#ef4444' },
  { key: 'countriesAffected', label: 'Countries Affected', icon: Globe, color: '#f59e0b' },
  { key: 'avgSeverity', label: 'Avg Severity', icon: Activity, color: '#8b5cf6' },
] as const;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(({ key, label, icon: Icon, color }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {label}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? (
              <div className="h-8 w-20 rounded bg-slate-700 animate-pulse" />
            ) : (
              key === 'avgSeverity'
                ? data?.[key]?.toFixed(2) ?? '—'
                : data?.[key]?.toLocaleString() ?? '—'
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
