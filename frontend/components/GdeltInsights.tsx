import React, { useMemo, useState } from 'react';
import { useGdeltInsights } from '../hooks/useGdeltInsights';

interface GdeltInsightsProps {
  defaultQuery?: string;
}

function Sparkline({ points }: { points: Array<{ date: string; value: number }> }) {
  const width = 220;
  const height = 44;
  const padding = 4;
  const xs = points.map((_, i) => i);
  const ys = points.map(p => p.value);
  const maxX = Math.max(1, xs.length - 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const pathPoints = points.map((p, i) => {
    const x = padding + (i / maxX) * (width - padding * 2);
    const y = height - padding - ((p.value - minY) / (maxY - minY)) * (height - padding * 2);
    return { x, y };
  });
  const d = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `M${padding},${height - padding} ` + pathPoints.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${width - padding},${height - padding} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="trend sparkline">
      <defs>
        <linearGradient id="gdeltSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gdeltSpark)" stroke="none" />
      <path d={d} fill="none" stroke="#7dd3fc" strokeWidth="2" />
    </svg>
  );
}

export default function GdeltInsights({ defaultQuery = 'global conflict', pretty = false }: GdeltInsightsProps & { pretty?: boolean }) {
  const [query, setQuery] = useState<string>(defaultQuery);
  const [timespan, setTimespan] = useState<'24h' | '7d' | '30d'>('7d');
  const { data, loading, error } = useGdeltInsights(query, timespan);

  const changePctText = useMemo(() => {
    const v = data?.kpis.changeVs7d;
    if (v === null || v === undefined) return 'N/A';
    const pct = (v * 100).toFixed(0);
    return `${v >= 0 ? '+' : ''}${pct}% vs 7d`;
  }, [data]);

  const wrapperClasses = pretty
    ? 'mt-3 p-4 rounded-lg bg-slate-800/60 border border-slate-700 shadow-lg'
    : 'mt-6 p-3 rounded-md bg-slate-800/50 border border-slate-700';

  return (
    <div className={wrapperClasses}>
      <div className={pretty ? 'text-base font-bold mb-3 text-slate-100' : 'text-sm font-semibold mb-2'}>GDELT Insights</div>
      <div className={pretty ? 'flex items-center gap-3 mb-4' : 'flex items-center gap-2 mb-3'}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar país/tema"
          className={pretty ? 'w-full px-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500' : 'w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded'}
        />
        <select
          value={timespan}
          onChange={e => setTimespan(e.target.value as any)}
          className={pretty ? 'px-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-md' : 'px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded'}
        >
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
        </select>
      </div>

      {loading && <div className="text-xs text-slate-400">Cargando…</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}

      {data && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className={pretty ? 'grid grid-cols-3 gap-3 text-center' : 'grid grid-cols-3 gap-2 text-center'}>
            <div className={pretty ? 'bg-slate-900/70 border border-slate-700 rounded-md p-3' : 'bg-slate-900 border border-slate-700 rounded p-2'}>
              <div className="text-[10px] text-slate-400">Volumen 24h</div>
              <div className={pretty ? 'text-base font-semibold' : 'text-sm font-semibold'}>{data.kpis.volume24h ?? 'N/A'}</div>
            </div>
            <div className={pretty ? 'bg-slate-900/70 border border-slate-700 rounded-md p-3' : 'bg-slate-900 border border-slate-700 rounded p-2'}>
              <div className="text-[10px] text-slate-400">Variación</div>
              <div className={`${pretty ? 'text-base' : 'text-sm'} font-semibold ${Number(data.kpis.changeVs7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{changePctText}</div>
            </div>
            <div className={pretty ? 'bg-slate-900/70 border border-slate-700 rounded-md p-3' : 'bg-slate-900 border border-slate-700 rounded p-2'}>
              <div className="text-[10px] text-slate-400">Tono</div>
              <div className={pretty ? 'text-base font-semibold' : 'text-sm font-semibold'}>{data.kpis.toneAvg !== null && data.kpis.toneAvg !== undefined ? data.kpis.toneAvg.toFixed(2) : 'N/A'}</div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">Tendencia</div>
            <div className="text-slate-200">
              <Sparkline points={data.timeline} />
            </div>
          </div>

          {/* Headlines */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Titulares</div>
            <ul className={pretty ? 'space-y-2' : 'space-y-1'}>
              {data.headlines.map((h, idx) => (
                <li key={idx} className={pretty ? 'text-sm' : 'text-xs'}>
                  <a href={h.url} target="_blank" rel="noreferrer" className={pretty ? 'text-sky-300 hover:underline hover:text-sky-200 transition-colors' : 'text-sky-300 hover:underline'}>
                    {h.title}
                  </a>
                  {h.source && <span className="text-slate-500"> · {h.source}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Themes / Places */}
          <div className={pretty ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-2 gap-2'}>
            <div>
              <div className="text-xs text-slate-400 mb-1">Temas</div>
              <div className="flex flex-wrap gap-2">
                {data.themes.map(t => (
                  <button
                    key={t.name}
                    className={pretty ? 'text-[11px] px-3 py-1.5 rounded bg-slate-900/70 border border-slate-700 hover:bg-slate-800' : 'text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800'}
                    onClick={() => setQuery(t.name)}
                  >
                    {t.name} <span className="text-slate-500">({t.count})</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Lugares</div>
              <ul className={pretty ? 'space-y-1.5' : 'space-y-1'}>
                {data.places.map(p => (
                  <li key={p.name} className={pretty ? 'text-sm flex justify-between' : 'text-xs flex justify-between'}>
                    <span>{p.name}</span>
                    <span className="text-slate-500">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


