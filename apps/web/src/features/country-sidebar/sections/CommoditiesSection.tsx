import { motion } from 'framer-motion';
import { AlertCircle, Fuel, Gem, Wheat, Zap, Droplets, Mountain } from 'lucide-react';
import { commoditiesService } from '../services/commodities-service';
import type { TCommoditiesData, MineralEntry, MineralKey } from '../services/commodities-service';
import { Badge, Detail, type BadgeLevel } from '../components/BadgeDetail';

interface CommoditiesSectionProps {
  data: TCommoditiesData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Given the electricity mix TWh values, return the dominant source badge.
 * Only uses electricity generation (not primary production) so the badge is
 * methodologically consistent for all countries.
 */
function interpretElectricityMix(mix: NonNullable<TCommoditiesData['energyMix']>) {
  const total = mix.totalTwh.value;
  if (!total || total <= 0) return null;

  const sources: Array<{ name: string; twh: number | null; clean: boolean }> = [
    { name: 'Nuclear',  twh: mix.nuclear.value,  clean: true },
    { name: 'Hydro',    twh: mix.hydro.value,    clean: true },
    { name: 'Solar',    twh: mix.solar.value,    clean: true },
    { name: 'Wind',     twh: mix.wind.value,     clean: true },
    { name: 'Coal',     twh: mix.coalElec.value, clean: false },
    { name: 'Gas',      twh: mix.gasElec.value,  clean: false },
    { name: 'Oil',      twh: mix.oilElec.value,  clean: false },
  ];

  // Find the single dominant source (>= 50% of grid)
  const withPct = sources.map((s) => ({ ...s, pct: s.twh != null ? (s.twh / total) * 100 : 0 }));
  const dominant = withPct.reduce((a, b) => (b.pct > a.pct ? b : a));

  const renewablesPct = mix.renewablesSharePct.value;
  const fossilPct = mix.fossilSharePct.value;

  let badge: string;
  let level: BadgeLevel;
  let desc: string;

  if (dominant.pct >= 50) {
    badge = `${dominant.name}-heavy grid`;
    if (dominant.name === 'Nuclear') { level = 'good'; desc = 'Low-carbon baseload grid dominated by nuclear power'; }
    else if (dominant.name === 'Hydro') { level = 'good'; desc = 'Clean grid dominated by hydroelectric generation'; }
    else if (dominant.name === 'Solar' || dominant.name === 'Wind') { level = 'good'; desc = `Clean grid dominated by ${dominant.name.toLowerCase()} power`; }
    else if (dominant.name === 'Gas') { level = 'warning'; desc = 'Natural gas dominates the grid — cleaner than coal but still fossil'; }
    else if (dominant.name === 'Coal') { level = 'danger'; desc = 'Coal dominates the grid — high emissions and air pollution'; }
    else if (dominant.name === 'Oil') { level = 'danger'; desc = 'Petroleum dominates the grid — high emissions, typical of oil exporters'; }
    else { level = 'warning'; desc = 'Grid dominated by one source'; }
  } else if (renewablesPct != null && renewablesPct >= 50) {
    badge = 'Renewable-dominant';
    level = 'good';
    desc = 'Majority of electricity comes from renewable sources';
  } else if (fossilPct != null && fossilPct >= 70) {
    badge = 'Fossil-dominant';
    level = 'danger';
    desc = 'Grid heavily dependent on fossil fuels';
  } else {
    badge = 'Mixed grid';
    level = 'warning';
    desc = 'Balanced mix with no single source above 50%';
  }

  return { badge, level, desc, sources: withPct.filter((s) => s.twh != null && s.twh > 0).sort((a, b) => b.pct - a.pct) };
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

  const mix = data.energyMix;
  const prod = data.energyProduction;
  const mixInfo = mix ? interpretElectricityMix(mix) : null;

  // Show Energy Mix card only if we have meaningful data
  const hasMix = mixInfo !== null;
  // Use >=1 TWh threshold so we don't display rows that round down to "0 TWh"
  const hasPrimaryProduction = prod && (
    (prod.oil.value ?? 0) >= 1 || (prod.gas.value ?? 0) >= 1 || (prod.coal.value ?? 0) >= 1
  );
  // P3 A2: also show if we have at least oil production or consumption data
  const hasOilFlow = data.oilFlow && (
    data.oilFlow.productionTbpd.value !== null || data.oilFlow.consumptionTbpd.value !== null
  );
  const showEnergyMixCard = hasMix || hasPrimaryProduction || hasOilFlow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      {/* P3 A1: Energy Mix (electricity grid) + Primary Production (extraction) */}
      {showEnergyMixCard && (
        <div className="section-card">
          <div className="section-header">
            <Zap className="h-4 w-4" />
            <h3>Energy Mix</h3>
          </div>

          {mixInfo && (
            <>
              <div className="mb-2">
                <Badge text={mixInfo.badge} level={mixInfo.level} />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{mixInfo.desc}</p>

              {mix!.totalTwh.value != null && (
                <Detail label="Total Electricity Generation" value={`${s.formatNumber(Number(mix!.totalTwh.value.toFixed(0)))} TWh`} />
              )}
              {mixInfo.sources.slice(0, 5).map((src) => (
                <Detail key={src.name} label={src.name} value={`${src.pct.toFixed(1)}%`} />
              ))}
            </>
          )}

          {hasPrimaryProduction && (
            <div className={mixInfo ? 'mt-4 pt-3 border-t border-slate-700/40' : ''}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Primary Energy Production</div>
              {prod!.oil.value != null && prod!.oil.value >= 1 && (
                <Detail label="Oil Extraction" value={`${s.formatNumber(Number(prod!.oil.value.toFixed(0)))} TWh`} />
              )}
              {prod!.gas.value != null && prod!.gas.value >= 1 && (
                <Detail label="Gas Extraction" value={`${s.formatNumber(Number(prod!.gas.value.toFixed(0)))} TWh`} />
              )}
              {prod!.coal.value != null && prod!.coal.value >= 1 && (
                <Detail label="Coal Extraction" value={`${s.formatNumber(Number(prod!.coal.value.toFixed(0)))} TWh`} />
              )}
            </div>
          )}

          {/* P3 A2: Oil Self-Sufficiency (EIA — directly comparable TBPD units) */}
          {(() => {
            const flow = data.oilFlow;
            const prodV = flow?.productionTbpd?.value ?? null;
            const consV = flow?.consumptionTbpd?.value ?? null;
            if (prodV === null && consV === null) return null;

            const ratio = (prodV !== null && consV !== null && consV > 0)
              ? prodV / consV
              : null;

            let label: string | null = null;
            let level: 'good' | 'warning' | 'danger' = 'warning';

            if (ratio !== null) {
              if (ratio >= 2)       { label = 'Major oil exporter';        level = 'good'; }
              else if (ratio >= 1)  { label = 'Self-sufficient in oil';    level = 'good'; }
              else if (ratio >= 0.5){ label = 'Partially oil-dependent';   level = 'warning'; }
              else if (ratio > 0.05){ label = 'Highly dependent on imports'; level = 'danger'; }
              else                  { label = 'Almost fully dependent on oil imports'; level = 'danger'; }
            }

            return (
              <div className="mt-4 pt-3 border-t border-slate-700/40">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Oil Self-Sufficiency</div>
                {label && (
                  <div className="mb-2">
                    <Badge text={label} level={level} />
                  </div>
                )}
                {prodV !== null && (
                  <Detail label="Oil Production" value={`${s.formatNumber(Math.round(prodV))} kbbl/day`} />
                )}
                {consV !== null && (
                  <Detail label="Oil Consumption" value={`${s.formatNumber(Math.round(consV))} kbbl/day`} />
                )}
                {ratio !== null && (
                  <Detail label="Self-sufficiency ratio" value={`${ratio.toFixed(2)}×`} />
                )}
              </div>
            );
          })()}
        </div>
      )}

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

      {/* Strategic Minerals — World Bank macro proxies + USGS critical minerals (P3 A3) */}
      <div className="section-card">
        <div className="section-header">
          <Gem className="h-4 w-4" />
          <h3>Strategic Minerals</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Mountain className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Mineral rents (% GDP)</div>
              <div className="metric-value">{s.formatPercent(data.mineralRentsPctGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Gem className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Ores & metals exports (% merch.)</div>
              <div className="metric-value">{s.formatPercent(data.oreMetalExportsPct.value)}</div>
            </div>
          </div>
        </div>

        {/* P3 A3: USGS Critical Minerals — only render minerals with production >0 */}
        {(() => {
          const cm = data.criticalMinerals;
          if (!cm) return null;
          const labels: Array<{ key: MineralKey; label: string }> = [
            { key: 'copper',     label: 'Copper' },
            { key: 'nickel',     label: 'Nickel' },
            { key: 'lithium',    label: 'Lithium' },
            { key: 'cobalt',     label: 'Cobalt' },
            { key: 'graphite',   label: 'Graphite' },
            { key: 'rareEarths', label: 'Rare Earths' },
          ];
          const present = labels.filter(({ key }) => {
            const e = cm[key];
            return e && e.production.value !== null && e.production.value > 0;
          });
          if (present.length === 0) return null;

          return (
            <div className="mt-4 pt-3 border-t border-slate-700/40">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">
                Critical Minerals
              </div>
              <div className="space-y-3">
                {present.map(({ key, label }) => (
                  <CriticalMineralRow key={key} label={label} entry={cm[key]} />
                ))}
              </div>
              <div className="text-[9px] text-slate-600 mt-3 leading-snug">
                Years of supply = proven reserves ÷ current annual production. USGS "proven reserves" means
                economically extractable today. Reserves grow when prices rise or new deposits are found,
                so years-of-supply is not a "depletion deadline".
              </div>
            </div>
          );
        })()}
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
              <div className="metric-label">Cereal yield (kg/ha)</div>
              <div className="metric-value">{s.formatNumber(data.cerealYieldKgHa.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Mountain className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Arable land (% area)</div>
              <div className="metric-value">{s.formatPercent(data.arableLandPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Food exports (% merch.)</div>
              <div className="metric-value">{s.formatPercent(data.foodExportsPct.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Food imports (% merch.)</div>
              <div className="metric-value">{s.formatPercent(data.foodImportsPct.value)}</div>
            </div>
          </div>
        </div>

        {/* P3 A4: Crop-specific production (FAOSTAT via OWID) */}
        {(() => {
          const crops = data.crops;
          if (!crops) return null;
          const list: Array<{ name: string; value: number }> = [];
          if (crops.wheat.value != null && crops.wheat.value >= 1000) list.push({ name: 'Wheat', value: crops.wheat.value });
          if (crops.maize.value != null && crops.maize.value >= 1000) list.push({ name: 'Maize', value: crops.maize.value });
          if (crops.rice.value != null && crops.rice.value >= 1000) list.push({ name: 'Rice', value: crops.rice.value });
          if (crops.soybean.value != null && crops.soybean.value >= 1000) list.push({ name: 'Soybean', value: crops.soybean.value });
          if (crops.barley.value != null && crops.barley.value >= 1000) list.push({ name: 'Barley', value: crops.barley.value });
          if (list.length === 0) return null;
          // Sort by volume descending so the country's strongest crop is first
          list.sort((a, b) => b.value - a.value);
          return (
            <div className="mt-4 pt-3 border-t border-slate-700/40">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Crop Production</div>
              {list.map((c) => (
                <Detail key={c.name} label={c.name} value={s.formatTonnes(c.value)} />
              ))}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}

/* ── P3 A3: Critical Mineral row helper ── */

function rankBadge(tier: MineralEntry['rankTier'], rank: number | null): { text: string; level: BadgeLevel } | null {
  if (!tier || rank === null) return null;
  if (tier === 'top1')  return { text: '#1 global producer',          level: 'good' };
  if (tier === 'top3')  return { text: `#${rank} global producer`,    level: 'good' };
  return { text: `Top ${rank} global producer`,                       level: 'warning' };
}

function formatMineralVolume(value: number, unit: 'kt' | 't'): string {
  // Values come in kilotonnes (Cu) or tonnes (everything else)
  if (unit === 'kt') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} Mt`;
    return `${value.toLocaleString()} kt`;
  }
  // tonnes
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mt`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)} kt`;
  return `${value.toLocaleString()} t`;
}

function CriticalMineralRow({ label, entry }: { label: string; entry: MineralEntry }) {
  const prod = entry.production.value;
  const reserves = entry.reserves.value;
  if (prod === null || prod <= 0) return null;

  const badge = rankBadge(entry.rankTier, entry.globalRank);
  const yearsOfSupply = (reserves !== null && reserves > 0 && prod > 0) ? reserves / prod : null;

  return (
    <div className="rounded-lg p-2.5" style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(71, 85, 105, 0.15)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-slate-200">{label}</span>
        {badge && <Badge text={badge.text} level={badge.level} />}
      </div>
      <Detail label="Mine production" value={`${formatMineralVolume(prod, entry.production.unit)} / yr`} />
      {reserves !== null && reserves > 0 && (
        <Detail label="Proven reserves" value={formatMineralVolume(reserves, entry.reserves.unit)} />
      )}
      {yearsOfSupply !== null && yearsOfSupply > 0 && yearsOfSupply < 1000 && (
        <Detail label="Years of supply" value={`~${Math.round(yearsOfSupply)} years`} />
      )}
    </div>
  );
}
