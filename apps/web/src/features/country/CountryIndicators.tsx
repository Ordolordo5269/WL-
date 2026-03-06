import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import type { CountryOverview } from './useCountryOverview';

interface Props {
  data: CountryOverview;
}

interface Indicator {
  label: string;
  value: string;
  bar: number; // 0-100
  color: string;
}

function buildIndicators(data: CountryOverview): Indicator[] {
  const items: Indicator[] = [];

  if (data.hdi !== null && data.hdi !== undefined) {
    items.push({
      label: 'Human Development Index',
      value: data.hdi.toFixed(3),
      bar: data.hdi * 100,
      color: data.hdi >= 0.8 ? '#22c55e' : data.hdi >= 0.55 ? '#f59e0b' : '#ef4444',
    });
  }

  const riskMap: Record<string, number> = { low: 20, medium: 50, high: 75, critical: 95 };
  const riskColors: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };
  items.push({
    label: 'Geopolitical Risk',
    value: data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1),
    bar: riskMap[data.riskLevel] ?? 50,
    color: riskColors[data.riskLevel] ?? '#6b7280',
  });

  items.push({
    label: 'Active Conflicts',
    value: String(data.conflictCount),
    bar: Math.min(data.conflictCount * 20, 100),
    color: data.conflictCount === 0 ? '#22c55e' : data.conflictCount <= 2 ? '#f59e0b' : '#ef4444',
  });

  return items;
}

export default function CountryIndicators({ data }: Props) {
  const indicators = buildIndicators(data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/50">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <h3 className="text-base font-semibold text-white">Indicators</h3>
      </div>

      <div className="p-5 space-y-5">
        {indicators.map((ind) => (
          <div key={ind.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-slate-300">{ind.label}</span>
              <span className="text-sm font-semibold text-white">{ind.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: ind.color }}
                initial={{ width: 0 }}
                animate={{ width: `${ind.bar}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
