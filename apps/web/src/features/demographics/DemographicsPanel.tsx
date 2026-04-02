import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users2, Globe2, ArrowRight, ChevronDown, Shield, AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguages } from './hooks/useLanguages';
import { useReligionStats } from './hooks/useReligionStats';
import { useDiasporaData } from './hooks/useDiasporaData';
import { useDiasporaCorridors } from './hooks/useDiasporaCorridors';
import { useCountryCorridors } from './hooks/useCountryCorridors';
import { useDiasporaYears } from './hooks/useDiasporaYears';
import { useDiasporaTotals } from './hooks/useDiasporaTotals';
import { useCountryMap } from './hooks/useCountryMap';
import {
  addLanguageLayers, removeLanguageLayers, setLanguageVisibility,
  addReligionLayers, removeReligionLayers, setReligionVisibility,
  addDiasporaLayers, removeDiasporaLayers, setDiasporaVisibility,
  removeAllDemographicLayers, setCountryCentroids, filterDiasporaByOrigin,
} from './demographic-visualization';
import { COUNTRY_CENTROIDS } from './country-centroids';
import type { DemographicTab, Language, DiasporaOrigin } from './types';
import { languageFamilyColor, religionColor, LANG_STATUS_COLOR, LANGUAGE_FAMILY_COLOR, RELIGION_COLOR, DIASPORA_CATEGORIES } from './types';

function SkeletonCard() {
  return (
    <div className="demo-card demo-skeleton">
      <div className="skeleton-line skeleton-badge" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-meta" />
    </div>
  );
}

interface DemographicsPanelProps {
  onBack: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
}

function formatPop(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Animated counter component ──
function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (value === 0) { setDisplay(0); return; }

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - elapsed, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (elapsed < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [value, duration]);

  return <>{formatPop(display)}</>;
}

// ── Stacked horizontal bar for diaspora breakdown ──
function DiasporaStackedBar({ data }: { data: DiasporaOrigin }) {
  const segments = DIASPORA_CATEGORIES
    .map(cat => ({ ...cat, value: (data as any)[cat.key] as number }))
    .filter(s => s.value > 0);

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  return (
    <div className="dia-stacked-bar-container">
      <div className="dia-stacked-bar">
        {segments.map(seg => (
          <motion.div
            key={seg.key}
            className="dia-stacked-segment"
            style={{ background: seg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.value / total) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            title={`${seg.label}: ${formatPop(seg.value)}`}
          />
        ))}
      </div>
      <div className="dia-stacked-legend">
        {segments.map(seg => (
          <span key={seg.key} className="dia-stacked-legend-item">
            <span className="dia-stacked-legend-dot" style={{ background: seg.color }} />
            <span className="dia-stacked-legend-label">{seg.label}</span>
            <span className="dia-stacked-legend-value">{formatPop(seg.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Expanded country detail with corridor chart ──
function DiasporaExpanded({ iso3, year }: { iso3: string; year?: number | null }) {
  const { data, loading } = useCountryCorridors(iso3, year);

  if (loading) return (
    <div className="dia-expanded-loading">
      <div className="skeleton-line" style={{ width: '100%', height: 120 }} />
    </div>
  );

  if (!data || data.asOrigin.length === 0) return (
    <div className="dia-expanded-empty">No corridor data</div>
  );

  const topDests = data.asOrigin.slice(0, 8).map(c => ({
    name: (c.destinationName || c.destinationIso3).replace(/\(.+\)/, '').trim().slice(0, 16),
    refugees: c.refugees,
    asylum: c.asylumSeekers,
    idps: c.idps,
  }));

  return (
    <motion.div
      className="dia-expanded"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="dia-expanded-title">
        <ArrowRight size={11} /> Top destinations
      </div>
      <div className="dia-expanded-chart">
        <ResponsiveContainer width="100%" height={topDests.length * 28 + 8}>
          <BarChart data={topDests} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 6,
                fontSize: 11,
                color: '#e2e8f0',
              }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
              formatter={(val: number, name: string) => [formatPop(val), name === 'refugees' ? 'Refugees' : name === 'asylum' ? 'Asylum' : 'IDPs']}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="refugees" stackId="a" radius={[0, 0, 0, 0]} barSize={14}>
              {topDests.map((_, i) => <Cell key={i} fill="#ef4444" />)}
            </Bar>
            <Bar dataKey="asylum" stackId="a" radius={[0, 0, 0, 0]} barSize={14}>
              {topDests.map((_, i) => <Cell key={i} fill="#eab308" />)}
            </Bar>
            <Bar dataKey="idps" stackId="a" radius={[0, 3, 3, 0]} barSize={14}>
              {topDests.map((_, i) => <Cell key={i} fill="#f97316" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ── Top corridors flow chart ──
function TopCorridorsChart({ corridors }: { corridors: { originName: string | null; destinationName: string | null; refugees: number }[] }) {
  const chartData = corridors
    .slice(0, 10)
    .map(c => {
      const origin = (c.originName || '?').replace(/\(.+\)/, '').trim().slice(0, 12);
      const dest = (c.destinationName || '?').replace(/\(.+\)/, '').trim().slice(0, 12);
      return {
        corridor: `${origin} \u2192 ${dest}`,
        refugees: c.refugees,
      };
    });

  const maxRef = Math.max(...chartData.map(d => d.refugees), 1);

  return (
    <motion.div
      className="dia-corridors-chart"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="dia-corridors-title">Top Migration Corridors</div>
      <div className="dia-corridors-list">
        {chartData.map((item, i) => {
          const pct = (item.refugees / maxRef) * 100;
          return (
            <motion.div
              key={item.corridor}
              className="dia-corridor-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <span className="dia-corridor-rank">#{i + 1}</span>
              <div className="dia-corridor-info">
                <span className="dia-corridor-name">{item.corridor}</span>
                <div className="dia-corridor-track">
                  <motion.div
                    className="dia-corridor-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                    style={{
                      background: `linear-gradient(90deg, #ef4444, ${pct > 60 ? '#dc2626' : '#f87171'})`,
                    }}
                  />
                </div>
              </div>
              <span className="dia-corridor-value">{formatPop(item.refugees)}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Initialize country centroids for the arc visualization
setCountryCentroids(COUNTRY_CENTROIDS);

export default function DemographicsPanel({ onBack, onCenterMap }: DemographicsPanelProps) {
  const [tab, setTab] = useState<DemographicTab>('language');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);
  const [showCorridors, setShowCorridors] = useState(false);
  const layersAdded = useRef({ language: false, religion: false, diaspora: false });
  const countryMapAddedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { latest: diasporaYear } = useDiasporaYears();
  // Pass null so API uses latest available DB year — no need to wait for diasporaYear
  const { data: totals, loading: totalsLoading } = useDiasporaTotals(null);
  const countryMap = useCountryMap(diasporaYear);

  const { data: languages, loading: langLoading } = useLanguages(
    tab === 'language' ? debouncedSearch : undefined
  );
  const { data: religion, loading: relLoading } = useReligionStats(
    tab === 'religion' ? debouncedSearch : undefined
  );
  const { data: diaspora, loading: diaLoading } = useDiasporaData(
    tab === 'diaspora' ? debouncedSearch : undefined,
    diasporaYear
  );
  const { data: corridors } = useDiasporaCorridors(diasporaYear);

  const loading = tab === 'language' ? langLoading : tab === 'religion' ? relLoading : diaLoading;
  const totalSpeakers = useMemo(() => languages.reduce((s, l) => s + l.speakers, 0), [languages]);

  // ── Diaspora aggregated stats ──
  const diasporaStats = useMemo(() => {
    if (diaspora.length === 0) return null;
    return {
      totalRefugees: diaspora.reduce((s, d) => s + d.refugees, 0),
      totalIDPs: diaspora.reduce((s, d) => s + (d.idps || 0), 0),
      totalAsylum: diaspora.reduce((s, d) => s + d.asylumSeekers, 0),
      totalStateless: diaspora.reduce((s, d) => s + (d.stateless || 0), 0),
      totalReturned: diaspora.reduce((s, d) => s + (d.returnedRefugees || 0), 0),
      origins: diaspora.length,
    };
  }, [diaspora]);

  // ── Map layer management ──
  useEffect(() => {
    const getMap = () => (document as any).__wl_map_comp?.getMap?.();
    const map = getMap();
    if (!map) return;

    if (languages.length > 0 && !layersAdded.current.language) {
      try { addLanguageLayers(map, languages); layersAdded.current.language = true; } catch {}
    }
    if (religion.length > 0 && !layersAdded.current.religion) {
      try { addReligionLayers(map, religion); layersAdded.current.religion = true; } catch {}
    }
    if (diaspora.length > 0 && corridors.length > 0) {
      const needsAdd = !layersAdded.current.diaspora;
      const needsCountryMap = !!countryMap && !countryMapAddedRef.current;
      if (needsAdd || needsCountryMap) {
        try {
          addDiasporaLayers(map, corridors, diaspora, countryMap);
          layersAdded.current.diaspora = true;
          countryMapAddedRef.current = !!countryMap;
        } catch {}
      }
    }

    try {
      setLanguageVisibility(map, tab === 'language');
      setReligionVisibility(map, tab === 'religion');
      setDiasporaVisibility(map, tab === 'diaspora');
    } catch {}
  }, [tab, languages, religion, diaspora, corridors, countryMap]);

  // ── Filter map when an origin is selected/deselected ──
  useEffect(() => {
    const map = (document as any).__wl_map_comp?.getMap?.();
    if (!map) return;
    try { filterDiasporaByOrigin(map, expandedOrigin); } catch {}
  }, [expandedOrigin]);

  useEffect(() => {
    return () => {
      const map = (document as any).__wl_map_comp?.getMap?.();
      if (!map) return;
      try { removeAllDemographicLayers(map); } catch {}
      layersAdded.current = { language: false, religion: false, diaspora: false };
      countryMapAddedRef.current = false;
    };
  }, []);

  function handleLangClick(lang: Language) {
    if (onCenterMap && lang.lat && lang.lng) {
      onCenterMap({ lat: lang.lat, lng: lang.lng });
    }
  }

  function handleDiasporaClick(d: DiasporaOrigin) {
    setExpandedOrigin(prev => prev === d.iso3 ? null : d.iso3);
    const centroid = COUNTRY_CENTROIDS[d.iso3];
    if (onCenterMap && centroid) {
      onCenterMap({ lat: centroid[1], lng: centroid[0] });
    }
  }

  // Legend data for current tab
  const legend = useMemo(() => {
    if (tab === 'language') {
      const families = [...new Set(languages.map(l => l.family).filter(Boolean))] as string[];
      return families.slice(0, 10).map(f => ({ label: f, color: LANGUAGE_FAMILY_COLOR[f] || '#64748b' }));
    }
    if (tab === 'religion') {
      return Object.entries(RELIGION_COLOR).slice(0, 7).map(([k, v]) => ({ label: k, color: v }));
    }
    return DIASPORA_CATEGORIES.map(c => ({ label: c.label, color: c.color }));
  }, [tab, languages]);

  return (
    <motion.div
      className="demo-panel"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="demo-header">
        <h1 className="demo-title">DEMOGRAPHICS</h1>
        <button onClick={onBack} className="demo-close"><X className="h-5 w-5" /></button>
      </div>

      {/* Filters bar */}
      <div className="demo-filters-bar">
        <div className="demo-chips">
          <button className={`demo-chip${tab === 'language' ? ' active' : ''}`} onClick={() => { setTab('language'); setSearchQuery(''); setDebouncedSearch(''); setExpandedOrigin(null); }}>
            Language
          </button>
          <button className={`demo-chip${tab === 'religion' ? ' active' : ''}`} onClick={() => { setTab('religion'); setSearchQuery(''); setDebouncedSearch(''); setExpandedOrigin(null); }}>
            Religion
          </button>
          <button className={`demo-chip${tab === 'diaspora' ? ' active' : ''}`} onClick={() => { setTab('diaspora'); setSearchQuery(''); setDebouncedSearch(''); }}>
            Diaspora
          </button>
        </div>

        <input
          type="text"
          className="demo-inline-search"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
        />

        <div className="demo-stats-line">
          {tab === 'language' && <span>{languages.length} languages · {formatPop(totalSpeakers)} speakers</span>}
          {tab === 'religion' && <span>{religion.length} countries</span>}
          {tab === 'diaspora' && <span>{diaspora.length} origin countries{diasporaYear ? ` (${diasporaYear})` : ''}</span>}
          {searchQuery && (
            <button className="demo-clear-btn" onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}>Clear</button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="demo-legend">
        {legend.map(item => (
          <span key={item.label} className="demo-legend-item">
            <span className="demo-legend-dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Content feed */}
      <div className="demo-content">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* ── LANGUAGE ── */}
            {tab === 'language' && (
              <>
                {languages.map((lang, i) => {
                  const famColor = languageFamilyColor(lang.family);
                  const statusColor = LANG_STATUS_COLOR[lang.status || ''] || '#64748b';
                  return (
                    <motion.div
                      key={lang.id}
                      className="demo-card"
                      onClick={() => handleLangClick(lang)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.5), ease: 'easeOut' }}
                    >
                      <div className="demo-card-header">
                        {lang.family && (
                          <span className="demo-card-status" style={{ background: `${famColor}22`, color: famColor, border: `1px solid ${famColor}44` }}>
                            {lang.family}
                          </span>
                        )}
                        <span className="demo-lang-status" style={{ color: statusColor }}>
                          {lang.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="demo-card-name">{lang.name}</div>
                      <div className="demo-card-meta">
                        <span><Users2 size={12} /> {formatPop(lang.speakers)} speakers</span>
                        {lang.nbrCountries > 0 && <span><Globe2 size={12} /> {lang.nbrCountries} countries</span>}
                      </div>
                      {lang.officialIn.length > 0 && (
                        <div className="demo-card-meta" style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                          <span>Official in: {lang.officialIn.join(', ')}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {languages.length === 0 && <div className="demo-empty"><p>No languages match</p></div>}
              </>
            )}

            {/* ── RELIGION ── */}
            {tab === 'religion' && (
              <>
                {religion.map((rel, i) => {
                  const bars = [
                    { key: 'Christianity', label: 'Christianity', pct: rel.pctChristianity },
                    { key: 'Islam', label: 'Islam', pct: rel.pctIslam },
                    { key: 'Hinduism', label: 'Hinduism', pct: rel.pctHinduism },
                    { key: 'Buddhism', label: 'Buddhism', pct: rel.pctBuddhism },
                    { key: 'Ethnic Religions', label: 'Ethnic', pct: rel.pctEthnicReligions },
                    { key: 'Non-Religious', label: 'None', pct: rel.pctNonReligious },
                    { key: 'Other', label: 'Other', pct: rel.pctOther },
                  ].filter(b => b.pct >= 1);
                  const domColor = religionColor(rel.primaryReligion);
                  return (
                    <motion.div
                      key={rel.id}
                      className="demo-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.5), ease: 'easeOut' }}
                    >
                      <div className="demo-card-header">
                        <span className="demo-card-status" style={{ background: `${domColor}22`, color: domColor, border: `1px solid ${domColor}44` }}>
                          {rel.primaryReligion || 'Unknown'}
                        </span>
                        <span className="demo-iso-badge">{rel.countryIso3}</span>
                      </div>
                      <div className="demo-card-name">{rel.countryName || rel.countryIso3}</div>
                      <div className="demo-card-meta">
                        <span><Users2 size={12} /> {formatPop(rel.population)}</span>
                      </div>
                      <div className="demo-rel-bars">
                        {bars.map(b => (
                          <div key={b.key} className="demo-rel-row">
                            <span className="demo-rel-label">{b.label}</span>
                            <div className="demo-rel-track">
                              <div className="demo-rel-fill" style={{ width: `${b.pct}%`, background: religionColor(b.key) }} />
                            </div>
                            <span className="demo-rel-pct">{b.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
                {religion.length === 0 && <div className="demo-empty"><p>No countries match</p></div>}
              </>
            )}

            {/* ── DIASPORA (ENHANCED) ── */}
            {tab === 'diaspora' && (
              <>
                {/* Hero Stats — global totals from /diaspora/totals endpoint */}
                {(totals || totalsLoading) && (
                  <motion.div
                    className="dia-hero"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="dia-hero-grid">
                      <div className="dia-hero-stat" title="People forced to flee their country due to persecution, war or violence, and cannot return safely.">
                        <div className="dia-hero-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                          <Users2 size={14} />
                        </div>
                        <div className="dia-hero-data">
                          <span className="dia-hero-value"><AnimatedCounter value={totals?.totalRefugees ?? 0} /></span>
                          <span className="dia-hero-label">Refugees</span>
                          <span className="dia-hero-desc">Fled across borders</span>
                        </div>
                      </div>
                      <div className="dia-hero-stat" title="Internally Displaced Persons — people forced to flee their home but who remain within their country's borders.">
                        <div className="dia-hero-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                          <AlertTriangle size={14} />
                        </div>
                        <div className="dia-hero-data">
                          <span className="dia-hero-value"><AnimatedCounter value={totals?.totalIDPs ?? 0} /></span>
                          <span className="dia-hero-label">IDPs</span>
                          <span className="dia-hero-desc">Displaced within borders</span>
                        </div>
                      </div>
                      <div className="dia-hero-stat" title="People who have applied for international protection but whose claim has not yet been determined.">
                        <div className="dia-hero-icon" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>
                          <Shield size={14} />
                        </div>
                        <div className="dia-hero-data">
                          <span className="dia-hero-value"><AnimatedCounter value={totals?.totalAsylumSeekers ?? 0} /></span>
                          <span className="dia-hero-label">Asylum seekers</span>
                          <span className="dia-hero-desc">Awaiting protection status</span>
                        </div>
                      </div>
                      <div className="dia-hero-stat" title="Stateless persons — people who are not considered as nationals by any state under the operation of its law.">
                        <div className="dia-hero-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                          <Globe2 size={14} />
                        </div>
                        <div className="dia-hero-data">
                          <span className="dia-hero-value"><AnimatedCounter value={totals?.totalStateless ?? 0} /></span>
                          <span className="dia-hero-label">Stateless</span>
                          <span className="dia-hero-desc">Without nationality</span>
                        </div>
                      </div>
                    </div>
                    {/* Secondary stats row: solutions + decisions data */}
                    {totals && (totals.resettlement != null || totals.applied != null || totals.decRecognized != null) && (
                      <div className="dia-hero-secondary-grid">
                        {totals.applied != null && (
                          <div className="dia-hero-secondary-item" title="New asylum applications filed this year">
                            <span className="dia-hero-secondary-value">{formatPop(totals.applied)}</span>
                            <span className="dia-hero-secondary-label">Applications</span>
                          </div>
                        )}
                        {totals.decTotal != null && totals.decTotal > 0 && (
                          <div className="dia-hero-secondary-item" title={`Recognition rate: ${totals.decRecognized} recognized of ${totals.decTotal} decisions`}>
                            <span className="dia-hero-secondary-value">
                              {((totals.decRecognized ?? 0) / totals.decTotal * 100).toFixed(1)}%
                            </span>
                            <span className="dia-hero-secondary-label">Recognition rate</span>
                          </div>
                        )}
                        {totals.resettlement != null && (
                          <div className="dia-hero-secondary-item" title="Refugees resettled to a third country">
                            <span className="dia-hero-secondary-value">{formatPop(totals.resettlement)}</span>
                            <span className="dia-hero-secondary-label">Resettled</span>
                          </div>
                        )}
                        {(totals.totalReturnedRefugees ?? 0) > 0 && (
                          <div className="dia-hero-secondary-item" title="Refugees who voluntarily returned home">
                            <RotateCcw size={9} style={{ color: '#64748b' }} />
                            <span className="dia-hero-secondary-value">{formatPop(totals.totalReturnedRefugees)}</span>
                            <span className="dia-hero-secondary-label">Returned</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Toggle: Top Corridors Chart */}
                {corridors.length > 0 && (
                  <button
                    className={`dia-corridors-toggle${showCorridors ? ' active' : ''}`}
                    onClick={() => setShowCorridors(v => !v)}
                  >
                    <ChevronDown size={12} style={{ transform: showCorridors ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    {showCorridors ? 'Hide' : 'Show'} Top Corridors
                  </button>
                )}

                <AnimatePresence>
                  {showCorridors && corridors.length > 0 && (
                    <TopCorridorsChart corridors={corridors} />
                  )}
                </AnimatePresence>

                {/* Origin cards */}
                {diaspora.map((d, i) => {
                  const isExpanded = expandedOrigin === d.iso3;
                  const totalDisplaced = d.refugees + d.asylumSeekers + (d.idps || 0);
                  const severity = d.refugees >= 3_000_000 ? 'critical' : d.refugees >= 1_000_000 ? 'high' : d.refugees >= 300_000 ? 'medium' : 'low';

                  return (
                    <motion.div
                      key={d.iso3}
                      className={`demo-card dia-card${isExpanded ? ' dia-card-expanded' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.5), ease: 'easeOut' }}
                    >
                      {/* Severity heat bar */}
                      <div className={`dia-severity-bar dia-severity-${severity}`} />

                      <div className="dia-card-clickable" onClick={() => handleDiasporaClick(d)}>
                        <div className="demo-card-header">
                          <span className="demo-card-status" style={{
                            background: severity === 'critical' ? '#ef444422' : severity === 'high' ? '#f9731622' : '#eab30822',
                            color: severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : '#eab308',
                            border: `1px solid ${severity === 'critical' ? '#ef444444' : severity === 'high' ? '#f9731644' : '#eab30844'}`,
                          }}>
                            {formatPop(d.refugees)} refugees
                          </span>
                          <span className="dia-rank">#{i + 1}</span>
                          <span className="demo-iso-badge">{d.iso3}</span>
                        </div>
                        <div className="demo-card-name">{d.name || d.iso3}</div>
                        <div className="demo-card-meta">
                          <span><Users2 size={12} /> {formatPop(totalDisplaced)} total displaced</span>
                          {(d.idps || 0) > 0 && (
                            <span><Home size={12} /> {formatPop(d.idps)} IDPs</span>
                          )}
                        </div>

                        {/* Stacked breakdown bar */}
                        <DiasporaStackedBar data={d} />

                        <div className="dia-expand-hint">
                          <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          {isExpanded ? 'Collapse' : 'View destinations'}
                        </div>
                      </div>

                      {/* Expanded corridor details */}
                      <AnimatePresence>
                        {isExpanded && <DiasporaExpanded iso3={d.iso3} year={diasporaYear} />}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                {diaspora.length === 0 && <div className="demo-empty"><p>No data available</p></div>}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="demo-footer">
        <p className="demo-footer-text">
          Sources: <a href="https://joshuaproject.net" target="_blank" rel="noreferrer" className="demo-footer-link">Joshua Project</a>,{' '}
          <a href="https://www.unhcr.org/refugee-statistics/" target="_blank" rel="noreferrer" className="demo-footer-link">UNHCR</a>
        </p>
      </div>
    </motion.div>
  );
}
