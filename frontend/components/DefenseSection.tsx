import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Shield, Users, DollarSign, ArrowDownToLine, ArrowUpFromLine, Skull } from 'lucide-react';
import { defenseService, TDefenseData } from '../services/defense-service';

interface DefenseSectionProps {
  data: TDefenseData | null;
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

export default function DefenseSection({ data, isLoading, error }: DefenseSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading defense data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No defense data available</div>;

  const s = defenseService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="section-card">
        <div className="section-header">
          <Shield className="h-4 w-4" />
          <h3>Defense Indicators</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><DollarSign className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Military spend (US$) {data.militaryExpenditureUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.militaryExpenditureUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.militaryExpenditureUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Shield className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Military spend (% GDP) {data.militaryExpenditurePctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.militaryExpenditurePctGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.militaryExpenditurePctGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Users className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Armed forces personnel {data.armedForcesPersonnelTotal.year ? <span className="ml-2 text-[10px] text-slate-400">{data.armedForcesPersonnelTotal.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.armedForcesPersonnelTotal.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowDownToLine className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Arms imports (TIV) {data.armsImportsTiv.year ? <span className="ml-2 text-[10px] text-slate-400">{data.armsImportsTiv.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.armsImportsTiv.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowUpFromLine className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Arms exports (TIV) {data.armsExportsTiv.year ? <span className="ml-2 text-[10px] text-slate-400">{data.armsExportsTiv.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.armsExportsTiv.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Skull className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Battle-related deaths {data.battleRelatedDeaths.year ? <span className="ml-2 text-[10px] text-slate-400">{data.battleRelatedDeaths.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.battleRelatedDeaths.value)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


