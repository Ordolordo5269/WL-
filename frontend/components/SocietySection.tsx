import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HeartPulse, GraduationCap, Activity, Users, UserPlus, Baby, Cross, Building2, Trees, MapPin } from 'lucide-react';
import { societyService, TSocietyIndicators } from '../services/society-service';

interface SocietySectionProps {
  data: TSocietyIndicators | null;
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

export default function SocietySection({ data, isLoading, error }: SocietySectionProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-slate-400">Loading society indicators...</div>
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
      <div className="p-4 text-slate-400">No society data available</div>
    );
  }

  const s = societyService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="secondary-metrics">
        <Metric icon={<HeartPulse className="w-4 h-4" />} label="Life expectancy" value={s.formatYears(data.lifeExpectancy.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Adult literacy" value={s.formatPercent(data.literacyRateAdult.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="UHC coverage" value={s.formatPercent(data.uhcServiceCoverageIndex.value)} />
        <Metric icon={<Users className="w-4 h-4" />} label="Population" value={s.formatNumber(data.populationTotal.value)} />
        <Metric icon={<UserPlus className="w-4 h-4" />} label="Population growth" value={s.formatPercent(data.populationGrowth.value)} />
        <Metric icon={<Baby className="w-4 h-4" />} label="Crude birth rate" value={s.formatPerThousand(data.crudeBirthRate.value)} />
        <Metric icon={<Cross className="w-4 h-4" />} label="Crude death rate" value={s.formatPerThousand(data.crudeDeathRate.value)} />
        <Metric icon={<Building2 className="w-4 h-4" />} label="Urban population" value={s.formatPercent(data.urbanPopulationPercent.value)} />
        <Metric icon={<Trees className="w-4 h-4" />} label="Rural population" value={s.formatPercent(data.ruralPopulationPercent.value)} />
        <Metric icon={<MapPin className="w-4 h-4" />} label="Population density" value={s.formatNumber(data.populationDensity.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Primary net enrollment" value={s.formatPercent(data.primaryNetEnrollment.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Extreme poverty ($2.15)" value={s.formatPercent(data.povertyExtreme215.value)} />
        <Metric icon={<HeartPulse className="w-4 h-4" />} label="HDI" value={data.hdi.value == null ? 'N/A' : data.hdi.value.toFixed(3)} />
      </div>
    </motion.div>
  );
}


