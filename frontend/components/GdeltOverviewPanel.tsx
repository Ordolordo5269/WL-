import React from 'react';

interface OverviewProps {
  data: {
    kpis: { volume24h: number | null; changeVs7d: number | null; toneAvg: number | null };
    timeline: Array<{ date: string; value: number }>;
    timelineNorm: Array<{ date: string; value: number }>;
    headlines: Array<{ title: string; url: string; source?: string }>;
    themes: Array<{ name: string; count: number }>;
    places: Array<{ name: string; count: number }>;
    spikes: Array<{ date: string; value: number }>;
  } | null;
  loading: boolean;
  error: string | null;
}

function Sparkline({ points, color = '#7dd3fc', fill = 'url(#gdeltSpark2)' }: { points: Array<{ date: string; value: number }>; color?: string; fill?: string }) {
  const width = 260;
  const height = 54;
  const padding = 6;
  if (!points || points.length === 0) return <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No data</div>;
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
        <linearGradient id="gdeltSpark2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={area} fill={fill} stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export default function GdeltOverviewPanel({ data, loading, error }: OverviewProps) {
  if (loading) return <div className="conflict-tracker-loading"><div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div><p>Loading…</p></div>;
  if (error) return <div className="conflict-tracker-empty" style={{ color: '#fca5a5' }}>{error}</div>;
  if (!data) return null;
  const changePct = data.kpis.changeVs7d == null ? 'N/A' : `${data.kpis.changeVs7d >= 0 ? '+' : ''}${(data.kpis.changeVs7d * 100).toFixed(0)}% vs 7d`;
  return (
    <div className="content-section" style={{ borderBottom: 'none' }}>
      <div className="grid grid-cols-3 gap-3 text-center" style={{ display: 'grid' as any }}>
        <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3">
          <div className="text-[10px] text-slate-400">Volumen 24h</div>
          <div className="text-base font-semibold">{data.kpis.volume24h ?? 'N/A'}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3">
          <div className="text-[10px] text-slate-400">Variación</div>
          <div className={`text-base font-semibold ${Number(data.kpis.changeVs7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{changePct}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3">
          <div className="text-[10px] text-slate-400">Tono</div>
          <div className="text-base font-semibold">{data.kpis.toneAvg != null ? data.kpis.toneAvg.toFixed(2) : 'N/A'}</div>
        </div>
      </div>

      <div className="conflict-tracker-section-header" style={{ marginTop: 12 }}>
        <h3>Tendencia (raw vs normalizada)</h3>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', margin: '0 16px' }}>
        <div>
          <Sparkline points={data.timeline} />
          {data.spikes.length > 0 && (
            <div className="text-[10px] text-emerald-300" style={{ marginTop: 4 }}>Spikes: {data.spikes.length}</div>
          )}
        </div>
        <Sparkline points={data.timelineNorm} color="#a78bfa" fill="url(#gdeltSpark2)" />
      </div>

      <div className="conflict-tracker-section-header" style={{ marginTop: 12 }}>
        <h3>Top Headlines</h3>
      </div>
      <ul className="space-y-2" style={{ margin: '0 16px' }}>
        {data.headlines.map((h, i) => (
          <li key={i} className="text-sm">
            <a href={h.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline hover:text-sky-200">{h.title}</a>
            {h.source && <span className="text-slate-500"> · {h.source}</span>}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-4" style={{ display: 'grid' as any, margin: '12px 16px' }}>
        <div>
          <div className="text-xs text-slate-400 mb-1">Themes</div>
          <div className="flex flex-wrap gap-2">
            {data.themes.map(t => (
              <span key={t.name} className="text-[11px] px-3 py-1.5 rounded bg-slate-900/70 border border-slate-700">{t.name} <span className="text-slate-500">({t.count})</span></span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Places</div>
          <ul className="space-y-1.5">
            {data.places.map(p => (
              <li key={p.name} className="text-sm flex justify-between"><span>{p.name}</span><span className="text-slate-500">{p.count}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


