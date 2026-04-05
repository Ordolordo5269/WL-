import { useMemo } from 'react';
import type { Conflict, ConflictViewState, SupportLink, FactionProfile, Faction, ConflictFaction } from './types';
import { SIDE_COLORS, fmt } from './conflict-map-visualization';
import { ArrowLeft, Crosshair, X, Swords, Shield, DollarSign, MapPin, Users, ExternalLink } from 'lucide-react';
import '../../styles/conflict-tracker.css';

// ── Constants ────────────────────────────────────────

const SIDE_BG: Record<string, string> = {
  A: 'rgba(59, 130, 246, 0.06)',
  B: 'rgba(239, 68, 68, 0.06)',
  C: 'rgba(245, 158, 11, 0.06)',
  D: 'rgba(168, 85, 247, 0.06)',
  E: 'rgba(20, 184, 166, 0.06)',
};
const SUPPORT_COLORS: Record<string, string> = { MILITARY: '#ef4444', DIPLOMATIC: '#3b82f6', ECONOMIC: '#22c55e' };
const SUPPORT_LABELS: Record<string, string> = { MILITARY: 'Military', DIPLOMATIC: 'Diplomatic', ECONOMIC: 'Economic' };
const SUPPORT_ICONS: Record<string, React.ReactNode> = {
  MILITARY: <Swords className="h-3 w-3" />,
  DIPLOMATIC: <Shield className="h-3 w-3" />,
  ECONOMIC: <DollarSign className="h-3 w-3" />,
};

const FACTION_TYPE_LABELS: Record<string, string> = {
  STATE: 'State Actor',
  MILITIA: 'Private Military / Militia',
  REBEL: 'Rebel Group',
  TERRORIST: 'Designated Terrorist Org.',
  OTHER: 'Other',
};
const FACTION_TYPE_SHORT: Record<string, string> = {
  STATE: 'State', MILITIA: 'PMC', REBEL: 'Rebel', TERRORIST: 'Terror', OTHER: 'Other',
};
const FACTION_TYPE_COLORS: Record<string, string> = {
  STATE: '#3b82f6', MILITIA: '#f59e0b', REBEL: '#22c55e', TERRORIST: '#ef4444', OTHER: '#6b7280',
};

const ISO3_NAMES: Record<string, string> = {
  UKR: 'Ukraine', RUS: 'Russia', USA: 'United States', GBR: 'United Kingdom',
  CHN: 'China', IRN: 'Iran', FRA: 'France', MLI: 'Mali', SDN: 'Sudan',
  EGY: 'Egypt', ARE: 'UAE', NER: 'Niger', BFA: 'Burkina Faso', TCD: 'Chad',
  LBY: 'Libya', CAF: 'Central African Republic', MOZ: 'Mozambique',
  SYR: 'Syria', DEU: 'Germany', POL: 'Poland', ITA: 'Italy', ESP: 'Spain',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function isoName(iso: string | null): string {
  if (!iso) return 'Unknown';
  return ISO3_NAMES[iso] ?? iso;
}

/** Auto-generate a human-readable side name from the factions in it */
function inferSideName(factions: ConflictFaction[]): string {
  if (factions.length === 0) return 'Unknown';
  const types = new Set(factions.map((f) => f.faction.type));

  // If all are state actors, name by first faction's country
  if (types.size === 1 && types.has('STATE')) {
    if (factions.length === 1) return factions[0].faction.name;
    return factions.map((f) => isoName(f.faction.countryIso)).join(' & ');
  }
  // Mixed: describe by dominant type
  if (types.has('TERRORIST')) return 'Insurgent Alliance';
  if (types.has('REBEL')) return 'Rebel Forces';
  if (types.has('MILITIA') && types.has('STATE')) return 'Government Coalition';
  if (types.has('MILITIA')) return factions[0].faction.name;
  return factions[0].faction.name;
}

/** Group factions by side, preserving order */
function groupBySide(factions: ConflictFaction[]): { side: string; members: ConflictFaction[] }[] {
  const map = new Map<string, ConflictFaction[]>();
  for (const cf of factions) {
    if (!map.has(cf.side)) map.set(cf.side, []);
    map.get(cf.side)!.push(cf);
  }
  return [...map.entries()].map(([side, members]) => ({ side, members }));
}

// ── Props ────────────────────────────────────────────

interface ConflictTrackerProps {
  onBack: () => void;
  conflicts: Conflict[];
  selectedConflict: Conflict | null;
  selectedFactionId: string | null;
  factionProfile: FactionProfile | null;
  viewState: ConflictViewState;
  loading: boolean;
  onSelectConflict: (id: string) => void;
  onSelectFaction: (factionId: string) => void;
  onOpenFactionProfile: (factionId: string) => void;
  onGoBack: () => void;
}

// ── Main Panel ──────────────────────────────────────

export default function ConflictTracker({
  onBack, conflicts, selectedConflict, selectedFactionId, factionProfile,
  viewState, loading, onSelectConflict, onSelectFaction, onOpenFactionProfile, onGoBack,
}: ConflictTrackerProps) {
  return (
    <div className="ct-panel">
      <div className="ct-panel-header">
        <Crosshair className="h-5 w-5 text-blue-400" />
        <h2 className="ct-panel-title">Conflict Tracker</h2>
        <button className="ct-close" onClick={onBack}><X className="h-5 w-5" /></button>
      </div>

      <div className="ct-panel-body">
        {viewState === 'global' && (
          <GlobalView
            conflicts={conflicts}
            loading={loading}
            onSelectConflict={onSelectConflict}
            onOpenFactionProfile={onOpenFactionProfile}
          />
        )}
        {(viewState === 'conflict' || viewState === 'relationship') && selectedConflict && (
          <DetailView
            conflict={selectedConflict}
            selectedFactionId={selectedFactionId}
            onSelectFaction={onSelectFaction}
            onOpenFactionProfile={onOpenFactionProfile}
            onGoBack={onGoBack}
          />
        )}
        {viewState === 'faction' && factionProfile && (
          <FactionView
            profile={factionProfile}
            onSelectConflict={onSelectConflict}
            onGoBack={onGoBack}
          />
        )}
      </div>
    </div>
  );
}

// ── State 1: Conflict + Faction list ───────────────

function GlobalView({ conflicts, loading, onSelectConflict, onOpenFactionProfile }: {
  conflicts: Conflict[];
  loading: boolean;
  onSelectConflict: (id: string) => void;
  onOpenFactionProfile: (factionId: string) => void;
}) {
  if (loading) return <div className="ct-loading">Loading conflicts...</div>;
  if (conflicts.length === 0) return <div className="ct-empty">No active conflicts found.</div>;

  // Collect unique factions across all conflicts
  const factionMap = new Map<string, { faction: Faction; conflictCount: number }>();
  for (const c of conflicts) {
    for (const cf of c.factions ?? []) {
      const existing = factionMap.get(cf.factionId);
      if (existing) {
        existing.conflictCount++;
      } else {
        factionMap.set(cf.factionId, { faction: cf.faction, conflictCount: 1 });
      }
    }
  }
  const crossConflictFactions = [...factionMap.values()].filter((f) => f.conflictCount >= 2);

  return (
    <div className="ct-list">
      <div className="ct-section-label">Conflicts</div>
      {conflicts.map((c) => {
        const sides = groupBySide(c.factions ?? []);
        return (
          <button key={c.id} className="ct-conflict-card" onClick={() => onSelectConflict(c.id)}>
            <div className="ct-card-header">
              <Crosshair className="h-4 w-4 text-blue-400" />
              <span className="ct-card-name">{c.name}</span>
              <span className={`ct-status ct-status--${c.status.toLowerCase()}`}>{c.status}</span>
            </div>
            <div className="ct-card-meta">
              <span>{c.type.replace(/_/g, ' ')}</span>
              <span className="ct-sep">|</span>
              <span>Since {fmtDate(c.startDate)}</span>
            </div>
            {/* Factions grouped by side */}
            {sides.length > 0 && (
              <div className="ct-card-sides">
                {sides.map(({ side, members }, si) => (
                  <div key={side} className="ct-card-side-group">
                    {si > 0 && <span className="ct-card-vs">vs</span>}
                    <div className="ct-card-side-factions">
                      {members.map((cf) => (
                        <span
                          key={cf.factionId}
                          className="ct-faction-badge"
                          style={{ borderLeftColor: SIDE_COLORS[side] ?? '#6b7280' }}
                        >
                          {cf.faction.flagUrl && <img src={cf.faction.flagUrl} alt="" className="ct-flag" />}
                          <span className="ct-badge-name">{cf.faction.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}

      {/* Cross-conflict actors section */}
      {crossConflictFactions.length > 0 && (
        <>
          <div className="ct-section-label" style={{ marginTop: 16 }}>Key Actors</div>
          <div className="ct-actor-grid">
            {crossConflictFactions.map(({ faction, conflictCount }) => (
              <button
                key={faction.id}
                className="ct-actor-card"
                onClick={() => onOpenFactionProfile(faction.id)}
              >
                <div className="ct-actor-flag-wrap">
                  {faction.flagUrl
                    ? <img src={faction.flagUrl} alt="" className="ct-actor-flag" />
                    : <div className="ct-actor-flag ct-actor-flag--empty" />}
                </div>
                <div className="ct-actor-info">
                  <span className="ct-actor-name">{faction.name}</span>
                  <span className="ct-actor-meta">
                    <span className="ct-actor-type-dot" style={{ background: FACTION_TYPE_COLORS[faction.type] }} />
                    {FACTION_TYPE_LABELS[faction.type]}
                  </span>
                  <span className="ct-actor-conflicts">{conflictCount} conflicts</span>
                </div>
                <ExternalLink className="h-3 w-3 ct-actor-arrow" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── State 2+3: Detail + casualties + support info ───

function DetailView({ conflict, selectedFactionId, onSelectFaction, onOpenFactionProfile, onGoBack }: {
  conflict: Conflict;
  selectedFactionId: string | null;
  onSelectFaction: (id: string) => void;
  onOpenFactionProfile: (factionId: string) => void;
  onGoBack: () => void;
}) {
  const factions = conflict.factions ?? [];
  const links = conflict.supportLinks ?? [];
  const sides = useMemo(() => groupBySide(factions), [factions]);

  // Selected faction support info
  const selectedFaction = factions.find((f) => f.factionId === selectedFactionId)?.faction
    ?? links.find((l) => l.fromId === selectedFactionId)?.from;
  const supportTo = selectedFactionId ? links.filter((l) => l.toId === selectedFactionId) : [];
  const supportFrom = selectedFactionId ? links.filter((l) => l.fromId === selectedFactionId) : [];

  return (
    <div className="ct-detail">
      <button className="ct-back" onClick={onGoBack}>
        <ArrowLeft className="h-4 w-4" /> All Conflicts
      </button>

      <h3 className="ct-detail-title">{conflict.name}</h3>
      <div className="ct-detail-meta">
        <span className={`ct-status ct-status--${conflict.status.toLowerCase()}`}>{conflict.status}</span>
        <span>{conflict.type.replace(/_/g, ' ')}</span>
        <span>Since {fmtDate(conflict.startDate)}</span>
      </div>

      {conflict.description && <p className="ct-description">{conflict.description}</p>}

      {/* Total casualties */}
      <div className="ct-stat-row">
        <span className="ct-stat-label">Total Est. Casualties</span>
        <span className="ct-stat-value ct-stat-value--red">{fmt(conflict.casualtiesEstimate)}</span>
      </div>

      {/* All sides */}
      <div className="ct-sides-container">
        {sides.map(({ side, members }, si) => {
          const color = SIDE_COLORS[side] ?? '#6b7280';
          const bg = SIDE_BG[side] ?? 'rgba(107, 114, 128, 0.06)';
          const sideName = inferSideName(members);
          const totalCas = members.reduce((sum, m) => sum + (m.casualties ?? 0), 0);

          return (
            <div key={side}>
              {si > 0 && (
                <div className="ct-vs-divider">
                  <Swords className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="ct-side-block" style={{ background: bg, borderColor: `${color}20` }}>
                <div className="ct-side-header">
                  <span className="ct-side-color-bar" style={{ background: color }} />
                  <div className="ct-side-header-text">
                    <span className="ct-side-name" style={{ color }}>{sideName}</span>
                    <span className="ct-side-meta">
                      {members.length} faction{members.length !== 1 ? 's' : ''}
                      {totalCas > 0 && <> &middot; {fmt(totalCas)} casualties</>}
                    </span>
                  </div>
                </div>
                {members.map((cf) => (
                  <div key={cf.factionId} className="ct-faction-row-wrap">
                    <button
                      className={`ct-faction-row ${cf.factionId === selectedFactionId ? 'ct-faction-row--selected' : ''}`}
                      style={{ borderLeftColor: color }}
                      onClick={() => onSelectFaction(cf.factionId)}
                    >
                      <div className="ct-faction-row-flag-wrap">
                        {cf.faction.flagUrl
                          ? <img src={cf.faction.flagUrl} alt="" className="ct-flag-round" />
                          : <div className="ct-flag-round ct-flag-round--empty" />}
                      </div>
                      <div className="ct-faction-row-info">
                        <span className="ct-faction-row-name">{cf.faction.name}</span>
                        <span className="ct-faction-row-type" style={{ color: FACTION_TYPE_COLORS[cf.faction.type] }}>
                          {FACTION_TYPE_SHORT[cf.faction.type]}
                        </span>
                      </div>
                      <span className="ct-faction-row-casualties">{fmt(cf.casualties)}</span>
                    </button>
                    <button
                      className="ct-faction-profile-btn"
                      onClick={(e) => { e.stopPropagation(); onOpenFactionProfile(cf.factionId); }}
                      title="View actor profile"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="ct-legend">
        <span className="ct-legend-item"><span className="ct-legend-dot" style={{ background: '#ef4444' }} /> Military</span>
        <span className="ct-legend-item"><span className="ct-legend-dot" style={{ background: '#3b82f6' }} /> Diplomatic</span>
        <span className="ct-legend-item"><span className="ct-legend-dot" style={{ background: '#22c55e' }} /> Economic</span>
      </div>

      {/* Selected faction support details */}
      {selectedFaction && (
        <div className="ct-support-panel">
          <div className="ct-support-panel-header">
            {selectedFaction.flagUrl && <img src={selectedFaction.flagUrl} alt="" className="ct-flag-lg" />}
            <span className="ct-support-panel-name">{selectedFaction.name}</span>
            <button
              className="ct-profile-link"
              onClick={() => onOpenFactionProfile(selectedFaction.id)}
              title="View full actor profile"
            >
              <Users className="h-3.5 w-3.5" /> Profile
            </button>
          </div>

          {supportTo.length > 0 && (
            <div className="ct-support-section">
              <h4 className="ct-support-title">Receiving Support</h4>
              {supportTo.map((link) => <SupportRow key={link.id} link={link} actor={link.from} />)}
            </div>
          )}
          {supportFrom.length > 0 && (
            <div className="ct-support-section">
              <h4 className="ct-support-title">Providing Support</h4>
              {supportFrom.map((link) => <SupportRow key={link.id} link={link} actor={link.to} />)}
            </div>
          )}
          {supportTo.length === 0 && supportFrom.length === 0 && (
            <div className="ct-empty-small">No external support links recorded.</div>
          )}
        </div>
      )}

      <p className="ct-hint">
        {selectedFactionId
          ? 'Support lines shown on globe. Click another faction to compare.'
          : 'Click a faction above or on the globe to see its support network.'}
      </p>
    </div>
  );
}

// ── State 4: Faction Profile ────────────────────────

function FactionView({ profile, onSelectConflict, onGoBack }: {
  profile: FactionProfile;
  onSelectConflict: (id: string) => void;
  onGoBack: () => void;
}) {
  const { faction, belligerentIn, supportsFrom, supportsTo } = profile;

  // Collect all countries of operation
  const countries = new Set<string>();
  if (faction.countryIso) countries.add(faction.countryIso);
  for (const b of belligerentIn) {
    if (b.conflict.countryIso) countries.add(b.conflict.countryIso);
  }
  for (const s of supportsFrom) {
    if (s.conflict.countryIso) countries.add(s.conflict.countryIso);
  }

  // Unique conflicts (combine belligerent + supporter roles)
  const conflictRoles = new Map<string, { conflict: { id: string; name: string; status: string; countryIso: string; startDate: string | null }; roles: string[] }>();

  for (const b of belligerentIn) {
    const existing = conflictRoles.get(b.conflictId);
    const role = `Belligerent (Side ${b.side})`;
    if (existing) {
      existing.roles.push(role);
    } else {
      conflictRoles.set(b.conflictId, { conflict: b.conflict, roles: [role] });
    }
  }
  for (const s of supportsFrom) {
    const existing = conflictRoles.get(s.conflictId);
    const role = `Supports ${s.to?.name ?? 'unknown'} (${SUPPORT_LABELS[s.type]})`;
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role);
    } else {
      conflictRoles.set(s.conflictId, { conflict: s.conflict, roles: [role] });
    }
  }
  for (const s of supportsTo) {
    const existing = conflictRoles.get(s.conflictId);
    const role = `Supported by ${s.from?.name ?? 'unknown'} (${SUPPORT_LABELS[s.type]})`;
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role);
    } else {
      conflictRoles.set(s.conflictId, { conflict: s.conflict, roles: [role] });
    }
  }

  return (
    <div className="ct-detail">
      <button className="ct-back" onClick={onGoBack}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Actor identity card */}
      <div className="ct-faction-profile-card">
        <div className="ct-faction-profile-flag-wrap">
          {faction.flagUrl
            ? <img src={faction.flagUrl} alt="" className="ct-faction-profile-flag" />
            : <div className="ct-faction-profile-flag ct-faction-profile-flag--empty" />}
        </div>
        <div className="ct-faction-profile-identity">
          <h3 className="ct-detail-title" style={{ marginBottom: 4 }}>{faction.name}</h3>
          <span
            className="ct-faction-type-badge"
            style={{ color: FACTION_TYPE_COLORS[faction.type], borderColor: FACTION_TYPE_COLORS[faction.type] }}
          >
            {FACTION_TYPE_LABELS[faction.type]}
          </span>
        </div>
      </div>

      {/* HQ & operations */}
      <div className="ct-profile-stats">
        {faction.countryIso && (
          <div className="ct-profile-stat">
            <MapPin className="h-3.5 w-3.5" />
            <span className="ct-profile-stat-label">Headquarters</span>
            <span className="ct-profile-stat-value">{isoName(faction.countryIso)}</span>
          </div>
        )}
        <div className="ct-profile-stat">
          <Crosshair className="h-3.5 w-3.5" />
          <span className="ct-profile-stat-label">Active in</span>
          <span className="ct-profile-stat-value">{conflictRoles.size} conflict{conflictRoles.size !== 1 ? 's' : ''}</span>
        </div>
        {countries.size > 1 && (
          <div className="ct-profile-stat">
            <Users className="h-3.5 w-3.5" />
            <span className="ct-profile-stat-label">Operating in</span>
            <span className="ct-profile-stat-value">{[...countries].map(isoName).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Conflicts list */}
      <div className="ct-section-label">Conflicts</div>
      <div className="ct-list">
        {[...conflictRoles.values()].map(({ conflict, roles }) => (
          <button
            key={conflict.id}
            className="ct-conflict-card"
            onClick={() => onSelectConflict(conflict.id)}
          >
            <div className="ct-card-header">
              <Crosshair className="h-4 w-4 text-blue-400" />
              <span className="ct-card-name">{conflict.name}</span>
              <span className={`ct-status ct-status--${conflict.status.toLowerCase()}`}>{conflict.status}</span>
            </div>
            <div className="ct-card-meta">
              <span>{isoName(conflict.countryIso)}</span>
              {conflict.startDate && (
                <>
                  <span className="ct-sep">|</span>
                  <span>Since {fmtDate(conflict.startDate)}</span>
                </>
              )}
            </div>
            <div className="ct-role-tags">
              {roles.map((role, i) => (
                <span key={i} className="ct-role-tag">{role}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Support relationships summary */}
      {(supportsFrom.length > 0 || supportsTo.length > 0) && (
        <>
          <div className="ct-section-label" style={{ marginTop: 12 }}>Support Network</div>
          {supportsFrom.length > 0 && (
            <div className="ct-support-section">
              <h4 className="ct-support-title">Providing Support To</h4>
              {supportsFrom.map((link) => (
                <div key={link.id} className="ct-support-row">
                  {link.to?.flagUrl && <img src={link.to.flagUrl} alt="" className="ct-flag" />}
                  <span className="ct-support-row-name">{link.to?.name ?? '?'}</span>
                  <span className="ct-support-row-type" style={{ color: SUPPORT_COLORS[link.type] }}>
                    {SUPPORT_ICONS[link.type]} {SUPPORT_LABELS[link.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
          {supportsTo.length > 0 && (
            <div className="ct-support-section">
              <h4 className="ct-support-title">Receiving Support From</h4>
              {supportsTo.map((link) => (
                <div key={link.id} className="ct-support-row">
                  {link.from?.flagUrl && <img src={link.from.flagUrl} alt="" className="ct-flag" />}
                  <span className="ct-support-row-name">{link.from?.name ?? '?'}</span>
                  <span className="ct-support-row-type" style={{ color: SUPPORT_COLORS[link.type] }}>
                    {SUPPORT_ICONS[link.type]} {SUPPORT_LABELS[link.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SupportRow({ link, actor }: { link: SupportLink; actor: { name: string; flagUrl: string | null } }) {
  const color = SUPPORT_COLORS[link.type];
  return (
    <div className="ct-support-row">
      {actor.flagUrl && <img src={actor.flagUrl} alt="" className="ct-flag" />}
      <span className="ct-support-row-name">{actor.name}</span>
      <span className="ct-support-row-type" style={{ color }}>
        {SUPPORT_ICONS[link.type]} {SUPPORT_LABELS[link.type]}
      </span>
      {link.intensity && (
        <span className="ct-support-row-intensity">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`ct-dot ${i < link.intensity! ? 'active' : ''}`} style={i < link.intensity! ? { background: color } : undefined} />
          ))}
        </span>
      )}
    </div>
  );
}
