import { motion } from 'framer-motion';
import { AlertCircle, Cloud, TreePine, Zap, Droplets, Shield, Flame, Wind } from 'lucide-react';
import { environmentService } from '../services/environment-service';
import type { TEnvironmentData } from '../services/environment-service';

interface EnvironmentSectionProps {
  data: TEnvironmentData | null;
  isLoading: boolean;
  error: string | null;
}

export default function EnvironmentSection({ data, isLoading, error }: EnvironmentSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading environment data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No environment data available</div>;

  const allNull = [
    data.co2EmissionsPerCapita, data.co2EmissionsTotalKt, data.pm25AirPollution,
    data.co2FromElectricityPct, data.methaneEmissionsKtCo2eq,
    data.forestAreaPct, data.terrestrialProtectedAreasPct, data.accessCleanWaterPct,
    data.forestRentsPctGdp,
    data.renewableEnergyConsumptionPct, data.renewableElectricityOutputPct
  ].every(p => p.value === null || p.value === undefined);

  if (allNull) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No environment data available for this territory. World Bank does not publish indicators for small territories, dependencies, and some disputed regions.
      </div>
    );
  }

  const s = environmentService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      {/* Climate & Emissions */}
      <div className="section-card">
        <div className="section-header">
          <Cloud className="h-4 w-4" />
          <h3>Climate & Emissions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Flame className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">CO2 per capita {data.co2EmissionsPerCapita.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2EmissionsPerCapita.year}</span> : null}</div>
              <div className="metric-value">{s.formatMetricTons(data.co2EmissionsPerCapita.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Flame className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">CO2 total (Mt) {data.co2EmissionsTotalKt.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2EmissionsTotalKt.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.co2EmissionsTotalKt.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wind className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">PM2.5 pollution {data.pm25AirPollution.year ? <span className="ml-2 text-[10px] text-slate-400">{data.pm25AirPollution.year}</span> : null}</div>
              <div className="metric-value">{s.formatUgM3(data.pm25AirPollution.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">CO2 from power (Mt) {data.co2FromElectricityPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2FromElectricityPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.co2FromElectricityPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Cloud className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Methane (Mt CO2e) {data.methaneEmissionsKtCo2eq.year ? <span className="ml-2 text-[10px] text-slate-400">{data.methaneEmissionsKtCo2eq.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.methaneEmissionsKtCo2eq.value)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Natural Resources */}
      <div className="section-card">
        <div className="section-header">
          <TreePine className="h-4 w-4" />
          <h3>Natural Resources</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><TreePine className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Forest area (% land) {data.forestAreaPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.forestAreaPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.forestAreaPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Shield className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Protected areas (% land) {data.terrestrialProtectedAreasPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.terrestrialProtectedAreasPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.terrestrialProtectedAreasPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Droplets className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Clean water access (%) {data.accessCleanWaterPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.accessCleanWaterPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.accessCleanWaterPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><TreePine className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Forest rents (% GDP) {data.forestRentsPctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.forestRentsPctGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.forestRentsPctGdp.value)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Transition */}
      <div className="section-card">
        <div className="section-header">
          <Zap className="h-4 w-4" />
          <h3>Energy Transition</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Renewable energy (% total) {data.renewableEnergyConsumptionPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.renewableEnergyConsumptionPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.renewableEnergyConsumptionPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Renewable electricity (%) {data.renewableElectricityOutputPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.renewableElectricityOutputPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.renewableElectricityOutputPct.value)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
