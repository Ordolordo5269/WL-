import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Skull, Shield, Users2, Crosshair, Globe, TrendingUp } from 'lucide-react';
import { useConflictDetail } from './useConflictDetail';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'casualties'>('overview');
  const { data: detail } = useConflictDetail(conflict.slug);

  const ucdpEvents: UcdpEvent[] = (detail as ConflictDetail)?.ucdpEvents ?? [];
  const casualties = detail?.casualties ?? conflict.casualties ?? [];

  // PRIMARY stat: total deaths from casualty aggregates (complete, not limited by take:100)
  const totalDeathsFromCasualties = casualties.reduce((s, c) => s + c.total, 0);

  // Side breakdown from loaded UCDP events (may be partial if >100 events)
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

  // Use casualty aggregate as the authoritative total (covers ALL events, not just loaded ones)
  const totalDeaths = totalDeathsFromCasualties > 0
    ? totalDeathsFromCasualties
    : deathsBySide.best;

  // Event count from _count if available (actual DB count, not limited by take:100)
  const totalEventCount = (detail as any)?._count?.ucdpEvents ?? ucdpEvents.length;

  const [eventsPage, setEventsPage] = useState(0);
  const EVENTS_PER_PAGE = 30;
  const pagedEvents = ucdpEvents.slice(eventsPage * EVENTS_PER_PAGE, (eventsPage + 1) * EVENTS_PER_PAGE);
  const totalEventsPages = Math.ceil(ucdpEvents.length / EVENTS_PER_PAGE);

  const severity = statusToSeverity(conflict.status);
  const color = severityColor(severity);

  const sideAName = cleanActorName(conflict.sideA || 'Side A');
  const sideBName = cleanActorName(conflict.sideB || 'Side B');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: `Events (${totalEventCount})` },
    { id: 'casualties', label: 'Casualties' },
  ] as const;

  return (
    <div className="conflict-detail-view">
      {/* Header — badges row with back button at right end */}
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

      {/* Sides — the primary visual identity */}
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

      {/* Quick stats */}
      <div className="ucdp-quick-stats">
        <div className="ucdp-quick-stat">
          <Skull size={14} style={{ color: '#ef4444' }} />
          <div>
            <div className="ucdp-quick-stat-value">{totalDeaths.toLocaleString()}</div>
            <div className="ucdp-quick-stat-label">Deaths</div>
          </div>
        </div>
        <div className="ucdp-quick-stat">
          <Crosshair size={14} style={{ color: '#f97316' }} />
          <div>
            <div className="ucdp-quick-stat-value">{totalEventCount}</div>
            <div className="ucdp-quick-stat-label">Events</div>
          </div>
        </div>
        <div className="ucdp-quick-stat">
          <Globe size={14} style={{ color: '#3b82f6' }} />
          <div>
            <div className="ucdp-quick-stat-value">{conflict.involvedISO?.length ?? 0}</div>
            <div className="ucdp-quick-stat-label">Countries</div>
          </div>
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
            {/* ── OVERVIEW ── */}
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

            {/* ── EVENTS ── */}
            {activeTab === 'events' && (
              <div>
                {ucdpEvents.length === 0 ? (
                  <div className="conflict-tracker-empty">
                    <Crosshair size={18} />
                    <p>No UCDP events loaded yet</p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                      {ucdpEvents.length} events — Page {eventsPage + 1}/{totalEventsPages}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pagedEvents.map(ev => {
                        const hasHeadline = ev.sourceHeadline && ev.sourceHeadline.length > 5;
                        const canFly = ev.latitude && ev.longitude && onCenterMap;
                        return (
                          <div
                            key={ev.id}
                            className={`ucdp-event-card${canFly ? ' clickable' : ''}`}
                            onClick={() => canFly && onCenterMap!({ lat: ev.latitude, lng: ev.longitude })}
                          >
                            <div className="ucdp-event-header">
                              <span className="ucdp-event-date">
                                {new Date(ev.dateStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                              {ev.bestEstimate > 0 && (
                                <span className="ucdp-event-deaths">
                                  <Skull size={11} /> {ev.bestEstimate}
                                  {ev.highEstimate > ev.bestEstimate && (
                                    <span style={{ color: '#64748b', fontWeight: 400 }}> ({ev.lowEstimate}–{ev.highEstimate})</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Source headline as title if available */}
                            {hasHeadline && (
                              <div className="ucdp-event-headline">
                                {ev.sourceHeadline!.split(';')[0].substring(0, 120)}
                              </div>
                            )}

                            {ev.whereDescription && (
                              <div className="ucdp-event-location">
                                <MapPin size={11} /> {ev.whereDescription}{ev.adm1 ? `, ${ev.adm1}` : ''}
                              </div>
                            )}

                            {ev.bestEstimate > 0 && (
                              <div className="ucdp-event-breakdown">
                                {ev.deathsA > 0 && <span className="ucdp-death-a">{sideAName.split(' ').slice(-1)[0]}: {ev.deathsA}</span>}
                                {ev.deathsB > 0 && <span className="ucdp-death-b">{sideBName.split(' ').slice(-1)[0]}: {ev.deathsB}</span>}
                                {ev.deathsCivilians > 0 && <span className="ucdp-death-civ">Civ: {ev.deathsCivilians}</span>}
                                {ev.deathsUnknown > 0 && <span className="ucdp-death-unk">Unk: {ev.deathsUnknown}</span>}
                              </div>
                            )}

                            <div className="ucdp-event-dyad">{cleanActorName(ev.sideA)} vs {cleanActorName(ev.sideB)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {totalEventsPages > 1 && (
                      <div className="conflict-pagination" style={{ marginTop: '10px' }}>
                        <button onClick={() => setEventsPage(p => Math.max(0, p - 1))} disabled={eventsPage === 0} className="pagination-btn">Prev</button>
                        <span className="pagination-info">{eventsPage + 1} / {totalEventsPages}</span>
                        <button onClick={() => setEventsPage(p => p + 1)} disabled={eventsPage >= totalEventsPages - 1} className="pagination-btn">Next</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CASUALTIES ── */}
            {activeTab === 'casualties' && (
              <div>
                {/* Deaths by side with real actor names */}
                <div className="ucdp-section">
                  <h4 className="ucdp-section-title">Deaths by Side</h4>
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
                      {/* Total with range */}
                      <div className="ucdp-casualty-total">
                        <span>Best estimate: <strong>{deathsBySide.best.toLocaleString()}</strong></span>
                        {deathsBySide.high > deathsBySide.best && (
                          <span className="ucdp-casualty-range">
                            Range: {deathsBySide.low.toLocaleString()} – {deathsBySide.high.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="ucdp-casualties-bars">
                      {casualties.length > 0 ? (
                        <>
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
                        </>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#64748b' }}>No casualty data available</p>
                      )}
                    </div>
                  )}
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConflictDetailCard;
