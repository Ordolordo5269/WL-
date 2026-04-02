import React, { useMemo, useState } from 'react';
import { Crosshair, ArrowLeft, Zap, ZapOff } from 'lucide-react';
import type { ConflictSummary, ConflictFeature, ConflictSeverity } from './types';

const SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

type FilterTab = 'all' | 'active' | 'inactive';

// ── Country list item ─────────────────────────────────────
function CountryItem({
  summary,
  isSelected,
  onClick,
}: {
  summary: ConflictSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="conflict-country-item"
      style={{
        background: isSelected ? 'rgba(59,130,246,0.12)' : 'transparent',
        borderLeft: `3px solid ${SEVERITY_COLORS[summary.severity]}`,
      }}
    >
      <div className="conflict-country-header">
        <span
          className="conflict-severity-dot"
          style={{ background: SEVERITY_COLORS[summary.severity] }}
        />
        <span className="conflict-country-name">{summary.country}</span>
        <span
          className={`conflict-status-badge ${summary.active ? 'active' : 'inactive'}`}
        >
          {summary.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="conflict-country-stats">
        <span>{summary.totalEvents} events</span>
        <span>·</span>
        <span style={{ color: SEVERITY_COLORS[summary.severity], fontWeight: 600 }}>
          {summary.totalFatalities} fatalities
        </span>
      </div>
    </button>
  );
}

// ── Event detail ──────────────────────────────────────────
function EventItem({
  event,
  isSelected,
  onClick,
}: {
  event: ConflictFeature;
  isSelected: boolean;
  onClick: () => void;
}) {
  const p = event.properties;
  return (
    <button
      onClick={onClick}
      className="conflict-event-item"
      style={{
        background: isSelected ? 'rgba(59,130,246,0.10)' : 'transparent',
        borderLeft: `2px solid ${SEVERITY_COLORS[p.severity]}`,
      }}
    >
      <div className="conflict-event-header">
        <span
          className="conflict-severity-dot"
          style={{ background: SEVERITY_COLORS[p.severity], width: 6, height: 6 }}
        />
        <span className="conflict-event-type">{p.subEventType}</span>
        <span className="conflict-event-date">{p.date}</span>
      </div>
      <div className="conflict-event-actors">
        <span className="conflict-actor" title={p.actor1}>{p.actor1}</span>
        {p.actor2 && (
          <>
            <span className="conflict-vs">vs</span>
            <span className="conflict-actor" title={p.actor2}>{p.actor2}</span>
          </>
        )}
      </div>
      <div className="conflict-event-meta">
        <span>{p.region}</span>
        <span>·</span>
        <span style={{ color: SEVERITY_COLORS[p.severity], fontWeight: 600 }}>
          {p.fatalities} fatalities
        </span>
      </div>
    </button>
  );
}

// ── Main panel (full sidebar) ────────────────────────────
interface ConflictPanelProps {
  summaries: ConflictSummary[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
  countryEvents: ConflictFeature[];
  selectedEvent: ConflictFeature | null;
  onSelectEvent: (event: ConflictFeature | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
  isLoading: boolean;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  onBack: () => void;
}

export default function ConflictPanel({
  summaries,
  selectedCountry,
  onSelectCountry,
  countryEvents,
  selectedEvent,
  onSelectEvent,
  onFlyTo,
  isLoading,
  enabled,
  onToggle,
  onBack,
}: ConflictPanelProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const totalEvents = useMemo(() => summaries.reduce((a, s) => a + s.totalEvents, 0), [summaries]);
  const totalFatalities = useMemo(() => summaries.reduce((a, s) => a + s.totalFatalities, 0), [summaries]);
  const activeCount = useMemo(() => summaries.filter((s) => s.active).length, [summaries]);
  const inactiveCount = useMemo(() => summaries.filter((s) => !s.active).length, [summaries]);

  const filteredSummaries = useMemo(() => {
    if (filterTab === 'active') return summaries.filter((s) => s.active);
    if (filterTab === 'inactive') return summaries.filter((s) => !s.active);
    return summaries;
  }, [summaries, filterTab]);

  return (
    <div className="conflict-sidebar">
      {/* ── Header ── */}
      <div className="conflict-sidebar-header">
        <button className="conflict-sidebar-back" onClick={onBack} title="Back to menu">
          <ArrowLeft size={18} />
        </button>
        <div className="conflict-sidebar-title-group">
          <div className="conflict-sidebar-icon">
            <Crosshair size={20} />
          </div>
          <div>
            <h2 className="conflict-sidebar-title">Conflict Tracker</h2>
            <p className="conflict-sidebar-subtitle">Armed conflicts worldwide (ACLED)</p>
          </div>
        </div>
        <button
          className={`toggle-switch ${enabled ? 'on' : ''}`}
          onClick={() => onToggle(!enabled)}
          aria-label="Toggle conflicts"
        />
      </div>

      {/* ── Content ── */}
      {!enabled ? (
        <div className="conflict-disabled-msg">
          <Crosshair size={32} strokeWidth={1.5} />
          <span>Enable the toggle to load conflict data from ACLED.</span>
        </div>
      ) : isLoading ? (
        <div className="conflict-panel-loading">
          <div className="conflict-spinner" />
          <span>Loading ACLED data...</span>
        </div>
      ) : selectedCountry ? (
        /* ── Country detail view ── */
        <div className="conflict-panel conflict-panel-scrollable">
          <button className="conflict-back-btn" onClick={() => onSelectCountry(null)}>
            <ArrowLeft size={14} />
            Back to countries
          </button>

          {(() => {
            const summary = summaries.find((s) => s.country === selectedCountry);
            return summary ? (
              <div className="conflict-country-detail-header">
                <span
                  className="conflict-severity-dot"
                  style={{ background: SEVERITY_COLORS[summary.severity], width: 10, height: 10 }}
                />
                <span className="conflict-detail-country-name">{selectedCountry}</span>
                <span
                  className={`conflict-status-badge ${summary.active ? 'active' : 'inactive'}`}
                >
                  {summary.active ? 'Active' : 'Inactive'}
                </span>
                <span className="conflict-detail-stats">
                  {summary.totalEvents} events · {summary.totalFatalities} fatalities
                </span>
              </div>
            ) : null;
          })()}

          <div className="conflict-events-list">
            {countryEvents.map((event) => (
              <EventItem
                key={event.properties.id}
                event={event}
                isSelected={selectedEvent?.properties.id === event.properties.id}
                onClick={() => {
                  onSelectEvent(event);
                  const [lng, lat] = event.geometry.coordinates;
                  onFlyTo(lat, lng);
                }}
              />
            ))}
            {countryEvents.length === 0 && (
              <div className="conflict-empty">No events found for this country.</div>
            )}
          </div>
        </div>
      ) : (
        /* ── Country list view ── */
        <div className="conflict-panel conflict-panel-scrollable">
          {/* Stats */}
          <div className="conflict-global-stats">
            <div className="conflict-stat-box">
              <span className="conflict-stat-value">{totalEvents.toLocaleString()}</span>
              <span className="conflict-stat-label">Events</span>
            </div>
            <div className="conflict-stat-box">
              <span className="conflict-stat-value" style={{ color: '#ef4444' }}>
                {totalFatalities.toLocaleString()}
              </span>
              <span className="conflict-stat-label">Fatalities</span>
            </div>
            <div className="conflict-stat-box">
              <span className="conflict-stat-value">{summaries.length}</span>
              <span className="conflict-stat-label">Countries</span>
            </div>
          </div>

          {/* Legend */}
          <div className="conflict-legend-row">
            {(['critical', 'high', 'medium', 'low'] as ConflictSeverity[]).map((s) => (
              <span key={s} className="conflict-legend-item">
                <span className="conflict-severity-dot" style={{ background: SEVERITY_COLORS[s], width: 8, height: 8 }} />
                {SEVERITY_LABELS[s]}
              </span>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="conflict-filter-tabs">
            <button
              className={`conflict-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({summaries.length})
            </button>
            <button
              className={`conflict-filter-tab ${filterTab === 'active' ? 'active' : ''}`}
              onClick={() => setFilterTab('active')}
            >
              <Zap size={12} /> Active ({activeCount})
            </button>
            <button
              className={`conflict-filter-tab ${filterTab === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterTab('inactive')}
            >
              <ZapOff size={12} /> Inactive ({inactiveCount})
            </button>
          </div>

          {/* Country list */}
          <div className="conflict-countries-list">
            {filteredSummaries.map((summary) => (
              <CountryItem
                key={summary.country}
                summary={summary}
                isSelected={selectedCountry === summary.country}
                onClick={() => {
                  onSelectCountry(summary.country);
                  onFlyTo(summary.lat, summary.lng);
                }}
              />
            ))}
            {filteredSummaries.length === 0 && (
              <div className="conflict-empty">
                {filterTab === 'active'
                  ? 'No active conflicts found.'
                  : filterTab === 'inactive'
                  ? 'No inactive conflicts found.'
                  : 'No conflict data available.'}
              </div>
            )}
          </div>

          <div className="conflict-source">
            Source: <a href="https://acleddata.com" target="_blank" rel="noopener noreferrer">ACLED</a> · Battles · Most recent data
          </div>
        </div>
      )}
    </div>
  );
}
