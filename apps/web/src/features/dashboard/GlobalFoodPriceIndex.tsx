import { motion } from 'framer-motion';
import { Wheat, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGlobalIndicators, type FpiEntry } from './useGlobalIndicators';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
        <Minus className="w-3 h-3" />
        —
      </span>
    );
  }
  const isUp = pct > 0;
  const color = isUp ? '#f87171' : '#34d399'; // rising prices = bad for consumers → red
  const Icon = isUp ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color }}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function IndexCell({ label, entry }: { label: string; entry: FpiEntry | null }) {
  if (!entry) return null;
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(100, 116, 139, 0.4)',
      }}
    >
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.08em]">{label}</span>
      <span className="text-lg font-bold text-white leading-tight">
        {entry.annualAverage.toFixed(1)}
      </span>
      <TrendBadge pct={entry.trendPct} />
    </div>
  );
}

export default function GlobalFoodPriceIndex() {
  const { data, isLoading, error } = useGlobalIndicators();

  if (error) return null; // fail silently, dashboard still useful without this
  if (isLoading) {
    return (
      <div className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(2, 8, 23, 0.75)', border: '1px solid rgba(148, 163, 184, 0.55)' }}>
        <div className="h-5 w-48 bg-slate-700/40 rounded mb-3" />
        <div className="h-24 bg-slate-700/30 rounded" />
      </div>
    );
  }

  const fpi = data?.foodPriceIndex;
  if (!fpi || !fpi.composite) return null;

  const composite = fpi.composite;
  const latestMonthLabel = composite.latestMonth
    ? `${MONTH_NAMES[composite.latestMonth - 1]} ${composite.year}`
    : `${composite.year}`;

  // Interpretation for the headline
  const trendPct = composite.trendPct;
  let statusText = 'Prices stable vs last year';
  let statusColor = '#94a3b8';
  if (trendPct !== null) {
    if (trendPct > 5) { statusText = 'Food prices rising — watch for food security stress'; statusColor = '#f87171'; }
    else if (trendPct > 1) { statusText = 'Mild price increase vs last year'; statusColor = '#fbbf24'; }
    else if (trendPct < -5) { statusText = 'Food prices falling significantly'; statusColor = '#34d399'; }
    else if (trendPct < -1) { statusText = 'Mild price decrease vs last year'; statusColor = '#34d399'; }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl p-5"
      style={{
        background: 'rgba(2, 8, 23, 0.75)',
        border: '1px solid rgba(148, 163, 184, 0.55)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 1px rgba(148, 163, 184, 0.2) inset',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.4)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
          >
            <Wheat className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight tracking-tight">Global Food Prices</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">FAO · Latest {latestMonthLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white leading-none">{composite.annualAverage.toFixed(1)}</div>
          <div className="mt-1"><TrendBadge pct={composite.trendPct} /></div>
        </div>
      </div>

      {/* Interpretation */}
      <p className="text-[11px] mb-3" style={{ color: statusColor }}>{statusText}</p>

      {/* Sub-indices */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <IndexCell label="Cereals" entry={fpi.cereals} />
        <IndexCell label="Dairy"   entry={fpi.dairy} />
        <IndexCell label="Meat"    entry={fpi.meat} />
        <IndexCell label="Oils"    entry={fpi.oils} />
        <IndexCell label="Sugar"   entry={fpi.sugar} />
      </div>

      <p className="text-[9px] text-slate-500 mt-4 pt-3" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.2)' }}>{fpi.baseNote}</p>
    </motion.div>
  );
}
