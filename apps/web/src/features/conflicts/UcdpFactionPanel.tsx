import React from 'react';
import { MapPin, Skull, Swords, AlertTriangle } from 'lucide-react';
import type { UcdpCandidateProfile } from './types';
import { violenceTypeColor } from './types';

interface Props {
  profile: UcdpCandidateProfile;
  onFlyTo?: (coords: { lat: number; lng: number }) => void;
}

const TYPE_LABEL: Record<number, string> = { 1: 'State-based', 2: 'Non-state', 3: 'One-sided' };
const TYPE_COLOR: Record<number, string> = { 1: '#ef4444', 2: '#f97316', 3: '#a855f7' };

function ViolenceBar({ pct, type }: { pct: number; type: number }) {
  if (pct === 0) return null;
  return (
    <div className="ucdp-vbar-row">
      <span className="ucdp-vbar-label" style={{ color: TYPE_COLOR[type] }}>
        {TYPE_LABEL[type]}
      </span>
      <div className="ucdp-vbar-track">
        <div
          className="ucdp-vbar-fill"
          style={{ width: `${pct}%`, background: TYPE_COLOR[type] }}
        />
      </div>
      <span className="ucdp-vbar-pct">{pct}%</span>
    </div>
  );
}

const UcdpFactionPanel: React.FC<Props> = ({ profile, onFlyTo }) => {
  const { violenceProfile, factions, hotspots, totalEvents, totalDeaths, latestDate } = profile;

  return (
    <div className="ucdp-faction-panel">

      {/* Header strip */}
      <div className="ucdp-faction-header">
        <span className="ucdp-faction-source-badge">UCDP 2026 · Candidate data</span>
        <span className="ucdp-faction-latest">
          Last event: {new Date(latestDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Summary counts */}
      <div className="ucdp-faction-summary">
        <div className="ucdp-faction-stat">
          <Swords size={13} style={{ color: '#f97316' }} />
          <span className="ucdp-faction-stat-value">{totalEvents}</span>
          <span className="ucdp-faction-stat-label">events in 2026</span>
        </div>
        <div className="ucdp-faction-stat">
          <Skull size={13} style={{ color: '#ef4444' }} />
          <span className="ucdp-faction-stat-value">{totalDeaths.toLocaleString()}</span>
          <span className="ucdp-faction-stat-label">deaths recorded</span>
        </div>
      </div>

      {/* Violence profile */}
      <div className="ucdp-section">
        <h4 className="ucdp-section-title">Violence Profile</h4>
        <div className="ucdp-vbar-container">
          <ViolenceBar pct={violenceProfile.stateBasedPct} type={1} />
          <ViolenceBar pct={violenceProfile.nonStatePct}   type={2} />
          <ViolenceBar pct={violenceProfile.oneSidedPct}   type={3} />
        </div>
      </div>

      {/* Active factions */}
      <div className="ucdp-section">
        <h4 className="ucdp-section-title">Active Factions (2026)</h4>
        <div className="ucdp-factions-list">
          {factions.slice(0, 6).map(f => (
            <div key={`${f.role}-${f.id}`} className="ucdp-faction-row">
              <div className="ucdp-faction-row-header">
                <span
                  className={`ucdp-faction-role-badge ${f.role === 'side_a' ? 'role-a' : 'role-b'}`}
                >
                  {f.role === 'side_a' ? 'A' : 'B'}
                </span>
                <span className={`ucdp-faction-name${f.isXxx ? ' ucdp-faction-xxx' : ''}`}>
                  {f.isXxx && <AlertTriangle size={11} style={{ marginRight: 3, color: '#94a3b8' }} />}
                  {f.name}
                </span>
                <span className="ucdp-faction-events">{f.events} ev.</span>
              </div>

              {f.deathsInflicted > 0 && (
                <div className="ucdp-faction-deaths">
                  <Skull size={10} style={{ color: '#ef444488' }} />
                  {f.deathsInflicted} deaths inflicted
                </div>
              )}

              {f.zones.length > 0 && (
                <div className="ucdp-faction-zones">
                  <MapPin size={10} style={{ color: '#64748b' }} />
                  {f.zones.slice(0, 3).join(' · ')}
                  {f.zones.length > 3 && <span style={{ color: '#475569' }}> +{f.zones.length - 3}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hotspot zones */}
      {hotspots.length > 0 && (
        <div className="ucdp-section">
          <h4 className="ucdp-section-title">Active Zones</h4>
          <div className="ucdp-hotspot-list">
            {hotspots.slice(0, 7).map((hs, i) => (
              <div
                key={hs.adm1 + i}
                className={`ucdp-hotspot-row${onFlyTo ? ' clickable' : ''}`}
                onClick={() => hs.lat && hs.lng && onFlyTo?.({ lat: hs.lat, lng: hs.lng })}
              >
                <span className="ucdp-hotspot-rank">#{i + 1}</span>
                <div className="ucdp-hotspot-info">
                  <span className="ucdp-hotspot-name">
                    <MapPin size={10} />
                    {hs.adm1 || 'Unknown zone'}
                    {hs.adm2 && <span style={{ color: '#64748b' }}> · {hs.adm2}</span>}
                  </span>
                  <div className="ucdp-hotspot-meta">
                    <span
                      className="ucdp-hotspot-type-dot"
                      style={{ background: TYPE_COLOR[hs.dominantType] }}
                    />
                    <span className="ucdp-hotspot-events">{hs.events} events</span>
                    {hs.deaths > 0 && (
                      <span className="ucdp-hotspot-deaths">· {hs.deaths} deaths</span>
                    )}
                  </div>
                </div>
                <div className="ucdp-hotspot-bar-wrap">
                  <div
                    className="ucdp-hotspot-bar"
                    style={{
                      width: `${Math.round((hs.events / hotspots[0].events) * 100)}%`,
                      background: violenceTypeColor(hs.dominantType),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default UcdpFactionPanel;
