import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Cloud, TreePine, Zap, Droplets, Shield, Flame, Wind, Globe, Fuel } from 'lucide-react';
import { environmentService } from '../services/environment-service';
import type { TEnvironmentData } from '../services/environment-service';

/* ── Badge helpers (consistent with Politics section) ── */

function Badge({ text, level }: { text: string; level: 'good' | 'warning' | 'danger' }) {
  const c = {
    good:    { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
    danger:  { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
  }[level];
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {text}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-400">{value}</span>
    </div>
  );
}

function interpretClimateRisk(ndGainIndex: number | null, wriScore: number | null): { badge: string; level: 'good' | 'warning' | 'danger'; desc: string } {
  // Prefer ND-GAIN if available. ND-GAIN 0-100: higher = more prepared
  if (ndGainIndex !== null) {
    if (ndGainIndex >= 60) return { badge: 'Well prepared', level: 'good', desc: 'Strong climate adaptation capacity and low vulnerability to climate impacts' };
    if (ndGainIndex >= 45) return { badge: 'Moderate preparedness', level: 'warning', desc: 'Partially prepared for climate change; gaps in adaptation remain' };
    if (ndGainIndex >= 35) return { badge: 'Vulnerable', level: 'warning', desc: 'Limited capacity to adapt to climate impacts' };
    return { badge: 'Highly vulnerable', level: 'danger', desc: 'Severe exposure to climate risks with weak institutional response capacity' };
  }
  // Fallback to WRI. Score as percentage: higher = more risk
  if (wriScore !== null) {
    if (wriScore < 5) return { badge: 'Low disaster risk', level: 'good', desc: 'Low exposure to natural hazards and strong coping capacity' };
    if (wriScore < 15) return { badge: 'Moderate disaster risk', level: 'warning', desc: 'Some exposure to natural hazards' };
    return { badge: 'High disaster risk', level: 'danger', desc: 'Significant exposure to natural hazards combined with structural vulnerability' };
  }
  return { badge: 'No data', level: 'warning', desc: '' };
}

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
    data.renewableEnergyConsumptionPct, data.renewableElectricityOutputPct,
    data.ghgEmissionsTotalKt, data.fossilFuelConsumptionPct, data.landAreaSqKm
  ].every(p => p?.value === null || p?.value === undefined);

  if (allNull) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No environment data available for this territory. World Bank does not publish indicators for small territories, dependencies, and some disputed regions.
      </div>
    );
  }

  const s = environmentService;

  const ndGainIdx = data.ndGain?.index.value ?? null;
  const ndGainVuln = data.ndGain?.vulnerability.value ?? null;
  const ndGainRead = data.ndGain?.readiness.value ?? null;
  const wriScore = data.worldRiskIndex?.score.value ?? null;
  const wriExposure = data.worldRiskIndex?.exposure.value ?? null;
  const wriVulnerability = data.worldRiskIndex?.vulnerability.value ?? null;
  const hasClimateRisk = ndGainIdx !== null || wriScore !== null;
  const climateRiskInfo = hasClimateRisk ? interpretClimateRisk(ndGainIdx, wriScore) : null;

  const co2Coal = data.co2BySource?.coal.value ?? null;
  const co2Oil = data.co2BySource?.oil.value ?? null;
  const co2Gas = data.co2BySource?.gas.value ?? null;
  const co2Cement = data.co2BySource?.cement.value ?? null;
  const co2Flaring = data.co2BySource?.flaring.value ?? null;
  const co2Consumption = data.co2BySource?.consumption.value ?? null;
  const hasCo2BySource = [co2Coal, co2Oil, co2Gas, co2Cement, co2Flaring].some(v => v !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      {/* Climate Risk & Vulnerability (P6 Phase A: ND-GAIN + WRI) */}
      {hasClimateRisk && climateRiskInfo && (
        <div className="section-card">
          <div className="section-header">
            <AlertTriangle className="h-4 w-4" />
            <h3>Climate Risk & Vulnerability</h3>
          </div>
          <div className="mb-2">
            <Badge text={climateRiskInfo.badge} level={climateRiskInfo.level} />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{climateRiskInfo.desc}</p>
          {ndGainIdx !== null && (
            <Detail label="ND-GAIN Climate Index" value={`${s.formatNumber(Number(ndGainIdx.toFixed(1)))} / 100`} />
          )}
          {ndGainVuln !== null && (
            <Detail label="Vulnerability" value={ndGainVuln.toFixed(3)} />
          )}
          {ndGainRead !== null && (
            <Detail label="Readiness" value={ndGainRead.toFixed(3)} />
          )}
          {wriScore !== null && (
            <Detail label="Disaster Risk Score" value={`${wriScore.toFixed(2)}%`} />
          )}
          {wriExposure !== null && (
            <Detail label="Hazard Exposure" value={`${wriExposure.toFixed(2)}%`} />
          )}
          {wriVulnerability !== null && (
            <Detail label="Structural Vulnerability" value={`${wriVulnerability.toFixed(2)}%`} />
          )}
        </div>
      )}

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
              <div className="metric-label">CO₂ per Person {data.co2EmissionsPerCapita.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2EmissionsPerCapita.year}</span> : null}</div>
              <div className="metric-value">{s.formatMetricTons(data.co2EmissionsPerCapita.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Flame className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Total CO₂ Emissions {data.co2EmissionsTotalKt.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2EmissionsTotalKt.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.co2EmissionsTotalKt.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wind className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Air Pollution (Fine Particles) {data.pm25AirPollution.year ? <span className="ml-2 text-[10px] text-slate-400">{data.pm25AirPollution.year}</span> : null}</div>
              <div className="metric-value">{s.formatUgM3(data.pm25AirPollution.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">CO₂ from Electricity {data.co2FromElectricityPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.co2FromElectricityPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.co2FromElectricityPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Cloud className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Methane Emissions {data.methaneEmissionsKtCo2eq.year ? <span className="ml-2 text-[10px] text-slate-400">{data.methaneEmissionsKtCo2eq.year}</span> : null}</div>
              <div className="metric-value">{s.formatMtCo2e(data.methaneEmissionsKtCo2eq.value)}</div>
            </div>
          </div>
          {data.ghgEmissionsTotalKt?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Cloud className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Total Greenhouse Gases {data.ghgEmissionsTotalKt.year ? <span className="ml-2 text-[10px] text-slate-400">{data.ghgEmissionsTotalKt.year}</span> : null}</div>
                <div className="metric-value">{s.formatKt(data.ghgEmissionsTotalKt.value)}</div>
              </div>
            </div>
          )}
        </div>

        {/* CO₂ by fuel source (Global Carbon Project) */}
        {hasCo2BySource && (
          <div className="mt-4 pt-3 border-t border-slate-700/40">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">CO₂ by Fuel Source</div>
            <div className="grid grid-cols-2 gap-1.5">
              {co2Coal !== null && <Detail label="Coal" value={s.formatMtCo2e(co2Coal)} />}
              {co2Oil !== null && <Detail label="Oil" value={s.formatMtCo2e(co2Oil)} />}
              {co2Gas !== null && <Detail label="Gas" value={s.formatMtCo2e(co2Gas)} />}
              {co2Cement !== null && <Detail label="Cement" value={s.formatMtCo2e(co2Cement)} />}
              {co2Flaring !== null && <Detail label="Flaring" value={s.formatMtCo2e(co2Flaring)} />}
              {co2Consumption !== null && <Detail label="Consumption-based" value={s.formatMtCo2e(co2Consumption)} />}
            </div>
          </div>
        )}
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
              <div className="metric-label">Forest Coverage {data.forestAreaPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.forestAreaPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.forestAreaPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Shield className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Protected Land {data.terrestrialProtectedAreasPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.terrestrialProtectedAreasPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.terrestrialProtectedAreasPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Droplets className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Clean Water Access {data.accessCleanWaterPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.accessCleanWaterPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.accessCleanWaterPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><TreePine className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Forest Economic Value (% GDP) {data.forestRentsPctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.forestRentsPctGdp.year}</span> : null}</div>
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
              <div className="metric-label">Renewable Energy {data.renewableEnergyConsumptionPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.renewableEnergyConsumptionPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.renewableEnergyConsumptionPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Zap className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Renewable Electricity {data.renewableElectricityOutputPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.renewableElectricityOutputPct.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.renewableElectricityOutputPct.value)}</div>
            </div>
          </div>
          {data.fossilFuelConsumptionPct?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Fuel className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Fossil Fuel Dependency {data.fossilFuelConsumptionPct.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fossilFuelConsumptionPct.year}</span> : null}</div>
                <div className="metric-value">{s.formatPercent(data.fossilFuelConsumptionPct.value)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Geography */}
      {data.landAreaSqKm?.value != null && (
        <div className="section-card">
          <div className="section-header">
            <Globe className="h-4 w-4" />
            <h3>Geography</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="metric-item">
              <div className="metric-icon small"><Globe className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Land area {data.landAreaSqKm.year ? <span className="ml-2 text-[10px] text-slate-400">{data.landAreaSqKm.year}</span> : null}</div>
                <div className="metric-value">{s.formatSqKm(data.landAreaSqKm.value)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
