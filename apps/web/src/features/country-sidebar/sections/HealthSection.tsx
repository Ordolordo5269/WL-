import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HeartPulse, Stethoscope, BedDouble, Baby, ShieldCheck, Utensils, Activity } from 'lucide-react';
import { healthService } from '../services/health-service';
import type { THealthData } from '../services/health-service';

interface HealthSectionProps {
  data: THealthData | null;
  isLoading: boolean;
  error: string | null;
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  year?: number | null;
}

function Metric({ icon, label, value, year }: MetricProps) {
  return (
    <div className="metric-item">
      <div className="metric-icon small">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">
          {label}
          {year ? <span className="ml-2 text-[10px] text-slate-400">{year}</span> : null}
        </div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

export default function HealthSection({ data, isLoading, error }: HealthSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading health data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No health data available</div>;

  const s = healthService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-3 space-y-3"
    >
      <div className="secondary-metrics society-grid">
        <Metric
          icon={<Activity className="w-4 h-4" />}
          label="Health expenditure (% GDP)"
          value={s.formatPercent(data.healthExpenditurePctGdp.value)}
          year={data.healthExpenditurePctGdp.year}
        />
        <Metric
          icon={<Stethoscope className="w-4 h-4" />}
          label="Physicians (per 1,000)"
          value={s.formatPerThousand(data.physiciansPerThousand.value)}
          year={data.physiciansPerThousand.year}
        />
        <Metric
          icon={<BedDouble className="w-4 h-4" />}
          label="Hospital beds (per 1,000)"
          value={s.formatPerThousand(data.hospitalBedsPerThousand.value)}
          year={data.hospitalBedsPerThousand.year}
        />
        <Metric
          icon={<Baby className="w-4 h-4" />}
          label="Infant mortality (per 1,000)"
          value={s.formatPerThousand(data.infantMortalityRate.value)}
          year={data.infantMortalityRate.year}
        />
        {data.maternalMortalityRatio?.value !== null && data.maternalMortalityRatio?.value !== undefined && (
          <Metric
            icon={<HeartPulse className="w-4 h-4" />}
            label="Maternal mortality (per 100k)"
            value={s.formatPerHundredThousand(data.maternalMortalityRatio.value)}
            year={data.maternalMortalityRatio.year}
          />
        )}
        <Metric
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Immunization measles (%)"
          value={s.formatPercent(data.immunizationMeasles.value)}
          year={data.immunizationMeasles.year}
        />
        {data.undernourishmentPct?.value !== null && data.undernourishmentPct?.value !== undefined && (
          <Metric
            icon={<Utensils className="w-4 h-4" />}
            label="Undernourishment (%)"
            value={s.formatPercent(data.undernourishmentPct.value)}
            year={data.undernourishmentPct.year}
          />
        )}
      </div>
    </motion.div>
  );
}
