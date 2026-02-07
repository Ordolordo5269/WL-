import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Scale, Landmark, UserCircle2, Gavel } from 'lucide-react';
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

  const stability = data.wgiPoliticalStability.value;
  const stabilityLabel = typeof stability === 'number' ? `${s.formatNumber(stability)} score` : 'N/A';
  const democracy = data.democracyIndex?.value;
  const democracyLabel = democracy === null || democracy === undefined ? 'N/A' : `${s.formatNumber(democracy, 2)} / 10`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="secondary-metrics">
        <Metric icon={<Scale className="w-4 h-4" />} label="WGI: Political Stability" value={stabilityLabel} />
        <Metric icon={<Gavel className="w-4 h-4" />} label="Democracy Index (proxy)" value={democracyLabel} />
      </div>

      <div className="section-card">
        <div className="section-header">
          <Scale className="h-4 w-4" />
          <h3>Governance (World Bank WGI)</h3>
        </div>
        <div className="space-y-2">
          <div className="metric-item">
            <div className="metric-icon small"><Gavel className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Government Effectiveness <span className="ml-2 inline-flex items-center rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-200 border border-slate-600/60">GE.EST</span>{data.wgiGovernmentEffectiveness.year ? <span className="ml-2 text-[10px] text-slate-400">{data.wgiGovernmentEffectiveness.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.wgiGovernmentEffectiveness.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gavel className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Regulatory Quality <span className="ml-2 inline-flex items-center rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-200 border border-slate-600/60">RQ.EST</span>{data.wgiRegulatoryQuality.year ? <span className="ml-2 text-[10px] text-slate-400">{data.wgiRegulatoryQuality.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.wgiRegulatoryQuality.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gavel className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Rule of Law <span className="ml-2 inline-flex items-center rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-200 border border-slate-600/60">RL.EST</span>{data.wgiRuleOfLaw.year ? <span className="ml-2 text-[10px] text-slate-400">{data.wgiRuleOfLaw.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.wgiRuleOfLaw.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gavel className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Control of Corruption <span className="ml-2 inline-flex items-center rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-200 border border-slate-600/60">CC.EST</span>{data.wgiControlOfCorruption.year ? <span className="ml-2 text-[10px] text-slate-400">{data.wgiControlOfCorruption.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.wgiControlOfCorruption.value)}</div>
            </div>
          </div>
        </div>
      </div>

      {data.formOfGovernment && (
        <div className="section-card">
          <div className="section-header">
            <Gavel className="h-4 w-4" />
            <h3>Form of Government</h3>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gavel className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Form of Government</div>
              <div className="metric-value">{data.formOfGovernment}</div>
            </div>
          </div>
        </div>
      )}

      {data.headsOfGovernment.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <Landmark className="h-4 w-4" />
            <h3>Heads of Government (Wikipedia)</h3>
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


