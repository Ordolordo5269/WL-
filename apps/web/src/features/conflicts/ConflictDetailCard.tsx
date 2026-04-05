import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Skull, Shield, Users2, Crosshair, Globe, TrendingUp, Newspaper, Swords, ExternalLink } from 'lucide-react';
import { useConflictDetail } from './useConflictDetail';
import { useUcdpProfile } from './useUcdpProfile';
import UcdpFactionPanel from './UcdpFactionPanel';
import type { ConflictV2, ConflictDetail, UcdpEvent } from './types';
import { statusLabel, severityColor, statusToSeverity, violenceTypeLabel, violenceTypeColor } from './types';

interface ConflictDetailCardProps {
  conflict: ConflictV2;
  onBack?: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
}

function cleanText(text: string): string {
  return text.replace(/XXX\d*/g, 'Undisclosed').trim();
}

function cleanActorName(name: string): string {
  if (/^XXX\d*$/.test(name.trim())) return 'Undisclosed actor';
  return cleanText(name);
}

const ConflictDetailCard: React.FC<ConflictDetailCardProps> = ({ conflict, onBack, onCenterMap }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'factions' | 'news'>('overview');
  const { data: detail } = useConflictDetail(conflict.slug);
  const { data: ucdpProfile } = useUcdpProfile(conflict.slug);

  // News state
  const [newsArticles, setNewsArticles] = useState<Array<{ title: string; source: { name: string } | string; url: string; publishedAt: string; description?: string; urlToImage?: string }>>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'news') return;
    setNewsLoading(true);
    fetch(`/api/news/conflict?country=${encodeURIComponent(conflict.country)}&type=${encodeURIComponent(conflict.conflictType || '')}&pageSize=12`)
      .then(r => r.ok ? r.json() : { articles: [] })
      .then(data => setNewsArticles(data.articles || []))
      .catch(() => setNewsArticles([]))
      .finally(() => setNewsLoading(false));
  }, [activeTab, conflict.country, conflict.conflictType]);

  const ucdpEvents: UcdpEvent[] = (detail as ConflictDetail)?.ucdpEvents ?? [];
  const casualties = detail?.casualties ?? conflict.casualties ?? [];

  const totalDeathsFromCasualties = casualties.reduce((s, c) => s + c.total, 0);

  const deathsBySide = ucdpEvents.reduce(
    (acc, ev) => ({
      sideA: acc.sideA + ev.deathsA,
      sideB: acc.sideB + ev.deathsB,
      civilians: acc.civilians + ev.deathsCivilians,
      unknown: acc.unknown + ev.deathsUnknown,
      best: acc.best + ev.bestEstimate,
      high: acc.high + ev.highEstimate,
      low: acc.low + ev.lowEstimate,
    }),
    { sideA: 0, sideB: 0, civilians: 0, unknown: 0, best: 0, high: 0, low: 0 }
  );

  const totalDeaths = totalDeathsFromCasualties > 0
    ? totalDeathsFromCasualties
    : deathsBySide.best;

  const severity = statusToSeverity(conflict.status);
  const color = severityColor(severity);

  const sideAName = cleanActorName(conflict.sideA || 'Side A');
  const sideBName = cleanActorName(conflict.sideB || 'Side B');

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'factions', label: 'Factions' },
    { id: 'news', label: 'News' },
  ] as const;

  // Casualties section (reused in overview)
  const renderCasualties = () => (
    <>
      {/* Deaths by side */}
      <div className="ucdp-section">
        <h4 className="ucdp-section-title"><Skull size={12} /> Casualties</h4>
        {deathsBySide.best > 0 ? (
          <div className="ucdp-casualties-bars">
            {[
              { label: sideAName, value: deathsBySide.sideA, color: '#3b82f6' },
              { label: sideBName, value: deathsBySide.sideB, color: '#f97316' },
              { label: 'Civilians', value: deathsBySide.civilians, color: '#ef4444' },
              ...(deathsBySide.unknown > 0 ? [{ label: 'Unknown', value: deathsBySide.unknown, color: '#64748b' }] : []),
            ].map(item => (
              <div key={item.label} className="ucdp-casualty-row">
                <div className="ucdp-casualty-label">{item.label}</div>
                <div className="ucdp-casualty-bar-bg">
                  <div
                    className="ucdp-casualty-bar-fill"
                    style={{
                      width: deathsBySide.best > 0 ? `${Math.max(1, (item.value / deathsBySide.best) * 100)}%` : '0%',
                      background: item.color,
                    }}
                  />
                </div>
                <div className="ucdp-casualty-value">{item.value.toLocaleString()}</div>
              </div>
            ))}
            <div className="ucdp-casualty-total">
              <span>Best estimate: <strong>{deathsBySide.best.toLocaleString()}</strong></span>
              {deathsBySide.high > deathsBySide.best && (
                <span className="ucdp-casualty-range">
                  Range: {deathsBySide.low.toLocaleString()} – {deathsBySide.high.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ) : casualties.length > 0 ? (
          <div className="ucdp-casualties-bars">
            {[
              { label: 'Combatants', value: casualties.reduce((s, c) => s + (c.military ?? 0), 0), color: '#3b82f6' },
              { label: 'Civilians', value: casualties.reduce((s, c) => s + (c.civilian ?? 0), 0), color: '#ef4444' },
              { label: 'Total', value: totalDeaths, color: '#a855f7' },
            ].map(item => (
              <div key={item.label} className="ucdp-casualty-row">
                <div className="ucdp-casualty-label">{item.label}</div>
                <div className="ucdp-casualty-bar-bg">
                  <div className="ucdp-casualty-bar-fill" style={{ width: totalDeaths > 0 ? `${(item.value / totalDeaths) * 100}%` : '0%', background: item.color }} />
                </div>
                <div className="ucdp-casualty-value">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Monthly timeline */}
      {ucdpEvents.length > 0 && (() => {
        const monthly = new Map<string, { deaths: number; events: number }>();
        for (const ev of ucdpEvents) {
          const key = ev.dateStart.substring(0, 7);
          const existing = monthly.get(key) || { deaths: 0, events: 0 };
          existing.deaths += ev.bestEstimate;
          existing.events += 1;
          monthly.set(key, existing);
        }
        const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        const maxDeaths = Math.max(...sorted.map(([, v]) => v.deaths), 1);

        return (
          <div className="ucdp-section">
            <h4 className="ucdp-section-title"><TrendingUp size={12} /> Monthly Timeline</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sorted.map(([month, data]) => (
                <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', width: '54px', flexShrink: 0 }}>{month}</span>
                  <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(data.deaths / maxDeaths) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#fca5a5', width: '44px', textAlign: 'right', flexShrink: 0 }}>{data.deaths}</span>
                  <span style={{ fontSize: '10px', color: '#64748b', width: '28px', flexShrink: 0 }}>({data.events})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Deadliest locations */}
      {ucdpEvents.length > 0 && (() => {
        const locations = new Map<string, number>();
        for (const ev of ucdpEvents) {
          const loc = ev.adm1 || ev.whereDescription || ev.country;
          if (loc) locations.set(loc, (locations.get(loc) || 0) + ev.bestEstimate);
        }
        const sorted = [...locations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

        return sorted.length > 0 ? (
          <div className="ucdp-section">
            <h4 className="ucdp-section-title">Deadliest Locations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sorted.map(([loc, deaths]) => (
                <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#cbd5e1' }}>{loc}</span>
                  <span style={{ color: '#fca5a5', fontWeight: 600 }}>{deaths.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </>
  );

  return (
    <div className="conflict-detail-view">
      {/* Header */}
      <div className="ucdp-detail-top">
        <div className="ucdp-detail-top-badges">
          <span className="conflict-card-status" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
            {statusLabel(conflict.status)}
          </span>
          {conflict.typeOfViolence && (
            <span className="ucdp-violence-badge" style={{ color: violenceTypeColor(conflict.typeOfViolence) }}>
              {violenceTypeLabel(conflict.typeOfViolence)}
            </span>
          )}
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            {conflict.region}
          </span>
          {onBack && (
            <button onClick={onBack} title="Back to list" className="ucdp-detail-back">
              <ArrowLeft size={15} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Sides */}
      <div className="ucdp-detail-matchup">
        <div className="ucdp-detail-actor ucdp-actor-a">
          <Shield size={15} />
          <span>{sideAName}</span>
        </div>
        <div className="ucdp-detail-vs-center">
          <span>VS</span>
          <MapPin size={11} />
          <span className="ucdp-detail-location">{conflict.country}</span>
        </div>
        <div className="ucdp-detail-actor ucdp-actor-b">
          <Users2 size={15} />
          <span>{sideBName}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="conflict-tracker-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`conflict-tracker-tab${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 14px 14px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── OVERVIEW (includes casualties) ── */}
            {activeTab === 'overview' && (
              <div>
                <div className="ucdp-section">
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>{cleanText(conflict.description)}</p>
                </div>

                <div className="ucdp-section">
                  <h4 className="ucdp-section-title">Information</h4>
                  <div className="ucdp-info-grid">
                    <div className="ucdp-info-row">
                      <MapPin size={13} />
                      <span className="ucdp-info-label">Location</span>
                      <span className="ucdp-info-value">{conflict.country}</span>
                    </div>
                    <div className="ucdp-info-row">
                      <Globe size={13} />
                      <span className="ucdp-info-label">Region</span>
                      <span className="ucdp-info-value">{conflict.region}</span>
                    </div>
                    <div className="ucdp-info-row">
                      <Calendar size={13} />
                      <span className="ucdp-info-label">Start</span>
                      <span className="ucdp-info-value">{new Date(conflict.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {conflict.endDate && (
                      <div className="ucdp-info-row">
                        <Calendar size={13} />
                        <span className="ucdp-info-label">End</span>
                        <span className="ucdp-info-value">{new Date(conflict.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                    <div className="ucdp-info-row">
                      <Crosshair size={13} />
                      <span className="ucdp-info-label">Type</span>
                      <span className="ucdp-info-value">{conflict.conflictType}</span>
                    </div>
                  </div>
                </div>

                {/* Casualties integrated into overview */}
                {renderCasualties()}

                {conflict.involvedISO && conflict.involvedISO.length > 0 && (
                  <div className="ucdp-section">
                    <h4 className="ucdp-section-title">Involved Countries</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {conflict.involvedISO.map(iso => (
                        <span key={iso} className="ucdp-country-chip">{iso}</span>
                      ))}
                    </div>
                  </div>
                )}

                {conflict.sources && conflict.sources.length > 0 && (
                  <div className="ucdp-section">
                    <h4 className="ucdp-section-title">Sources</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {conflict.sources.slice(0, 10).map((src, i) => (
                        <span key={i} className="ucdp-source-chip">{src}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── FACTIONS ── */}
            {activeTab === 'factions' && (
              <div>
                {ucdpProfile ? (
                  <UcdpFactionPanel profile={ucdpProfile} onFlyTo={onCenterMap} />
                ) : (
                  <div className="ucdp-section">
                    <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                      <Swords size={16} style={{ marginBottom: 4, opacity: 0.5 }} /><br />
                      No UCDP faction data available for this conflict
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── NEWS ── */}
            {activeTab === 'news' && (
              <div>
                {newsLoading ? (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Loading news...</span>
                  </div>
                ) : newsArticles.length === 0 ? (
                  <div className="ucdp-section">
                    <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                      <Newspaper size={16} style={{ marginBottom: 4, opacity: 0.5 }} /><br />
                      No recent news found for this conflict
                    </p>
                  </div>
                ) : (
                  <div className="ucdp-news-list">
                    {newsArticles.map((article, i) => (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ucdp-news-card"
                      >
                        {article.urlToImage && (
                          <img src={article.urlToImage} alt="" className="ucdp-news-img" loading="lazy" />
                        )}
                        <div className="ucdp-news-body">
                          <span className="ucdp-news-source">{typeof article.source === 'object' ? article.source.name : article.source}</span>
                          <h5 className="ucdp-news-title">{article.title}</h5>
                          {article.description && (
                            <p className="ucdp-news-desc">{article.description.slice(0, 120)}...</p>
                          )}
                          <div className="ucdp-news-footer">
                            <span>{new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                            <ExternalLink size={10} />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConflictDetailCard;
