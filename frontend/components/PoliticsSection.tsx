import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Scale, Landmark, UserCircle2, ExternalLink } from 'lucide-react';
import { politicsService, TPoliticsData } from '../services/politics-service';

interface PoliticsSectionProps {
  data: TPoliticsData | null;
  isLoading: boolean;
  error: string | null;
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="metric-item">
      <div className="metric-icon small">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

export default function PoliticsSection({ data, isLoading, error }: PoliticsSectionProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-slate-400">Loading politics data...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-slate-400">No politics data available</div>
    );
  }

  const s = politicsService;

  function extractRoleAndEntity(title: string): { role: string; entity: string } {
    const normalized = title.trim();
    // Try to split by known patterns
    const roleMatches = [
      'Prime Minister',
      'President of the Republic',
      'President',
      'Chancellor',
      'Premier',
      'President of the Government',
      'Head of Government',
      'Head of State',
      'King',
      'Queen',
      'Monarch',
      'Emperor',
      'Emir',
      'Sultan',
      'Government',
      'Cabinet',
      'Council of Ministers'
    ];

    for (const candidate of roleMatches) {
      const idx = normalized.toLowerCase().indexOf(candidate.toLowerCase());
      if (idx !== -1) {
        // Role at start, entity after
        const rest = normalized.slice(idx + candidate.length).trim();
        const entity = rest.replace(/^of\s*/i, '').replace(/[()]/g, '').trim() || normalized;
        return { role: candidate, entity };
      }
    }
    // Fallback: if title has parentheses, treat inside as entity
    const parenMatch = normalized.match(/^(.*)\((.*)\)$/);
    if (parenMatch) {
      return { role: parenMatch[1].trim(), entity: parenMatch[2].trim() };
    }
    return { role: normalized, entity: '' };
  }

  function mapToGenericRole(role: string): string {
    const r = role.toLowerCase();
    const isPresidentOfGovernment = r.includes('president of the government');
    const headOfGovernmentSynonyms = [
      'prime minister',
      'chancellor',
      'premier',
      'head of government'
    ];
    const headOfStateSynonyms = [
      'president of the republic',
      'president',
      'head of state',
      'king',
      'queen',
      'monarch',
      'emperor',
      'emir',
      'sultan'
    ];

    if (isPresidentOfGovernment) return 'Head of Government';
    if (headOfGovernmentSynonyms.some(s => r.includes(s))) return 'Head of Government';
    if (headOfStateSynonyms.some(s => r.includes(s))) return 'Head of State';
    if (r.includes('council of ministers') || r.includes('cabinet')) return 'Cabinet';
    if (r.includes('government')) return 'Government';
    return 'Government';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="secondary-metrics">
        <Metric icon={<Scale className="w-4 h-4" />} label="WGI: Political Stability" value={s.formatNumber(data.wgiPoliticalStability.value)} />
      </div>

      {data.headsOfGovernment.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <Landmark className="h-4 w-4" />
            <h3>Heads of Government (Wikipedia)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.headsOfGovernment.map((entry) => {
              const { role, entity } = extractRoleAndEntity(entry.title);
              const displayRole = mapToGenericRole(role);
              return (
                <a
                  key={entry.url}
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                  title={entry.title}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-full bg-slate-700/40 p-2">
                      <UserCircle2 className="w-4 h-4 text-slate-300 group-hover:text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-100 truncate" title={displayRole}>{displayRole}</div>
                      {entity && (
                        <div className="text-xs text-slate-400 truncate" title={entity}>{entity}</div>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}


