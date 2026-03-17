import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Wifi, Smartphone, Zap, Plane, Server } from 'lucide-react';
import { infrastructureService } from '../services/infrastructure-service';
import type { TInfrastructureData } from '../services/infrastructure-service';

interface InfrastructureSectionProps {
  data: TInfrastructureData | null;
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

export default function InfrastructureSection({ data, isLoading, error }: InfrastructureSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading infrastructure data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No infrastructure data available</div>;

  const s = infrastructureService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-3 space-y-3"
    >
      <div className="secondary-metrics society-grid">
        <Metric
          icon={<Wifi className="w-4 h-4" />}
          label="Internet users (%)"
          value={s.formatPercent(data.internetUsersPct.value)}
          year={data.internetUsersPct.year}
        />
        <Metric
          icon={<Smartphone className="w-4 h-4" />}
          label="Mobile subscriptions (per 100)"
          value={s.formatPerHundred(data.mobileCellularPer100.value)}
          year={data.mobileCellularPer100.year}
        />
        <Metric
          icon={<Zap className="w-4 h-4" />}
          label="Access to electricity (%)"
          value={s.formatPercent(data.accessElectricityPct.value)}
          year={data.accessElectricityPct.year}
        />
        {data.airTransportPassengers?.value !== null && data.airTransportPassengers?.value !== undefined && (
          <Metric
            icon={<Plane className="w-4 h-4" />}
            label="Air transport passengers"
            value={s.formatNumber(data.airTransportPassengers.value)}
            year={data.airTransportPassengers.year}
          />
        )}
        {data.secureInternetServersPm?.value !== null && data.secureInternetServersPm?.value !== undefined && (
          <Metric
            icon={<Server className="w-4 h-4" />}
            label="Secure servers (per million)"
            value={s.formatPerMillion(data.secureInternetServersPm.value)}
            year={data.secureInternetServersPm.year}
          />
        )}
      </div>
    </motion.div>
  );
}
