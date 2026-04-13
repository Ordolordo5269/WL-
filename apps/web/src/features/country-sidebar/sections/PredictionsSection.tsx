import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2,
  ChevronRight, BarChart3, DollarSign, Heart, Shield, Activity,
  Users, Briefcase, Scale
} from 'lucide-react';
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { usePredictionData, SIDEBAR_INDICATORS } from '../hooks/usePredictionData';
import type { PredictionSummary } from '../hooks/usePredictionData';
import type { PredictionResult } from '../../dashboard/prediction.service';

interface PredictionsSectionProps {
  iso3: string | null;
  isLoading: boolean;
  error: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'gdp': DollarSign,
  'gdp-per-capita': Users,
  'inflation': TrendingUp,
  'unemployment': Briefcase,
  'life-expectancy': Heart,
  'population-growth': Activity,
  'political-stability': Shield,
  'control-corruption': Scale,
};

function formatValue(value: number, slug: string): string {
  if (slug === 'gdp') {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    return `$${value.toLocaleString()}`;
  }
  if (slug === 'gdp-per-capita') {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (slug === 'inflation' || slug === 'unemployment' || slug === 'population-growth') {
    return `${value.toFixed(1)}%`;
  }
  if (slug === 'life-expectancy') {
    return `${value.toFixed(1)} yrs`;
  }
  if (slug === 'political-stability' || slug === 'control-corruption') {
    return value.toFixed(2);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function TrendBadge({ direction, rate }: { direction: string; rate: number }) {
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-400';
  const bg = isUp ? 'bg-emerald-400/10' : isDown ? 'bg-red-400/10' : 'bg-slate-400/10';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(rate).toFixed(1)}%/yr
    </span>
  );
}

function SummaryCard({ summary, isSelected, onClick }: { summary: PredictionSummary; isSelected: boolean; onClick: () => void }) {
  const IconComp = ICON_MAP[summary.slug] || BarChart3;
  const { trend, statistics } = summary.result;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 transition-all duration-200 ${
        isSelected
          ? 'bg-slate-800/60'
          : 'bg-slate-800/20 hover:bg-slate-800/40'
      }`}
      style={isSelected ? { borderLeft: `2px solid ${summary.color}` } : { borderLeft: '2px solid transparent' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <IconComp className="w-3.5 h-3.5" style={{ color: summary.color }} />
          <span className="text-xs font-medium text-slate-300">{summary.name}</span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>

      <div className="flex items-end justify-between">
        <span className="text-sm font-semibold text-white">
          {formatValue(statistics.lastValue, summary.slug)}
        </span>
        <TrendBadge direction={trend.direction} rate={trend.rate} />
      </div>

      {/* Projected value */}
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span>5yr</span>
        <span className="text-slate-600">→</span>
        <span className="text-slate-400">{formatValue(statistics.projectedValue, summary.slug)}</span>
      </div>
    </button>
  );
}

function MiniChart({ prediction, slug, color }: { prediction: PredictionResult; slug: string; color: string }) {
  // Combine historical + projection into a single chart dataset
  const historical = prediction.historical.filter(d => d.value !== null) as Array<{ year: number; value: number }>;
  const lastHistYear = historical.length > 0 ? historical[historical.length - 1].year : 0;

  const scenarios = prediction.scenarios;
  const baseProjection = scenarios?.base || prediction.projection;

  const chartData = [
    ...historical.map(d => ({
      year: d.year,
      historical: d.value,
    })),
    // Bridge point: last historical point also starts projection
    ...(historical.length > 0 ? [{
      year: lastHistYear,
      historical: historical[historical.length - 1].value,
      base: historical[historical.length - 1].value,
      optimistic: historical[historical.length - 1].value,
      pessimistic: historical[historical.length - 1].value,
    }] : []),
    ...baseProjection.map((d, i) => ({
      year: d.year,
      base: d.value,
      optimistic: scenarios?.optimistic[i]?.value,
      pessimistic: scenarios?.pessimistic[i]?.value,
    })),
  ];

  const allValues = chartData.flatMap(d => [d.historical, d.base, d.optimistic, d.pessimistic].filter((v): v is number => v != null));
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.1 || 1;

  return (
    <div className="mt-3 rounded-lg bg-slate-900/30 p-3">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 px-0.5">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-5 h-[2px] rounded-full" style={{ backgroundColor: color, display: 'inline-block' }} />
          Historical
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-5 h-0" style={{ borderBottom: `2px dashed ${color}`, display: 'inline-block', opacity: 0.5 }} />
          Projected
        </span>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-hist-${slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`grad-range-${slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="year"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tick={{ fill: '#475569', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={45}
            tickFormatter={(v: number) => formatValue(v, slug)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [formatValue(value, slug), name === 'historical' ? 'Historical' : name === 'base' ? 'Projected' : name === 'optimistic' ? 'Best case' : 'Worst case']}
            labelFormatter={(label: number) => `${label}`}
          />

          {/* Uncertainty range */}
          {scenarios && (
            <Area
              type="monotone"
              dataKey="optimistic"
              stroke="none"
              fill={`url(#grad-range-${slug})`}
              fillOpacity={1}
              isAnimationActive={false}
            />
          )}
          {scenarios && (
            <Area
              type="monotone"
              dataKey="pessimistic"
              stroke="none"
              fill="#0f172a"
              fillOpacity={0.6}
              isAnimationActive={false}
            />
          )}

          {/* Historical area */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-hist-${slug})`}
            fillOpacity={1}
            connectNulls
            dot={false}
          />

          {/* Base projection line */}
          <Line
            type="monotone"
            dataKey="base"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
            opacity={0.7}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Footer — range + confidence in one clean line */}
      <div className="flex items-center justify-between mt-2 px-0.5">
        {prediction.statistics.optimisticValue != null && prediction.statistics.pessimisticValue != null ? (
          <span className="text-[10px] text-slate-600">
            Range: {formatValue(prediction.statistics.pessimisticValue, slug)} – {formatValue(prediction.statistics.optimisticValue, slug)}
          </span>
        ) : <span />}
        <span className="text-[10px] text-slate-600">
          Confidence: {(prediction.trend.rSquared * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function IndicatorSelector({ iso3, loadIndicator, selectedSlug }: { iso3: string; loadIndicator: (slug: string) => void; selectedSlug: string | null }) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = ['Economy', 'Society', 'Politics'] as const;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors text-xs text-slate-400"
      >
        <span>Explore more indicators</span>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {categories.map(cat => {
                const indicators = SIDEBAR_INDICATORS.filter(i => i.category === cat);
                return (
                  <div key={cat}>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{cat}</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {indicators.map(ind => {
                        const IconComp = ICON_MAP[ind.slug] || BarChart3;
                        const isActive = selectedSlug === ind.slug;
                        return (
                          <button
                            key={ind.slug}
                            onClick={() => loadIndicator(ind.slug)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all ${
                              isActive
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-800/20 text-slate-400 border border-transparent hover:bg-slate-800/40 hover:text-slate-300'
                            }`}
                          >
                            <IconComp className="w-3 h-3" style={{ color: ind.color }} />
                            {ind.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PredictionsSection({ iso3, isLoading: _externalLoading, error: _externalError }: PredictionsSectionProps) {
  const {
    summaries,
    isLoading,
    selectedSlug,
    selectedPrediction,
    isLoadingSelected,
    loadIndicator,
  } = usePredictionData(iso3, !!iso3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-slate-800/40 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (summaries.length === 0 && !isLoading) {
    return (
      <div className="p-4 bg-slate-800/20 border border-slate-600/30 rounded-lg text-center">
        <BarChart3 className="w-5 h-5 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No prediction data available</p>
        <p className="text-slate-500 text-xs mt-1">Insufficient historical data for this country</p>
      </div>
    );
  }

  // Determine which prediction to show in the chart
  const chartSlug = selectedSlug || (summaries.length > 0 ? summaries[0].slug : null);
  const chartPrediction = selectedSlug ? selectedPrediction : (summaries.length > 0 ? summaries[0].result : null);
  const chartIndicator = SIDEBAR_INDICATORS.find(i => i.slug === chartSlug);

  return (
    <div className="predictions-section space-y-2">
      {/* Summary cards */}
      {summaries.map(summary => (
        <SummaryCard
          key={summary.slug}
          summary={summary}
          isSelected={chartSlug === summary.slug}
          onClick={() => loadIndicator(summary.slug)}
        />
      ))}

      {/* Chart for selected indicator */}
      {isLoadingSelected ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        </div>
      ) : chartPrediction && chartIndicator ? (
        <MiniChart
          prediction={chartPrediction}
          slug={chartIndicator.slug}
          color={chartIndicator.color}
        />
      ) : null}

      {/* Explore more indicators */}
      {iso3 && (
        <IndicatorSelector
          iso3={iso3}
          loadIndicator={loadIndicator}
          selectedSlug={selectedSlug}
        />
      )}
    </div>
  );
}
