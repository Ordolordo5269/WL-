import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, MapPin, Skull, Calendar, ChevronLeft, ChevronRight,
  Crosshair, Flame, Shield, Megaphone, Zap, ArrowLeft,
  Clock, Filter, BarChart3
} from 'lucide-react';
import type { AcledConflict, AcledEvent } from '../../types';
import ConflictService from './services/conflict-service';
import * as api from './services/conflict-api';

interface ConflictTrackerProps {
  onBack: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onConflictSelect?: (conflictId: string | null) => void;
}

// ── Event type icon ──
function EventIcon({ type }: { type: string }) {
  const size = 14;
  switch (type) {
    case 'Battles': return <Crosshair size={size} />;
    case 'Explosions/Remote violence': return <Flame size={size} />;
    case 'Violence against civilians': return <Skull size={size} />;
    case 'Riots': return <Zap size={size} />;
    case 'Protests': return <Megaphone size={size} />;
    case 'Strategic developments': return <Shield size={size} />;
    default: return <BarChart3 size={size} />;
  }
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="ct-status-badge"
      style={{ backgroundColor: ConflictService.statusColor(status) + '20', color: ConflictService.statusColor(status), borderColor: ConflictService.statusColor(status) + '40' }}
    >
      {ConflictService.statusLabel(status)}
    </span>
  );
}

// ── Event card ──
function EventCard({ event }: { event: AcledEvent }) {
  const color = ConflictService.eventTypeColor(event.eventType);
  return (
    <div className="ct-event-card">
      <div className="ct-event-header">
        <span className="ct-event-type" style={{ color }}>
          <EventIcon type={event.eventType} />
          {event.subEventType}
        </span>
        {event.fatalities > 0 && (
          <span className="ct-event-fatalities">
            <Skull size={12} /> {event.fatalities}
          </span>
        )}
      </div>
      <div className="ct-event-actors">
        <span className="ct-actor">{event.actor1}</span>
        {event.actor2 && (
          <>
            <span className="ct-vs">vs</span>
            <span className="ct-actor">{event.actor2}</span>
          </>
        )}
      </div>
      {event.notes && (
        <p className="ct-event-notes">{event.notes.length > 200 ? event.notes.slice(0, 200) + '...' : event.notes}</p>
      )}
      <div className="ct-event-meta">
        <span><Calendar size={11} /> {new Date(event.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span><MapPin size={11} /> {event.location || event.admin1 || event.country}</span>
        {event.timePrecision > 1 && <span className="ct-approx">~approx</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════

export default function ConflictTracker({ onBack, onCenterMap, onConflictSelect }: ConflictTrackerProps) {
  // ── State ──
  const [conflicts, setConflicts] = useState<AcledConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<api.ConflictDetail | null>(null);
  const [events, setEvents] = useState<AcledEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);

  const LIMIT = 25;
  const EVENTS_LIMIT = 30;

  // ── View mode ──
  type View = 'list' | 'detail';
  const [view, setView] = useState<View>('list');

  // ── Date range helper ──
  const getDateFrom = useCallback(() => {
    if (dateRange === 'all') return undefined;
    const d = new Date();
    if (dateRange === '7d') d.setDate(d.getDate() - 7);
    if (dateRange === '30d') d.setDate(d.getDate() - 30);
    if (dateRange === '90d') d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  }, [dateRange]);

  // ── Load conflicts ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getConflicts({
          region: regionFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          limit: LIMIT,
        });
        if (!cancelled) {
          setConflicts(res.data);
          setTotal(res.count);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load conflicts');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [regionFilter, statusFilter, search, page]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [regionFilter, statusFilter, search]);

  // ── Load events for selected conflict ──
  useEffect(() => {
    if (!selectedConflict) return;
    let cancelled = false;
    (async () => {
      try {
        setEventsLoading(true);
        const res = await api.getConflictEvents(selectedConflict.slug, {
          eventType: eventTypeFilter || undefined,
          dateFrom: getDateFrom(),
          page: eventsPage,
          limit: EVENTS_LIMIT,
        });
        if (!cancelled) {
          setEvents(res.data);
          setEventsTotal(res.count);
          setEventsLoading(false);
        }
      } catch {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedConflict, eventTypeFilter, dateRange, eventsPage, getDateFrom]);

  // ── Select conflict ──
  const handleSelect = async (c: AcledConflict) => {
    const detail = await api.getConflictBySlug(c.slug);
    if (detail) {
      setSelectedConflict(detail);
      setView('detail');
      setEventsPage(1);
      setEventTypeFilter('');
      setDateRange('30d');
      onConflictSelect?.(c.slug);
      onCenterMap?.(c.coordinates);
    }
  };

  const handleBack = () => {
    setSelectedConflict(null);
    setView('list');
    setEvents([]);
    onConflictSelect?.(null);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const eventsTotalPages = Math.ceil(eventsTotal / EVENTS_LIMIT);

  // ══════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════

  return (
    <motion.div
      className="conflict-tracker"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* ── Header ── */}
      <div className="ct-header">
        {view === 'detail' ? (
          <button onClick={handleBack} className="ct-back-btn">
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <h1 className="ct-title">CONFLICT TRACKER</h1>
        )}
        <button onClick={onBack} className="ct-close-btn"><X size={18} /></button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ct-body">
            {/* ── Search ── */}
            <div className="ct-search-row">
              <Search size={14} className="ct-search-icon" />
              <input
                type="text"
                placeholder="Search conflicts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ct-search-input"
              />
            </div>

            {/* ── Filters ── */}
            <div className="ct-filters">
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="ct-select">
                <option value="">All Regions</option>
                {ConflictService.getAvailableRegions().map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ct-select">
                <option value="">All Status</option>
                {ConflictService.getAvailableStatuses().map(s => (
                  <option key={s} value={s}>{ConflictService.statusLabel(s)}</option>
                ))}
              </select>
            </div>

            {/* ── List ── */}
            <div className="ct-list">
              {loading ? (
                <div className="ct-loading"><div className="ct-spinner" /> Loading...</div>
              ) : error ? (
                <div className="ct-empty ct-error">{error}</div>
              ) : conflicts.length === 0 ? (
                <div className="ct-empty">No conflicts found</div>
              ) : (
                <>
                  <div className="ct-list-header">
                    <span>{total} conflict{total !== 1 ? 's' : ''}</span>
                  </div>
                  {conflicts.map(c => (
                    <motion.div
                      key={c.id}
                      className="ct-conflict-card"
                      onClick={() => handleSelect(c)}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="ct-card-top">
                        <span className="ct-card-name">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="ct-card-country">
                        <MapPin size={12} /> {c.country} &middot; {c.region}
                      </div>
                      <div className="ct-card-stats">
                        <span><Skull size={12} /> {ConflictService.formatFatalities(c.totalFatalities)} fatalities</span>
                        <span><BarChart3 size={12} /> {c.totalEvents.toLocaleString()} events</span>
                        {c.lastEventDate && (
                          <span><Clock size={12} /> {new Date(c.lastEventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="ct-pagination">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
                      <span>{page} / {totalPages}</span>
                      <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight size={16} /></button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="ct-footer">Data source: <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer">ACLED</a></div>
          </motion.div>
        ) : selectedConflict && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ct-body">
            {/* ── Conflict header ── */}
            <div className="ct-detail-header">
              <h2 className="ct-detail-name">{selectedConflict.name}</h2>
              <StatusBadge status={selectedConflict.status} />
              <div className="ct-detail-country">
                <MapPin size={13} /> {selectedConflict.country} &middot; {selectedConflict.region}
              </div>
              <p className="ct-detail-desc">{selectedConflict.description}</p>

              {/* Stats row */}
              <div className="ct-detail-stats">
                <div className="ct-stat">
                  <span className="ct-stat-value">{ConflictService.formatFatalities(selectedConflict.totalFatalities)}</span>
                  <span className="ct-stat-label">Fatalities</span>
                </div>
                <div className="ct-stat">
                  <span className="ct-stat-value">{selectedConflict.totalEvents.toLocaleString()}</span>
                  <span className="ct-stat-label">Events</span>
                </div>
                <div className="ct-stat">
                  <span className="ct-stat-value">{new Date(selectedConflict.startDate).getFullYear()}</span>
                  <span className="ct-stat-label">Start</span>
                </div>
              </div>
            </div>

            {/* ── Event filters ── */}
            <div className="ct-event-filters">
              <div className="ct-date-tabs">
                {(['7d', '30d', '90d', 'all'] as const).map(d => (
                  <button
                    key={d}
                    className={`ct-date-tab ${dateRange === d ? 'active' : ''}`}
                    onClick={() => { setDateRange(d); setEventsPage(1); }}
                  >
                    {d === 'all' ? 'All' : d}
                  </button>
                ))}
              </div>
              <select
                value={eventTypeFilter}
                onChange={e => { setEventTypeFilter(e.target.value); setEventsPage(1); }}
                className="ct-select ct-select-sm"
              >
                <option value="">All types</option>
                {ConflictService.getEventTypes().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* ── Events list ── */}
            <div className="ct-events-header">
              <Filter size={13} />
              <span>{eventsTotal} event{eventsTotal !== 1 ? 's' : ''} {dateRange !== 'all' ? `(last ${dateRange})` : ''}</span>
            </div>

            <div className="ct-events-list">
              {eventsLoading ? (
                <div className="ct-loading"><div className="ct-spinner" /> Loading events...</div>
              ) : events.length === 0 ? (
                <div className="ct-empty">No events for this period</div>
              ) : (
                <>
                  {events.map(e => <EventCard key={e.id} event={e} />)}
                  {eventsTotalPages > 1 && (
                    <div className="ct-pagination">
                      <button onClick={() => setEventsPage(p => Math.max(1, p - 1))} disabled={eventsPage === 1}><ChevronLeft size={16} /></button>
                      <span>{eventsPage} / {eventsTotalPages}</span>
                      <button onClick={() => setEventsPage(p => p + 1)} disabled={eventsPage >= eventsTotalPages}><ChevronRight size={16} /></button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="ct-footer">Data source: <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer">ACLED</a></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
