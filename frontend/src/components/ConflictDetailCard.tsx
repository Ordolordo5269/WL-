import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Calendar, Users, Home, Link, Shield, Zap, MapPin, AlertTriangle } from 'lucide-react';
import type { Conflict } from '../src/types';
import ConflictFactions from './ConflictFactions';
import ConflictTimeline from './ConflictTimeline';
import ConflictStats from './ConflictStats';
import {
  fetchConflictEvents,
  fetchTimelineData,
  buildTimeline,
  primaryIsoFromConflict,
  formatFatalities,
  EVENT_TYPE_COLOR,
  type AcledEvent,
  type AcledEventType,
  type AcledTimelineBucket,
} from '../services/acled-api';

interface ConflictDetailCardProps {
  conflict: Conflict;
  onBack?: () => void;
}

const EVENT_TYPES: AcledEventType[] = [
  'Battles',
  'Explosions/Remote violence',
  'Violence against civilians',
  'Protests',
  'Riots',
  'Strategic developments',
];

const ConflictDetailCard: React.FC<ConflictDetailCardProps> = ({ conflict, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'factions' | 'timeline' | 'stats' | 'events'>('overview');

  // ACLED events state
  const [acledEvents, setAcledEvents] = useState<AcledEvent[]>([]);
  const [acledLoading, setAcledLoading] = useState(false);
  const [acledError, setAcledError] = useState<string | null>(null);
  const [acledTotal, setAcledTotal] = useState(0);
  const [acledPage, setAcledPage] = useState(1);
  const [acledTypeFilter, setAcledTypeFilter] = useState<AcledEventType | ''>('');

  // Historical timeline state
  const [acledView, setAcledView] = useState<'list' | 'timeline'>('list');
  const [timelineData, setTimelineData] = useState<AcledTimelineBucket[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const primaryIso = primaryIsoFromConflict(conflict.involvedISO ?? []);

  // Load paginated event list
  useEffect(() => {
    if (activeTab !== 'events' || acledView !== 'list' || !primaryIso) return;

    let cancelled = false;
    setAcledLoading(true);
    setAcledError(null);

    fetchConflictEvents(primaryIso, {
      limit: 25,
      page: acledPage,
      eventType: acledTypeFilter || undefined,
    })
      .then(({ data, count }) => {
        if (!cancelled) {
          setAcledEvents(data);
          setAcledTotal(count);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setAcledError(err.message);
      })
      .finally(() => {
        if (!cancelled) setAcledLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab, acledView, primaryIso, acledPage, acledTypeFilter]);

  // Load timeline data (bulk fetch, cached)
  useEffect(() => {
    if (activeTab !== 'events' || acledView !== 'timeline' || !primaryIso) return;
    if (timelineData.length > 0) return; // already loaded

    let cancelled = false;
    setTimelineLoading(true);

    fetchTimelineData(primaryIso, 20)
      .then(({ timeline }) => {
        if (!cancelled) setTimelineData(timeline);
      })
      .catch(() => { /* silent — list view still works */ })
      .finally(() => { if (!cancelled) setTimelineLoading(false); });

    return () => { cancelled = true; };
  }, [activeTab, acledView, primaryIso, timelineData.length]);

  // Reset page when filter changes
  useEffect(() => {
    setAcledPage(1);
  }, [acledTypeFilter]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'factions', label: 'Factions' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'stats', label: 'Statistics' },
    ...(primaryIso ? [{ id: 'events', label: 'ACLED Events' }] : []),
  ] as const;

  return (
    <div className="conflict-detail-view">
      {/* Header */}
      <div className="conflict-detail-header">
        <h2 className="conflict-detail-title">{conflict.country}</h2>
        {onBack && (
          <button
            onClick={onBack}
            title="Back to conflicts"
            className="conflict-detail-back-btn"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="conflict-tracker-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`conflict-tracker-tab${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <>
                <div className="content-section">
                  <h3 className="section-title">
                    <FileText size={16} />
                    Description
                  </h3>
                  <p className="section-content">{conflict.description}</p>
                </div>

                <div className="content-section">
                  <h3 className="section-title">
                    <Calendar size={16} />
                    Basic Information
                  </h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Start date</span>
                      <span className="stat-value">{new Date(conflict.date).toLocaleDateString('en-GB')}</span>
                    </div>
                    {conflict.startDate && conflict.startDate !== conflict.date && (
                      <div className="stat-item">
                        <span className="stat-label">Conflict started</span>
                        <span className="stat-value">{new Date(conflict.startDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                    {conflict.escalationDate && (
                      <div className="stat-item">
                        <span className="stat-label">Escalation</span>
                        <span className="stat-value">{new Date(conflict.escalationDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="content-section">
                  <h3 className="section-title">
                    <Users size={16} />
                    Impact
                  </h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total casualties</span>
                      <span className="stat-value">{conflict.casualties.toLocaleString('en-GB')}</span>
                    </div>
                    {conflict.displacedPersons && (
                      <div className="stat-item">
                        <span className="stat-label">Displaced persons</span>
                        <span className="stat-value">{conflict.displacedPersons.toLocaleString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Ukraine API Legend - Only show for Russia-Ukraine conflict */}
                {conflict.id === 'russia-ukraine-war' && (
                  <div className="content-section">
                    <h3 className="section-title">
                      <Shield size={16} />
                      Real-time Map Data
                    </h3>
                    <div className="section-content">
                      <p>Live Ukraine frontline data</p>
                      <p>
                        <strong>Source:</strong>{' '}
                        <a 
                          href="https://deepstatemap.live" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="footer-sources"
                        >
                          DeepStateMap
                        </a>
                      </p>
                      
                      {/* Map Legend */}
                      <div className="map-legend">
                        <h4 className="legend-title">Map Legend</h4>
                        <div className="legend-items">
                          <div className="legend-item">
                            <div className="legend-color red"></div>
                            <p className="legend-text">Red: Russian-controlled territories</p>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color blue"></div>
                            <p className="legend-text">Blue: Points of interest</p>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color gray"></div>
                            <p className="legend-text">Lines: Battle fronts</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'factions' && (
              <div className="factions-section">
                <ConflictFactions conflict={conflict} />
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="timeline-section">
                <ConflictTimeline conflict={conflict} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="content-section">
                <h3 className="section-title">
                  <Link size={16} />
                  Detailed Statistics
                </h3>
                <ConflictStats conflict={conflict} />
              </div>
            )}

            {activeTab === 'events' && (
              <div className="content-section">
                <h3 className="section-title">
                  <Zap size={16} />
                  Events — ACLED
                </h3>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {(['list', 'timeline'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setAcledView(v)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: acledView === v ? 700 : 400,
                        borderRadius: '4px',
                        border: `1px solid ${acledView === v ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                        background: acledView === v ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: acledView === v ? '#93c5fd' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {v === 'list' ? 'Event list' : 'Historical timeline'}
                    </button>
                  ))}
                </div>

                {/* Event type filter (list view only) */}
                {acledView === 'list' && (
                <div style={{ marginBottom: '10px' }}>
                  <select
                    value={acledTypeFilter}
                    onChange={(e) => setAcledTypeFilter(e.target.value as AcledEventType | '')}
                    className="conflict-tracker-filter-select"
                    style={{ width: '100%', fontSize: '12px' }}
                  >
                    <option value="">All event types</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                )}

                {acledLoading && (
                  <div className="conflict-tracker-loading">
                    <div style={{ width: '18px', height: '18px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading ACLED events…</p>
                  </div>
                )}

                {acledError && !acledLoading && (
                  <div className="conflict-tracker-empty">
                    <AlertTriangle size={18} strokeWidth={1.5} style={{ color: '#fca5a5' }} />
                    <p style={{ color: '#fca5a5', fontSize: '12px' }}>{acledError}</p>
                  </div>
                )}

                {!acledLoading && !acledError && acledEvents.length === 0 && (
                  <div className="conflict-tracker-empty">
                    <Zap size={18} strokeWidth={1.5} />
                    <p style={{ fontSize: '13px' }}>No events found for this period</p>
                  </div>
                )}

                {!acledLoading && !acledError && acledEvents.length > 0 && (
                  <>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                      Showing {acledEvents.length} of {acledTotal.toLocaleString()} events
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {acledEvents.map((ev) => (
                        <div
                          key={ev.data_id}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: `3px solid ${EVENT_TYPE_COLOR[ev.event_type] ?? '#6b7280'}`,
                            borderRadius: '6px',
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: EVENT_TYPE_COLOR[ev.event_type] ?? '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              {ev.sub_event_type || ev.event_type}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <MapPin size={11} strokeWidth={1.5} style={{ color: '#64748b', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                              {[ev.location, ev.admin1].filter(Boolean).join(', ')}
                            </span>
                          </div>

                          {(ev.actor1 || ev.actor2) && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                              {ev.actor1}{ev.actor2 ? ` vs ${ev.actor2}` : ''}
                            </div>
                          )}

                          {ev.notes && (
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                              {ev.notes.length > 200 ? ev.notes.slice(0, 200) + '…' : ev.notes}
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                            <span style={{ color: parseInt(ev.fatalities) > 0 ? '#fca5a5' : '#64748b' }}>
                              {parseInt(ev.fatalities) > 0 ? `${formatFatalities(ev.fatalities)} fatalities` : 'No fatalities reported'}
                            </span>
                            <span>{ev.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {acledTotal > 25 && (
                      <div className="conflict-pagination" style={{ marginTop: '12px' }}>
                        <button
                          onClick={() => setAcledPage((p) => Math.max(1, p - 1))}
                          disabled={acledPage === 1}
                          className="pagination-btn"
                        >
                          Previous
                        </button>
                        <span className="pagination-info">Page {acledPage}</span>
                        <button
                          onClick={() => setAcledPage((p) => p + 1)}
                          disabled={acledPage * 25 >= acledTotal}
                          className="pagination-btn"
                        >
                          Next
                        </button>
                      </div>
                    )}

                    <p style={{ fontSize: '10px', color: '#475569', marginTop: '10px', textAlign: 'center' }}>
                      Source: <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>ACLED</a>
                    </p>
                  </>
                )}

                {/* ── Historical timeline view ── */}
                {acledView === 'timeline' && (
                  <>
                    {timelineLoading && (
                      <div className="conflict-tracker-loading">
                        <div style={{ width: '18px', height: '18px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading historical data…</p>
                      </div>
                    )}

                    {!timelineLoading && timelineData.length === 0 && (
                      <div className="conflict-tracker-empty">
                        <Zap size={18} strokeWidth={1.5} />
                        <p style={{ fontSize: '13px' }}>No historical data available</p>
                      </div>
                    )}

                    {!timelineLoading && timelineData.length > 0 && (() => {
                      const maxEvents = Math.max(...timelineData.map(b => b.events));
                      const maxFat = Math.max(...timelineData.map(b => b.fatalities), 1);
                      const totalEvents = timelineData.reduce((s, b) => s + b.events, 0);
                      const totalFat = timelineData.reduce((s, b) => s + b.fatalities, 0);

                      return (
                        <>
                          {/* Summary row */}
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                            {[
                              { label: 'Total events', value: totalEvents.toLocaleString() },
                              { label: 'Total fatalities', value: totalFat.toLocaleString() },
                              { label: 'Years covered', value: timelineData.length },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Bar chart — events per year */}
                          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Events per year</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                            {timelineData.map((b) => (
                              <div key={b.period} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', width: '36px', flexShrink: 0 }}>{b.period}</span>
                                <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${(b.events / maxEvents) * 100}%`,
                                    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s ease',
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b', width: '36px', textAlign: 'right', flexShrink: 0 }}>{b.events}</span>
                              </div>
                            ))}
                          </div>

                          {/* Bar chart — fatalities per year */}
                          {totalFat > 0 && (
                            <>
                              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Fatalities per year</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                {timelineData.map((b) => (
                                  <div key={b.period} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', width: '36px', flexShrink: 0 }}>{b.period}</span>
                                    <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${(b.fatalities / maxFat) * 100}%`,
                                        background: 'linear-gradient(90deg, #ef4444, #f97316)',
                                        borderRadius: '3px',
                                        transition: 'width 0.4s ease',
                                      }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', width: '36px', textAlign: 'right', flexShrink: 0 }}>{b.fatalities}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {/* Event type breakdown for all years */}
                          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Event types</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(
                              timelineData.reduce((acc, b) => {
                                Object.entries(b.byType).forEach(([t, n]) => { acc[t] = (acc[t] || 0) + n; });
                                return acc;
                              }, {} as Record<string, number>)
                            )
                              .sort((a, b) => b[1] - a[1])
                              .map(([type, count]) => (
                                <div key={type} style={{
                                  display: 'flex', alignItems: 'center', gap: '5px',
                                  background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '4px 8px',
                                  borderLeft: `3px solid ${EVENT_TYPE_COLOR[type] ?? '#6b7280'}`,
                                }}>
                                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{type}</span>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{count.toLocaleString()}</span>
                                </div>
                              ))}
                          </div>

                          <p style={{ fontSize: '10px', color: '#475569', marginTop: '12px', textAlign: 'center' }}>
                            Source: <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>ACLED</a>
                          </p>
                        </>
                      );
                    })()}
                  </>
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