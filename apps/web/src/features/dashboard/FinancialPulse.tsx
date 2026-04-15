import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, DollarSign, Percent, LineChart, Bitcoin, Dice5 } from 'lucide-react';
import { useFinancialPulse, type FinEntry, type FinCategory, type PredictionMarket } from './useFinancialPulse';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORY_META: Record<FinCategory, { label: string; color: string; Icon: typeof DollarSign }> = {
  FX:     { label: 'FX & Currencies',   color: '#60a5fa', Icon: DollarSign },
  Rates:  { label: 'Rates & Yields',    color: '#a78bfa', Icon: Percent },
  Vol:    { label: 'Vol / Stress',      color: '#f87171', Icon: Activity },
  Equity: { label: 'Equity Indices',    color: '#34d399', Icon: LineChart },
  Crypto: { label: 'Crypto',            color: '#fbbf24', Icon: Bitcoin },
};

function formatPrice(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (Math.abs(value) >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 100)   return value.toFixed(1);
  if (Math.abs(value) >= 10)    return value.toFixed(2);
  if (Math.abs(value) >= 1)     return value.toFixed(3);
  return value.toFixed(4);
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
  const color = isUp ? '#f87171' : pct < 0 ? '#34d399' : '#94a3b8';
  const Icon = isUp ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function PriceChip({ e }: { e: FinEntry }) {
  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-0.5"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(100, 116, 139, 0.4)',
      }}
    >
      <span className="text-[10px] text-slate-400 leading-tight truncate">{e.name}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold text-white leading-tight">{formatPrice(e.latestValue, e.unit)}</span>
        {e.unit !== '%' && <span className="text-[9px] text-slate-500">{e.unit}</span>}
      </div>
      <TrendBadge pct={e.trendPctYoY} />
    </div>
  );
}

function VolHighlight({ vol }: { vol: FinEntry[] }) {
  const vix = vol.find((v) => v.code === 'VIX');
  const hy = vol.find((v) => v.code === 'HY_OAS_SPREAD');
  if (!vix && !hy) return null;

  function vixLabel(v: number): { text: string; color: string } {
    if (v < 15) return { text: 'Calm', color: '#34d399' };
    if (v < 25) return { text: 'Elevated', color: '#fbbf24' };
    if (v < 35) return { text: 'Stressed', color: '#fb923c' };
    return { text: 'Crisis', color: '#f87171' };
  }

  const vixStatus = vix ? vixLabel(vix.latestValue) : null;

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {vix && (
        <div
          className="rounded-lg p-3.5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${vixStatus?.color}10 0%, rgba(2, 8, 23, 0.75) 60%)`,
            border: `1px solid ${vixStatus?.color}50`,
            boxShadow: `0 0 24px ${vixStatus?.color}10 inset`,
          }}
        >
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: vixStatus?.color }} />
          <div className="flex items-center justify-between pl-1">
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.1em]">VIX · Fear Index</span>
            {vixStatus && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: vixStatus.color, background: `${vixStatus.color}20`, border: `1px solid ${vixStatus.color}40` }}>
                {vixStatus.text}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 pl-1">
            <span className="text-3xl font-bold text-white leading-none">{vix.latestValue.toFixed(1)}</span>
            <TrendBadge pct={vix.trendPctYoY} />
          </div>
        </div>
      )}
      {hy && (
        <div
          className="rounded-lg p-3.5 relative overflow-hidden"
          style={{
            background: 'rgba(2, 8, 23, 0.75)',
            border: '1px solid rgba(100, 116, 139, 0.4)',
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: '#94a3b8' }} />
          <div className="flex items-center justify-between pl-1">
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.1em]">HY Credit Spread</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 pl-1">
            <span className="text-3xl font-bold text-white leading-none">{hy.latestValue.toFixed(2)}%</span>
            <TrendBadge pct={hy.trendPctYoY} />
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionRow({ p }: { p: PredictionMarket }) {
  const prob = (p.probabilityYes ?? 0) * 100;
  const close = p.closeDate ? new Date(p.closeDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  const url = p.sourceUrl ?? (p.slug ? `https://polymarket.com/event/${p.slug}` : null);

  // Global CSS styles `a` with underline + link color (purple/blue) which
  // would bleed into every text node below. We neutralize it at the anchor
  // level and set an explicit color on every child span so sidebar.css
  // rules (or other global `a` rules) cannot override.
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg p-3 transition-all hover:border-slate-500/50 no-underline"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(100, 116, 139, 0.4)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span
          className="text-[12px] leading-tight flex-1 line-clamp-2"
          style={{ color: '#e2e8f0' }}
        >
          {p.question}
        </span>
        <span
          className="text-lg font-bold flex-shrink-0"
          style={{ color: prob >= 50 ? '#34d399' : prob >= 20 ? '#fbbf24' : '#94a3b8' }}
        >
          {prob.toFixed(0)}%
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(51, 65, 85, 0.4)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${prob}%`,
            background: prob >= 50 ? '#34d399' : prob >= 20 ? '#fbbf24' : '#64748b',
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[9px]" style={{ color: '#64748b' }}>
        <span>Vol ${((p.volume ?? 0) / 1000).toFixed(0)}K</span>
        {close && <span>Closes {close}</span>}
      </div>
    </a>
  );
}

export default function FinancialPulse() {
  const { data, isLoading, error } = useFinancialPulse();

  if (error) return null;
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse"
        style={{ background: 'rgba(2, 8, 23, 0.75)', border: '1px solid rgba(148, 163, 184, 0.55)' }}
      >
        <div className="h-5 w-56 bg-slate-700/40 rounded mb-3" />
        <div className="h-48 bg-slate-700/30 rounded" />
      </div>
    );
  }

  const d = data;
  if (!d || (d.fx.length === 0 && d.rates.length === 0 && d.equities.length === 0)) return null;

  const [y, m] = d.lastUpdated ? d.lastUpdated.split('-').map((x) => parseInt(x, 10)) : [null, null];
  const latestLabel = y && m ? `${MONTH_NAMES[m - 1]} ${y}` : '—';

  const categoryGroups: Array<[FinCategory, FinEntry[]]> = [
    ['FX', d.fx],
    ['Rates', d.rates],
    ['Equity', d.equities],
    ['Crypto', d.crypto],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
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
            style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)' }}
          >
            <Activity className="w-4 h-4" style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight tracking-tight">Financial Pulse</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">FRED · CoinGecko · Polymarket · Latest {latestLabel}</p>
          </div>
        </div>
      </div>

      {/* VIX + HY highlight row */}
      <VolHighlight vol={d.vol} />

      {/* Categories */}
      <div className="space-y-4">
        {categoryGroups.map(([cat, list]) => {
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {list.map((e) => <PriceChip key={e.code} e={e} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prediction markets */}
      {d.prediction.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Dice5 className="w-3.5 h-3.5" style={{ color: '#f472b6' }} />
            <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#f472b6' }}>
              Prediction Markets · Polymarket
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(244, 114, 182, 0.4), transparent)' }} />
          </div>
          <div className="space-y-2">
            {d.prediction.slice(0, 5).map((p) => <PredictionRow key={p.code} p={p} />)}
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-500 mt-4 pt-3" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.2)' }}>
        FX, rates and equities are monthly averages (latest tick shown). YoY trend vs prior calendar year.
        Prediction markets are live probability snapshots — click to view full market on Polymarket.
      </p>
    </motion.div>
  );
}
