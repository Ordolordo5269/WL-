import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Cpu, DollarSign, FlaskConical, Users, BookOpenCheck, FileCode2 } from 'lucide-react';
import { technologyService, TTechnologyData } from '../services/technology-service';

interface TechnologySectionProps {
  data: TTechnologyData | null;
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

export default function TechnologySection({ data, isLoading, error }: TechnologySectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading technology data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No technology data available</div>;

  const s = technologyService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="section-card">
        <div className="section-header">
          <Cpu className="h-4 w-4" />
          <h3>Technology and National Assets</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><FlaskConical className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">R&D expenditure (% GDP) {data.rndExpenditurePctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.rndExpenditurePctGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.rndExpenditurePctGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><DollarSign className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">High-tech exports (US$) {data.highTechExportsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.highTechExportsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.highTechExportsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Users className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Researchers (per million) {data.researchersPerMillion.year ? <span className="ml-2 text-[10px] text-slate-400">{data.researchersPerMillion.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.researchersPerMillion.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><FileCode2 className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Patent applications (residents) {data.patentApplicationsResidents.year ? <span className="ml-2 text-[10px] text-slate-400">{data.patentApplicationsResidents.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.patentApplicationsResidents.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><BookOpenCheck className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Sci. & technical journal articles {data.scientificJournalArticles.year ? <span className="ml-2 text-[10px] text-slate-400">{data.scientificJournalArticles.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.scientificJournalArticles.value)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}







