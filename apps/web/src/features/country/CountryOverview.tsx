import { motion } from 'framer-motion';
import { Users, DollarSign, Heart, Shield } from 'lucide-react';
import type { CountryOverview as CountryOverviewData } from './useCountryOverview';

const riskColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  data: CountryOverviewData;
}

export default function CountryOverview({ data }: Props) {
  const kpis = [
    { label: 'Population', value: formatNumber(data.population), icon: Users, color: '#3b82f6' },
    { label: 'GDP', value: data.gdp !== null ? `$${formatNumber(data.gdp)}` : '—', icon: DollarSign, color: '#22c55e' },
    { label: 'HDI', value: data.hdi?.toFixed(3) ?? '—', icon: Heart, color: '#f59e0b' },
    {
      label: 'Risk Level',
      value: data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1),
      icon: Shield,
      color: riskColors[data.riskLevel] ?? '#6b7280',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{data.name}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {data.iso3} &middot; {data.region} &middot; {data.conflictCount} active conflict{data.conflictCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
