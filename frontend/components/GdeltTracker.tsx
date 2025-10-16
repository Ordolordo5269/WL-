import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Globe, Maximize2, Minimize2 } from 'lucide-react';
import GdeltInsights from './GdeltInsights';
import { useGdeltInsights } from '../hooks/useGdeltInsights';
import GdeltOverviewPanel from './GdeltOverviewPanel';

interface GdeltTrackerProps {
  onBack: () => void;
}

export default function GdeltTracker({ onBack }: GdeltTrackerProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'headlines' | 'themes' | 'entities' | 'places' | 'sources' | 'languages' | 'about'>('overview');
  const [query, setQuery] = useState<string>('global conflict');
  const [timespan, setTimespan] = useState<'24h' | '7d' | '30d'>('7d');
  const { data, loading, error } = useGdeltInsights(query, timespan);
  const panelStyle = useMemo(() => {
    return expanded
      ? { width: '80vw', maxWidth: '960px' }
      : { width: '32vw', maxWidth: '520px' };
  }, [expanded]);
  return (
    <motion.div 
      className="conflict-tracker"
      style={panelStyle}
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
    >
      {/* Header */}
      <div className="conflict-tracker-header">
        <h1 className="conflict-tracker-title">GDELT TRACKER</h1>
        <button
          onClick={() => setExpanded(v => !v)}
          className="conflict-tracker-close-btn"
          aria-label={expanded ? 'Reduce panel' : 'Expand panel'}
          style={{ right: 52 }}
        >
          {expanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
        <button onClick={onBack} className="conflict-tracker-close-btn" aria-label="Close GDELT Tracker">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="conflict-tracker-content">
        <div className="conflict-tracker-tabs" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          {[
            ['overview','Overview'],
            ['headlines','Headlines'],
            ['themes','Themes'],
            ['entities','Entities'],
            ['places','Places'],
            ['sources','Sources'],
            ['languages','Languages'],
            ['about','About']
          ].map(([key,label]) => (
            <button
              key={key}
              className={`conflict-tracker-tab${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key as any)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Global controls */}
        <div style={{ margin: '8px 16px' }}>
          <div className="flex items-center gap-3" style={{ display: 'flex', gap: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topic/country"
              className="w-full px-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <select
              value={timespan}
              onChange={e => setTimespan(e.target.value as any)}
              className="px-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-md"
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
            </select>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="conflict-tracker-section-header">
              <Globe size={16} />
              <h3>Global News Insights</h3>
            </div>
            <GdeltOverviewPanel data={data as any} loading={loading} error={error} />
          </>
        )}

        {activeTab === 'headlines' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {error && <div className="conflict-tracker-empty" style={{ color: '#fca5a5' }}>{error}</div>}
            {!loading && !error && (
              <>
                <ul className="space-y-2" style={{ margin: '0 16px' }}>
                  {(data?.headlines ?? []).slice(0, 20).map((h, i) => (
                    <li key={i} className="text-sm">
                      <a href={h.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline hover:text-sky-200">{h.title}</a>
                      {h.source && <span className="text-slate-500"> · {h.source}</span>}
                    </li>
                  ))}
                </ul>
                <div className="text-center" style={{ marginTop: 8 }}>
                  <a
                    className="text-xs text-sky-300 hover:underline"
                    href={`${window.location.origin}/api/gdelt/doc?q=${encodeURIComponent(query)}&timespan=${timespan}&maxrecords=100`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View more (API)
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {!loading && (
              <div className="flex flex-wrap gap-2" style={{ margin: '0 16px' }}>
                {(data?.themes ?? []).map(t => (
                  <button key={t.name} className="text-[11px] px-3 py-1.5 rounded bg-slate-900/70 border border-slate-700 hover:bg-slate-800" onClick={() => setQuery(t.name)}>
                    {t.name} <span className="text-slate-500">({t.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'entities' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {!loading && (
              <div className="grid grid-cols-2 gap-4" style={{ display: 'grid' as any, margin: '0 16px' }}>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Persons</div>
                  <ul className="space-y-1.5">
                    {(data?.persons ?? []).map(p => (
                      <li key={p.name} className="text-sm flex justify-between"><span>{p.name}</span><span className="text-slate-500">{p.count}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Organizations</div>
                  <ul className="space-y-1.5">
                    {(data?.organizations ?? []).map(o => (
                      <li key={o.name} className="text-sm flex justify-between"><span>{o.name}</span><span className="text-slate-500">{o.count}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'places' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {!loading && (
              <ul className="space-y-1.5" style={{ margin: '0 16px' }}>
                {(data?.places ?? []).map(p => (
                  <li key={p.name} className="text-sm flex justify-between"><span>{p.name}</span><span className="text-slate-500">{p.count}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {!loading && (
              <ul className="space-y-1.5" style={{ margin: '0 16px' }}>
                {(data?.sources ?? []).map(s => (
                  <li key={s.name} className="text-sm flex justify-between"><span>{s.name}</span><span className="text-slate-500">{s.count}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'languages' && (
          <div className="content-section" style={{ borderBottom: 'none' }}>
            {loading && <div className="conflict-tracker-loading">Loading…</div>}
            {!loading && (
              <ul className="space-y-1.5" style={{ margin: '0 16px' }}>
                {(data?.languages ?? []).map(l => (
                  <li key={l.code} className="text-sm flex justify-between"><span>{l.code.toUpperCase()}</span><span className="text-slate-500">{l.count}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="map-legend" style={{ margin: '12px 16px' }}>
            <div className="legend-title">About GDELT</div>
            <p className="section-content" style={{ fontSize: '0.85rem' }}>
              The GDELT Project monitors the world's broadcast, print, and web news from nearly every corner of the globe in over 100 languages and identifies people, locations, organizations, themes, sources, tone, and events driving our global society.
            </p>
            <p className="section-content" style={{ fontSize: '0.85rem' }}>
              This panel aggregates: volume and normalized timelines, top headlines, themes from the GKG, entities (persons and organizations), geo mentions (GeoJSON), source outlets, and language distribution. Use this as a directional signal; raw media streams can be noisy.
            </p>
            <p className="section-content" style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Learn more at <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer" className="footer-sources">gdeltproject.org</a>.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="conflict-tracker-footer">
        <p className="footer-text">
          Data source: <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer" className="footer-sources">GDELT</a>
        </p>
      </div>
    </motion.div>
  );
}


