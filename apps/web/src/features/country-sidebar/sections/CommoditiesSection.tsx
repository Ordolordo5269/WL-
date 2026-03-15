import { motion } from 'framer-motion';
import { AlertCircle, Fuel, Gem, Wheat, Zap, Droplets, Mountain } from 'lucide-react';
import { commoditiesService } from '../services/commodities-service';
import type { TCommoditiesData } from '../services/commodities-service';

interface CommoditiesSectionProps {
  data: TCommoditiesData | null;
  isLoading: boolean;
  error: string | null;
}

export default function CommoditiesSection({ data, isLoading, error }: CommoditiesSectionProps) {
  if (isLoading) return <div className="p-4 text-slate-400">Loading raw materials data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No raw materials data available</div>;

  // If every single indicator is null, show a clean message instead of a wall of N/A
  const allNull = [
    data.energyImportsPct, data.fuelExportsPct, data.fuelImportsPct,
    data.energyUsePerCapita, data.electricityRenewablesPct,
    data.mineralRentsPctGdp, data.oreMetalExportsPct,
    data.cerealProductionMt, data.cerealYieldKgHa,
    data.foodExportsPct, data.foodImportsPct, data.arableLandPct
  ].every(p => p.value === null || p.value === undefined);

  if (allNull) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No raw materials data available for this territory. World Bank does not publish indicators for small territories, dependencies, and some disputed regions.
      </div>
    );
  }

  const s = commoditiesService;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      {/* Energy */}
      <div className="section-card">
        <div className="section-header">
          <Fuel className="h-4 w-4" />
          <h3>Energy</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Droplets className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Fuel exports (% merch.) {data.fuelExportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fuelExportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.fuelExportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Droplets className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Fuel imports (% merch.) {data.fuelImportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fuelImportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.fuelImportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Energy imports (% use) {data.energyImportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.energyImportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.energyImportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Energy use per capita {data.energyUsePerCapita.year ? <span className="ml-2 text-[10px] text-slate-400">{data.energyUsePerCapita.year}</span> : null}</div>
              <div className="metric-value">{s.formatKgOilEq(data.energyUsePerCapita.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Renewable electricity (%) {data.electricityRenewablesPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.electricityRenewablesPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.electricityRenewablesPct.value)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Minerals */}
      <div className="section-card">
        <div className="section-header">
          <Gem className="h-4 w-4" />
          <h3>Strategic Minerals</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Mountain className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Mineral rents (% GDP) {data.mineralRentsPctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.mineralRentsPctGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.mineralRentsPctGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gem className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Ores & metals exports (% merch.) {data.oreMetalExportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.oreMetalExportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.oreMetalExportsPct.value)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agriculture */}
      <div className="section-card">
        <div className="section-header">
          <Wheat className="h-4 w-4" />
          <h3>Agriculture</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Cereal production {data.cerealProductionMt.year ? <span className="ml-2 text-[10px] text-slate-400">{data.cerealProductionMt.year}</span> : null}</div>
              <div className="metric-value">{s.formatTonnes(data.cerealProductionMt.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Cereal yield (kg/ha) {data.cerealYieldKgHa.year ? <span className="ml-2 text-[10px] text-slate-400">{data.cerealYieldKgHa.year}</span> : null}</div>
              <div className="metric-value">{s.formatNumber(data.cerealYieldKgHa.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Food exports (% merch.) {data.foodExportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.foodExportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.foodExportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Food imports (% merch.) {data.foodImportsPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.foodImportsPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.foodImportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Mountain className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Arable land (% area) {data.arableLandPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.arableLandPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.arableLandPct.value)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
