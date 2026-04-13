import { motion } from 'framer-motion';
import { AlertCircle, Landmark, UserCircle2, Gavel, Shield, ShieldAlert, AlertTriangle, Swords, Ban, CalendarDays } from 'lucide-react';
import { politicsService } from '../services/politics-service';
import type { TPoliticsData } from '../services/politics-service';
import { Badge, Bar, Detail } from '../components/BadgeDetail';

interface PoliticsSectionProps {
  data: TPoliticsData | null;
  isLoading: boolean;
  error: string | null;
}

/* ── Interpreters: turn raw numbers into human language ── */

function interpretFreedom(status: string | null) {
  if (status === 'Free') return { badge: 'Free country', level: 'good' as const, desc: 'Citizens enjoy broad political rights and civil liberties' };
  if (status === 'Partly Free') return { badge: 'Partly free', level: 'warning' as const, desc: 'Some political rights and civil liberties are restricted' };
  return { badge: 'Not free', level: 'danger' as const, desc: 'Political rights and civil liberties are severely limited' };
}

function interpretCorruption(score: number) {
  if (score >= 70) return { badge: 'Very transparent', level: 'good' as const, desc: 'Public institutions operate with high transparency and accountability' };
  if (score >= 50) return { badge: 'Moderate transparency', level: 'good' as const, desc: 'Some corruption exists but institutions are mostly functional' };
  if (score >= 35) return { badge: 'Corruption concerns', level: 'warning' as const, desc: 'Significant corruption undermines public trust and governance' };
  return { badge: 'High corruption', level: 'danger' as const, desc: 'Widespread corruption weakens institutions and rule of law' };
}

function interpretFragility(score: number) {
  if (score < 30) return { badge: 'Very stable', level: 'good' as const, desc: 'Strong institutions and social cohesion' };
  if (score < 50) return { badge: 'Stable', level: 'good' as const, desc: 'Functioning state with manageable challenges' };
  if (score < 70) return { badge: 'Moderate risk', level: 'warning' as const, desc: 'Growing pressures on state capacity and social cohesion' };
  if (score < 90) return { badge: 'Elevated risk', level: 'danger' as const, desc: 'Significant institutional weakness and social divisions' };
  return { badge: 'Critical', level: 'danger' as const, desc: 'Severe fragility — risk of state failure or collapse' };
}

function interpretPeace(score: number) {
  if (score <= 1.5) return { badge: 'Very peaceful', level: 'good' as const, desc: 'Minimal violence, low militarization, and strong social safety' };
  if (score <= 2.0) return { badge: 'Peaceful', level: 'good' as const, desc: 'Generally safe with low levels of conflict' };
  if (score <= 2.5) return { badge: 'Moderate peace', level: 'warning' as const, desc: 'Some security concerns and regional tensions' };
  return { badge: 'Low peace', level: 'danger' as const, desc: 'High levels of violence, conflict, or militarization' };
}

/* ── Main Component ── */

export default function PoliticsSection({ data, isLoading, error }: PoliticsSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading politics data...</div>;
  if (error) return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    </div>
  );
  if (!data) return <div className="p-4 text-slate-400">No politics data available</div>;

  const fmt = politicsService.formatNumber;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 space-y-4">

      {/* ── Democratic Freedom ── */}
      {data.freedomHouse?.status.value && (() => {
        const info = interpretFreedom(data.freedomHouse.status.value);
        return (
          <div className="section-card">
            <div className="section-header">
              <Shield className="h-4 w-4" />
              <h3>Democratic Freedom</h3>
            </div>
            <div className="mb-2">
              <Badge text={info.badge} level={info.level} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{info.desc}</p>
            {data.freedomHouse!.politicalRights.value !== null && (
              <Detail label="Political Rights" value={`${data.freedomHouse!.politicalRights.value} / 7`} />
            )}
            {data.freedomHouse!.civilLiberties.value !== null && (
              <Detail label="Civil Liberties" value={`${data.freedomHouse!.civilLiberties.value} / 60`} />
            )}
          </div>
        );
      })()}

      {/* ── Corruption ── */}
      {data.corruptionIndex?.score.value != null && (() => {
        const score = data.corruptionIndex!.score.value;
        const info = interpretCorruption(score);
        return (
          <div className="section-card">
            <div className="section-header">
              <ShieldAlert className="h-4 w-4" />
              <h3>Corruption</h3>
            </div>
            <div className="mb-2">
              <Badge text={info.badge} level={info.level} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{info.desc}</p>
            <Detail label="Score" value={`${fmt(score, 0)} / 100`} />
            <Bar pct={score} color={score >= 50 ? '#10b981' : score >= 35 ? '#f59e0b' : '#ef4444'} />
            {data.corruptionIndex!.rank.value !== null && (
              <div className="mt-2">
                <Detail label="Global Rank" value={`#${fmt(data.corruptionIndex!.rank.value, 0)} of ~180`} />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── State Stability ── */}
      {data.fragileStatesIndex?.score.value != null && (() => {
        const score = data.fragileStatesIndex!.score.value;
        const info = interpretFragility(score);
        return (
          <div className="section-card">
            <div className="section-header">
              <AlertTriangle className="h-4 w-4" />
              <h3>State Stability</h3>
            </div>
            <div className="mb-2">
              <Badge text={info.badge} level={info.level} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{info.desc}</p>
            <Detail label="Fragility Score" value={`${fmt(score, 1)} / 120`} />
            <Bar pct={(score / 120) * 100} color={score < 50 ? '#10b981' : score < 70 ? '#f59e0b' : '#ef4444'} />
            {data.fragileStatesIndex!.rank.value !== null && (
              <div className="mt-2">
                <Detail label="Global Rank" value={`#${fmt(data.fragileStatesIndex!.rank.value, 0)} of ~180`} />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Peace ── */}
      {data.globalPeaceIndex?.score.value != null && (() => {
        const score = data.globalPeaceIndex!.score.value;
        const info = interpretPeace(score);
        return (
          <div className="section-card">
            <div className="section-header">
              <Swords className="h-4 w-4" />
              <h3>Peace Index</h3>
            </div>
            <div className="mb-2">
              <Badge text={info.badge} level={info.level} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{info.desc}</p>
            <Detail label="Peace Score" value={fmt(score, 3)} />
            <Bar pct={((score - 1) / 4) * 100} color={score <= 2.0 ? '#10b981' : score <= 2.5 ? '#f59e0b' : '#ef4444'} />
            {data.globalPeaceIndex!.rank.value !== null && (
              <div className="mt-2">
                <Detail label="Global Rank" value={`#${fmt(data.globalPeaceIndex!.rank.value, 0)} of 163`} />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Sanctions ── */}
      {data.sanctions && data.sanctions.count > 0 && (
        <div className="section-card">
          <div className="section-header">
            <Ban className="h-4 w-4" />
            <h3>Active Sanctions</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              {data.sanctions.count}
            </span>
          </div>
          <div className="space-y-2">
            {data.sanctions.entities.slice(0, 8).map((entity, i) => (
              <div key={i} className="metric-item" style={{ borderLeft: '2px solid rgba(239, 68, 68, 0.3)', paddingLeft: '10px' }}>
                <div className="metric-content">
                  <div className="metric-label">
                    {entity.entityName}
                    <span className="ml-2 inline-flex items-center rounded bg-slate-700/60 px-1.5 py-0.5 text-[9px] text-slate-300 border border-slate-600/60">
                      {entity.entityType}
                    </span>
                  </div>
                  <div className="metric-value text-xs text-slate-400">
                    {entity.sanctionProgram}
                    {entity.listedAt && <span className="text-slate-500"> · since {new Date(entity.listedAt).getFullYear()}</span>}
                  </div>
                  {entity.reason && <div className="text-[10px] text-slate-500 mt-0.5">{entity.reason}</div>}
                </div>
              </div>
            ))}
            {data.sanctions.count > 8 && (
              <div className="text-[10px] text-slate-500 text-center py-1">
                + {data.sanctions.count - 8} more sanctioned entities
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Elections ── */}
      {data.elections && (data.elections.upcoming.length > 0 || data.elections.recent.length > 0) && (
        <div className="section-card">
          <div className="section-header">
            <CalendarDays className="h-4 w-4" />
            <h3>Elections</h3>
          </div>
          {data.elections.upcoming.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">Upcoming</div>
              <div className="space-y-1.5">
                {data.elections.upcoming.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    <CalendarDays className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-medium truncate">{e.description || `${e.electionType} election`}</div>
                      <div className="text-[10px] text-slate-400">
                        {e.electionDate ? new Date(e.electionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : e.year}
                      </div>
                    </div>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>{e.electionType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.elections.recent.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">Recent</div>
              <div className="space-y-1.5">
                {data.elections.recent.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-300 truncate">{e.description || `${e.electionType} ${e.year}`}</div>
                      <div className="text-[10px] text-slate-500">
                        {e.electionDate ? new Date(e.electionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : e.year}
                      </div>
                    </div>
                    {e.turnoutPercent != null && (
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xs text-white font-medium">{e.turnoutPercent.toFixed(1)}%</div>
                        <div className="text-[9px] text-slate-500">turnout</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Government ── */}
      {data.formOfGovernment && (
        <div className="section-card">
          <div className="section-header">
            <Gavel className="h-4 w-4" />
            <h3>Government</h3>
          </div>
          <div className="py-1">
            <span className="text-sm text-slate-200">{data.formOfGovernment}</span>
          </div>
        </div>
      )}

      {/* ── Leaders ── */}
      {data.headsOfGovernment.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <Landmark className="h-4 w-4" />
            <h3>Leaders</h3>
          </div>
          <div className="space-y-2">
            {data.headsOfGovernment.map((entry) => (
              <a
                key={entry.url || entry.title}
                href={entry.url || undefined}
                target={entry.url ? "_blank" : undefined}
                rel={entry.url ? "noreferrer" : undefined}
                className="metric-item hover-lift"
                title={entry.title}
              >
                <div className="metric-icon small"><UserCircle2 className="w-4 h-4" /></div>
                <div className="metric-content">
                  <div className="metric-label">{entry.office || 'Head of Government'}</div>
                  <div className="metric-value truncate">{entry.person || entry.title}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
