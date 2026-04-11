import { motion } from 'framer-motion';
import { AlertCircle, Cpu, DollarSign, FlaskConical, Users, BookOpenCheck, FileCode2, Wifi, Percent, FileText, Stamp } from 'lucide-react';
import { technologyService } from '../services/technology-service';
import type { TTechnologyData } from '../services/technology-service';

interface TechnologySectionProps {
  data: TTechnologyData | null;
  isLoading: boolean;
  error: string | null;
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
              <div className="metric-label">Research & Development (% GDP) {data.rndExpenditurePctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.rndExpenditurePctGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.rndExpenditurePctGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><DollarSign className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">High-Tech Exports {data.highTechExportsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.highTechExportsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.highTechExportsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Users className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Researchers per Million People {data.researchersPerMillion.year ? <span className="ml-2 text-[10px] text-slate-400">{data.researchersPerMillion.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.researchersPerMillion.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><FileCode2 className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Domestic Patent Applications {data.patentApplicationsResidents.year ? <span className="ml-2 text-[10px] text-slate-400">{data.patentApplicationsResidents.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.patentApplicationsResidents.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><BookOpenCheck className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Scientific Publications {data.scientificJournalArticles.year ? <span className="ml-2 text-[10px] text-slate-400">{data.scientificJournalArticles.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.scientificJournalArticles.value)}</div>
            </div>
          </div>
          {data.fixedBroadbandPer100?.value !== null && data.fixedBroadbandPer100?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Wifi className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Broadband Subscriptions (per 100) {data.fixedBroadbandPer100.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fixedBroadbandPer100.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.fixedBroadbandPer100.value)}</div>
              </div>
            </div>
          )}
          {data.highTechExportsPctManuf?.value !== null && data.highTechExportsPctManuf?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Percent className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">High-Tech (% of Manufacturing) {data.highTechExportsPctManuf.year ? <span className="ml-2 text-[10px] text-slate-400">{data.highTechExportsPctManuf.year}</span> : null}</div>
                <div className="metric-value">{s.formatPercent(data.highTechExportsPctManuf.value)}</div>
              </div>
            </div>
          )}
          {data.patentApplicationsNonresidents?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><FileText className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Foreign Patent Applications {data.patentApplicationsNonresidents.year ? <span className="ml-2 text-[10px] text-slate-400">{data.patentApplicationsNonresidents.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.patentApplicationsNonresidents.value)}</div>
              </div>
            </div>
          )}
          {data.trademarkApplicationsResidents?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Stamp className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Trademark Applications {data.trademarkApplicationsResidents.year ? <span className="ml-2 text-[10px] text-slate-400">{data.trademarkApplicationsResidents.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.trademarkApplicationsResidents.value)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}







