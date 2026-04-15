import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Minus, Flame, Gem, Wheat, Sparkles } from 'lucide-react';
import {
  useGlobalCommodityPrices,
  type CommodityPrice,
  type CommodityCategory,
} from './useGlobalCommodityPrices';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_META: Record<CommodityCategory, { label: string; color: string; Icon: typeof Flame }> = {
  Energy:      { label: 'Energy',      color: '#f59e0b', Icon: Flame },
  Metals:      { label: 'Industrial Metals', color: '#60a5fa', Icon: Gem },
  Precious:    { label: 'Precious Metals',   color: '#fbbf24', Icon: Sparkles },
  Agriculture: { label: 'Agriculture',       color: '#84cc16', Icon: Wheat },
};

const CATEGORY_ORDER: CommodityCategory[] = ['Energy', 'Metals', 'Precious', 'Agriculture'];

function formatPrice(value: number, unit: string): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100)  return value.toFixed(0);
  if (value >= 10)   return value.toFixed(1);
  return value.toFixed(2);
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
        <Minus className="w-3 h-3" />—
      </span>
    );
  }
  const isUp = pct > 0;
  // For commodities, rising prices are neutral informationally — color by direction, not value judgment
  const color = isUp ? '#f87171' : pct < 0 ? '#34d399' : '#94a3b8';
  const Icon = isUp ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function PriceChip({ c }: { c: CommodityPrice }) {
  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-0.5"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(100, 116, 139, 0.4)',
      }}
    >
      <span className="text-[10px] text-slate-400 leading-tight truncate">{c.name}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold text-white leading-tight">{formatPrice(c.latestValue, c.unit)}</span>
        <span className="text-[9px] text-slate-500">{c.unit}</span>
      </div>
      <TrendBadge pct={c.trendPctYoY} />
    </div>
  );
}

export default function GlobalCommodityPrices() {
  const { data, isLoading, error } = useGlobalCommodityPrices();

  if (error) return null;
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse"
        style={{ background: 'rgba(2, 8, 23, 0.75)', border: '1px solid rgba(148, 163, 184, 0.55)' }}
      >
        <div className="h-5 w-56 bg-slate-700/40 rounded mb-3" />
        <div className="h-32 bg-slate-700/30 rounded" />
      </div>
    );
  }

  const res = data;
  if (!res || res.commodities.length === 0) return null;

  const grouped: Record<CommodityCategory, CommodityPrice[]> = {
    Energy: [], Metals: [], Precious: [], Agriculture: [],
  };
  for (const c of res.commodities) grouped[c.category].push(c);

  const [y, m] = res.lastUpdated ? res.lastUpdated.split('-').map((x) => parseInt(x, 10)) : [null, null];
  const latestLabel = y && m ? `${MONTH_NAMES[m - 1]} ${y}` : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
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
            style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}
          >
            <Coins className="w-4 h-4" style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight tracking-tight">Global Commodity Prices</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">World Bank Pink Sheet · Latest {latestLabel}</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped[cat];
          if (list.length === 0) return null;
          const { label, color, Icon } = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2.5">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color }}>
                  {label}
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {list.map((c) => <PriceChip key={c.code} c={c} />)}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-slate-500 mt-4 pt-3" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.2)' }}>
        Monthly spot prices, nominal USD. Trend shown is year-on-year change in annual average.
      </p>
    </motion.div>
  );
}
