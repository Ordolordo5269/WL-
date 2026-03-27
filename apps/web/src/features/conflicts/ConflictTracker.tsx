import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Calendar, Skull, MapPin, X, Shield, Users2, ChevronDown, ChevronUp } from 'lucide-react';
import { useConflicts } from './useConflicts';
import { useConflictWebSocket } from './useConflictWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import ConflictDetailCard from './ConflictDetailCard';
import type { ConflictV2, ConflictFiltersParams } from './types';
import { statusLabel, severityColor, statusToSeverity, violenceTypeLabel, violenceTypeColor } from './types';

interface ConflictTrackerProps {
  onBack: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onConflictSelect?: (conflictId: string | null) => void;
  onConflictsChange?: (conflicts: ConflictV2[]) => void;
}

function cleanText(s: string): string {
  return s.replace(/XXX\d*/g, 'Undisclosed').trim();
}
function cleanActorName(name: string): string {
  if (/^XXX\d*$/.test(name.trim())) return 'Undisclosed actor';
  return cleanText(name);
}
function getDeaths(c: ConflictV2): number {
  return c.casualties?.reduce((s, cas) => s + cas.total, 0) ?? 0;
}

const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Middle East'];
const TYPES = [
  { value: 1, label: 'State' },
  { value: 2, label: 'Non-state' },
  { value: 3, label: 'One-sided' },
];

export default function ConflictTracker({ onBack, onCenterMap, onConflictSelect, onConflictsChange }: ConflictTrackerProps) {
  const [filters, setFilters] = useState<ConflictFiltersParams>({ dataSource: 'ucdp' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConflict, setSelectedConflict] = useState<ConflictV2 | null>(null);
  const [showMinor, setShowMinor] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useConflicts(filters);
  const conflicts = data?.conflicts ?? [];

  useConflictWebSocket(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conflicts'] });
  }, [queryClient]));

  const { major, minor, totalDeaths, filteredCount } = useMemo(() => {
    let filtered = conflicts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = conflicts.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        (c.sideA && c.sideA.toLowerCase().includes(q)) ||
        (c.sideB && c.sideB.toLowerCase().includes(q))
      );
    }
    const sorted = [...filtered].sort((a, b) => getDeaths(b) - getDeaths(a));
    const majorList: ConflictV2[] = [];
    const minorList: ConflictV2[] = [];
    let deaths = 0;
    for (const c of sorted) {
      const d = getDeaths(c);
      deaths += d;
      if (d > 10) majorList.push(c); else minorList.push(c);
    }
    return { major: majorList, minor: minorList, totalDeaths: deaths, filteredCount: sorted.length };
  }, [conflicts, searchQuery]);

  // Sync filtered conflicts to map
  useEffect(() => {
    onConflictsChange?.(major.concat(minor));
  }, [major, minor, onConflictsChange]);

  const handleConflictClick = (conflict: ConflictV2) => {
    setSelectedConflict(conflict);
    onConflictSelect?.(conflict.id);
    onCenterMap?.(conflict.coordinates);
  };

  const handleBack = () => {
    setSelectedConflict(null);
    onConflictSelect?.(null);
  };

  const toggleType = (t: number) => {
    setFilters(prev => {
      const next = { ...prev };
      if (next.typeOfViolence === t) delete next.typeOfViolence;
      else next.typeOfViolence = t;
      return next;
    });
  };

  const toggleRegion = (r: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (next.region === r) delete next.region;
      else next.region = r;
      return next;
    });
  };

  const maxDeaths = major.length > 0 ? getDeaths(major[0]) : 1;
  const hasFilters = !!filters.region || !!filters.typeOfViolence || !!searchQuery;

  if (isLoading) {
    return (
      <motion.div className="conflict-tracker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="conflict-tracker-header">
          <h1 className="conflict-tracker-title">CONFLICT TRACKER</h1>
          <button onClick={onBack} className="conflict-tracker-close-btn"><X className="h-5 w-5" /></button>
        </div>
        <div className="conflict-tracker-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8' }}>Loading...</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="conflict-tracker"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header with inline filters */}
      <div className="conflict-tracker-header">
        <h1 className="conflict-tracker-title">CONFLICT TRACKER</h1>
        <button onClick={onBack} className="conflict-tracker-close-btn"><X className="h-5 w-5" /></button>
      </div>

      {!selectedConflict && (
        <div className="ucdp-filters-bar">
          {/* Type chips */}
          <div className="ucdp-chips">
            {TYPES.map(t => (
              <button
                key={t.value}
                className={`ucdp-chip${filters.typeOfViolence === t.value ? ' active' : ''}`}
                style={filters.typeOfViolence === t.value ? { borderColor: violenceTypeColor(t.value), color: violenceTypeColor(t.value) } : undefined}
                onClick={() => toggleType(t.value)}
              >
                {t.label}
              </button>
            ))}
            <span className="ucdp-chip-sep" />
            {/* Region chips */}
            {REGIONS.map(r => (
              <button
                key={r}
                className={`ucdp-chip${filters.region === r ? ' active' : ''}`}
                onClick={() => toggleRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
          {/* Search */}
          <input
            type="text"
            className="ucdp-inline-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {/* Stats line */}
          <div className="ucdp-stats-line">
            <span>{filteredCount} conflicts</span>
            <span>{totalDeaths.toLocaleString()} deaths</span>
            {hasFilters && (
              <button className="ucdp-clear-btn" onClick={() => { setFilters({ dataSource: 'ucdp' }); setSearchQuery(''); }}>Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Conflict feed */}
      <div className="conflict-tracker-content">
        {selectedConflict ? (
          <ConflictDetailCard conflict={selectedConflict} onBack={handleBack} onCenterMap={onCenterMap} />
        ) : error ? (
          <div className="conflict-tracker-empty">
            <AlertTriangle size={20} style={{ color: '#fca5a5' }} />
            <p style={{ color: '#fca5a5' }}>Error loading data</p>
          </div>
        ) : filteredCount === 0 ? (
          <div className="conflict-tracker-empty">
            <AlertTriangle size={20} />
            <p>No conflicts found</p>
          </div>
        ) : (
          <>
            {major.map((conflict) => {
              const deaths = getDeaths(conflict);
              const severity = statusToSeverity(conflict.status);
              const color = severityColor(severity);
              const heatPct = Math.max(3, (deaths / maxDeaths) * 100);

              return (
                <motion.div
                  key={conflict.id}
                  className="conflict-card"
                  onClick={() => handleConflictClick(conflict)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="ucdp-heat-bar" style={{ width: `${heatPct}%`, background: color }} />
                  <div className="conflict-card-header">
                    <span className="conflict-card-status" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                      {statusLabel(conflict.status)}
                    </span>
                    {conflict.typeOfViolence && (
                      <span className="ucdp-violence-badge" style={{ color: violenceTypeColor(conflict.typeOfViolence) }}>
                        {violenceTypeLabel(conflict.typeOfViolence)}
                      </span>
                    )}
                    <span className="ucdp-deaths-badge"><Skull size={11} /> {deaths.toLocaleString()}</span>
                  </div>
                  <div className="conflict-card-name">{cleanText(conflict.name)}</div>
                  {conflict.sideA && conflict.sideB && (
                    <div className="ucdp-sides">
                      <span className="ucdp-side-a"><Shield size={11} /> {cleanActorName(conflict.sideA)}</span>
                      <span className="ucdp-vs">vs</span>
                      <span className="ucdp-side-b"><Users2 size={11} /> {cleanActorName(conflict.sideB)}</span>
                    </div>
                  )}
                  <div className="conflict-card-meta">
                    <span><MapPin size={13} /> {conflict.country}</span>
                    <span><Calendar size={13} /> {new Date(conflict.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </motion.div>
              );
            })}

            {minor.length > 0 && (
              <div className="ucdp-minor-section">
                <button className="ucdp-minor-toggle" onClick={() => setShowMinor(!showMinor)}>
                  {showMinor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Minor conflicts ({minor.length})</span>
                </button>
                {showMinor && minor.map((conflict) => {
                  const deaths = getDeaths(conflict);
                  const color = severityColor(statusToSeverity(conflict.status));
                  return (
                    <motion.div key={conflict.id} className="conflict-card conflict-card-minor" onClick={() => handleConflictClick(conflict)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="conflict-card-header">
                        <span className="conflict-card-status" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>{statusLabel(conflict.status)}</span>
                        <span className="ucdp-deaths-badge">{deaths}</span>
                      </div>
                      <div className="conflict-card-name">{cleanText(conflict.name)}</div>
                      <div className="conflict-card-meta"><span><MapPin size={12} /> {conflict.country}</span></div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="conflict-tracker-footer">
        <p className="footer-text">
          Source: <a href="https://ucdp.uu.se/" target="_blank" rel="noreferrer" className="footer-sources">UCDP</a> — Uppsala Conflict Data Program
        </p>
      </div>
    </motion.div>
  );
}
