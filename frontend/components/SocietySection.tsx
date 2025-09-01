import React, { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HeartPulse, GraduationCap, Activity, Users, UserPlus, Baby, Cross, Building2, Trees, MapPin } from 'lucide-react';
import { societyService, TSocietyIndicators } from '../services/society-service';
import type { SocietySeriesData } from '../hooks/useSocietyData';

interface SocietySectionProps {
  data: TSocietyIndicators | null;
  isLoading: boolean;
  error: string | null;
  series?: SocietySeriesData | null;
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="metric-item">
      <div className="metric-icon small">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

/* Reusable, accessible sparkline with gradient fill and focus ring */
function Sparkline({ series, color = '#60a5fa', height = 72, strokeWidth = 2 }: { series: Array<{ year: number; value: number | null }>; color?: string; height?: number; strokeWidth?: number }) {
  const gradId = useId();
  const points = useMemo(() => series.filter(p => p.value !== null) as Array<{ year: number; value: number }>, [series]);
  if (points.length === 0) return null;
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100; // normalized width for viewBox
  const step = width / (series.length - 1 || 1);
  const d = series.map((p, i) => {
    const v = p.value === null ? null : (1 - (p.value - min) / range) * (height - 6) + 3;
    const x = i * step;
    return v === null ? null : `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${v.toFixed(2)}`;
  }).filter(Boolean).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="sparkline" role="img" aria-label="historical trend">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`${d} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradId})`} opacity="0.35" />
    </svg>
  );
}

function Donut({ parts, size = 112, stroke = 10 }: { parts: Array<{ value: number; color: string }>; size?: number; stroke?: number }) {
  const total = parts.reduce((acc, p) => acc + Math.max(0, p.value || 0), 0) || 1;
  const radius = (size / 2) - stroke;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart" role="img" aria-label="composition">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
      {parts.map((p, i) => {
        const length = (Math.max(0, p.value) / total) * circumference;
        const dasharray = `${length} ${circumference - length}`;
        const circle = (
          <circle key={i}
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={p.color}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
        offset += length;
        return circle;
      })}
      <circle cx={size/2} cy={size/2} r={radius - (stroke * 0.9)} fill="rgba(15,23,42,0.92)" />
    </svg>
  );
}

function DivergentBar({ left, right, leftColor = '#f87171', rightColor = '#22d3ee' }: { left: number; right: number; leftColor?: string; rightColor?: string }) {
  const max = Math.max(left, right, 1);
  const width = 100; // normalized viewBox width
  const height = 14;
  const center = width / 2;
  const leftW = (left / max) * (width / 2);
  const rightW = (right / max) * (width / 2);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="divergent-bar" role="img" aria-label="birth minus death">
      <rect x={0} y={0} width={width} height={height} fill="rgba(148,163,184,0.22)" rx="5" />
      <rect x={center - leftW} y={0} width={leftW} height={height} fill={leftColor} rx="5" />
      <rect x={center} y={0} width={rightW} height={height} fill={rightColor} rx="5" />
    </svg>
  );
}

// Professional dual-line chart for Birth vs Death across time
function DualLine({
  leftSeries,
  rightSeries,
  leftColor = '#f87171',
  rightColor = '#22d3ee',
  height = 112,
}: {
  leftSeries: Array<{ year: number; value: number | null }>;
  rightSeries: Array<{ year: number; value: number | null }>;
  leftColor?: string;
  rightColor?: string;
  height?: number;
}) {
  const gradLeft = useId();
  const gradRight = useId();
  const width = 100;
  const len = Math.max(leftSeries.length, rightSeries.length);
  const ls = Array.from({ length: len }, (_, i) => leftSeries[leftSeries.length - len + i] || { year: 0, value: null });
  const rs = Array.from({ length: len }, (_, i) => rightSeries[rightSeries.length - len + i] || { year: 0, value: null });
  const allValues = [...ls, ...rs].map(p => p.value).filter(v => v !== null) as number[];
  if (allValues.length === 0) return null;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const step = width / ((ls.length - 1) || 1);
  const toPath = (arr: Array<{ year: number; value: number | null }>) => arr.map((p, i) => {
    const v = p.value === null ? null : (1 - (p.value - min) / range) * (height - 6) + 3;
    const x = i * step;
    return v === null ? null : `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${v.toFixed(2)}`;
  }).filter(Boolean).join(' ');
  const dLeft = toPath(ls);
  const dRight = toPath(rs);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="sparkline" role="img" aria-label="birth vs death rates">
      <defs>
        <linearGradient id={gradLeft} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={leftColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={leftColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gradRight} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rightColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={rightColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dLeft} fill="none" stroke={leftColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`${dLeft} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradLeft})`} opacity="0.35" />
      <path d={dRight} fill="none" stroke={rightColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`${dRight} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradRight})`} opacity="0.35" />
    </svg>
  );
}

export default function SocietySection({ data, isLoading, error, series }: SocietySectionProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-slate-400">Loading society indicators...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-slate-400">No society data available</div>
    );
  }

  const s = societyService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="secondary-metrics society-grid">
        <Metric icon={<HeartPulse className="w-4 h-4" />} label="Life expectancy" value={s.formatYears(data.lifeExpectancy.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Adult literacy" value={s.formatPercent(data.literacyRateAdult.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="UHC coverage" value={s.formatPercent(data.uhcServiceCoverageIndex.value)} />
        {/* Population with sparkline */}
        <div className="metric-item chart-metric full-span">
          <div className="metric-icon small"><Users className="w-4 h-4" /></div>
          <div className="metric-content">
            <div className="metric-label">Population</div>
            <div className="metric-value">{s.formatNumber(data.populationTotal.value)}</div>
            {series?.populationSeries && series.populationSeries.length > 0 && (
              <div className="mt-2"><Sparkline series={series.populationSeries} color="#60a5fa" /></div>
            )}
          </div>
        </div>
        {/* Two-column row: Growth + Urban/Rural */}
        <div className="chart-row two-col full-span">
          <div className="metric-item chart-metric">
            <div className="metric-icon small"><UserPlus className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Population growth</div>
              <div className="metric-value">{s.formatPercent(data.populationGrowth.value)}</div>
              {series?.populationGrowthSeries && series.populationGrowthSeries.length > 0 && (
                <div className="mt-2"><Sparkline series={series.populationGrowthSeries} color="#22d3ee" /></div>
              )}
            </div>
          </div>
          <div className="metric-item chart-metric">
            <div className="metric-icon small"><Building2 className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Urban vs Rural</div>
              <div className="flex items-center gap-3 mt-1">
                <Donut size={128} parts={[
                  { value: Number(data.urbanPopulationPercent.value ?? 0), color: '#60a5fa' },
                  { value: Number(data.ruralPopulationPercent.value ?? 0), color: '#22d3ee' }
                ]} />
                <div className="legend">
                  <div className="legend-item"><span className="legend-swatch" style={{ background: '#60a5fa' }}></span>Urban {s.formatPercent(data.urbanPopulationPercent.value)}</div>
                  <div className="legend-item"><span className="legend-swatch" style={{ background: '#22d3ee' }}></span>Rural {s.formatPercent(data.ruralPopulationPercent.value)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Birth vs Death professional dual-line */}
        <div className="metric-item chart-metric full-span">
          <div className="metric-icon small"><Activity className="w-4 h-4" /></div>
          <div className="metric-content">
            <div className="metric-label">Birth vs Death (per 1,000)</div>
            <div className="legend mb-1">
              <div className="legend-item"><span className="legend-swatch" style={{ background: '#22d3ee' }}></span>Birth {s.formatPerThousand(data.crudeBirthRate.value)}</div>
              <div className="legend-item"><span className="legend-swatch" style={{ background: '#f87171' }}></span>Death {s.formatPerThousand(data.crudeDeathRate.value)}</div>
            </div>
            <DualLine leftSeries={series?.deathSeries || []} rightSeries={series?.birthSeries || []} leftColor="#f87171" rightColor="#22d3ee" height={112} />
          </div>
        </div>
        <Metric icon={<MapPin className="w-4 h-4" />} label="Population density" value={s.formatNumber(data.populationDensity.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Primary net enrollment" value={s.formatPercent(data.primaryNetEnrollment.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Extreme poverty ($2.15)" value={s.formatPercent(data.povertyExtreme215.value)} />
      </div>
    </motion.div>
  );
}


