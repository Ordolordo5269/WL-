import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Globe2, DollarSign, Percent, ArrowDownUp, Landmark, Users, Truck, HandCoins, Package, Gem, Wheat, ArrowRightLeft } from 'lucide-react';
import { internationalService } from '../services/international-service';
import type { TInternationalData } from '../services/international-service';
import TradeCommoditiesCard from './TradeCommoditiesCard';

interface TradePartner {
  iso3: string;
  name: string;
  valueUsd: number;
  percentOfTotal: number;
}

interface TradePartnersData {
  reporter: { iso3: string; name: string } | null;
  year: number;
  flow: 'export' | 'import';
  partners: TradePartner[];
  totalValueUsd: number;
}

function useTradePartners(iso3: string | null) {
  const [exportData, setExportData] = useState<TradePartnersData | null>(null);
  const [importData, setImportData] = useState<TradePartnersData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iso3) return;
    let cancelled = false;
    setLoading(true);

    const baseUrl = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3001';
    Promise.all([
      fetch(`${baseUrl}/api/trade/${iso3}/partners?year=2024&flow=export`).then((r) => r.json()),
      fetch(`${baseUrl}/api/trade/${iso3}/partners?year=2024&flow=import`).then((r) => r.json()),
    ])
      .then(([expRes, impRes]) => {
        if (cancelled) return;
        setExportData(expRes.data ?? null);
        setImportData(impRes.data ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [iso3]);

  return { exportData, importData, loading };
}

interface CommoditiesData {
  reporter: { iso3: string; name: string } | null;
  year: number;
  flow: 'export' | 'import';
  commodities: Array<{
    hsCode: string;
    hsName: string;
    valueUsd: number;
    percentOfTotal: number;
    topPartners: Array<{ iso3: string; name: string; valueUsd: number }>;
  }>;
  totalValueUsd: number;
}

function useTradeCommodities(iso3: string | null) {
  const [exportData, setExportData] = useState<CommoditiesData | null>(null);
  const [importData, setImportData] = useState<CommoditiesData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iso3) return;
    let cancelled = false;
    setLoading(true);

    const baseUrl = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3001';
    Promise.all([
      fetch(`${baseUrl}/api/trade/${iso3}/commodities?year=2024&flow=export`).then((r) => r.json()),
      fetch(`${baseUrl}/api/trade/${iso3}/commodities?year=2024&flow=import`).then((r) => r.json()),
    ])
      .then(([expRes, impRes]) => {
        if (cancelled) return;
        setExportData(expRes.data ?? null);
        setImportData(impRes.data ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [iso3]);

  return { exportData, importData, loading };
}

function formatTradeValue(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

interface InternationalSectionProps {
  data: TInternationalData | null;
  isLoading: boolean;
  error: string | null;
}


export default function InternationalSection({ data, isLoading, error }: InternationalSectionProps) {
  const [tradeFlow, setTradeFlow] = useState<'export' | 'import'>('export');
  const { exportData, importData, loading: tradeLoading } = useTradePartners(data?.countryCode3 ?? null);
  const { exportData: commExport, importData: commImport, loading: commLoading } = useTradeCommodities(data?.countryCode3 ?? null);

  if (isLoading) return <div className="p-4 text-slate-400">Loading international data...</div>;
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
  if (!data) return <div className="p-4 text-slate-400">No international data available</div>;

  const s = internationalService;
  const activeTradeData = tradeFlow === 'export' ? exportData : importData;
  const hasTradeData = (exportData?.partners?.length ?? 0) > 0 || (importData?.partners?.length ?? 0) > 0;
  const odaDisplay = (data.odaReceivedUsd.value === null || data.odaReceivedUsd.value === 0)
    ? 'Non-recipient'
    : s.formatCurrency(data.odaReceivedUsd.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="section-card">
        <div className="section-header">
          <Globe2 className="h-4 w-4" />
          <h3>International Indicators</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="metric-item">
            <div className="metric-icon small"><Landmark className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Foreign Aid Received {data.odaReceivedUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.odaReceivedUsd.year}</span> : null}</div>
              <div className="metric-value">{odaDisplay}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Percent className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Trade (% of GDP) {data.tradePercentGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.tradePercentGdp.year}</span> : null}</div>
              <div className="metric-value">{s.formatPercent(data.tradePercentGdp.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><DollarSign className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Trade Balance (Current Account) {data.currentAccountUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.currentAccountUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.currentAccountUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowDownUp className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Foreign Investment Inflows {data.fdiNetInflowsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fdiNetInflowsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.fdiNetInflowsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowDownUp className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Foreign Investment Outflows {data.fdiNetOutflowsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fdiNetOutflowsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.fdiNetOutflowsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Globe2 className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Money Sent Home (Remittances) {data.remittancesUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.remittancesUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.remittancesUsd.value)}</div>
            </div>
          </div>
          {data.odaGivenPctGni?.value !== null && data.odaGivenPctGni?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><HandCoins className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Foreign Aid Given (% National Income) {data.odaGivenPctGni.year ? <span className="ml-2 text-[10px] text-slate-400">{data.odaGivenPctGni.year}</span> : null}</div>
                <div className="metric-value">{s.formatPercent(data.odaGivenPctGni.value)}</div>
              </div>
            </div>
          )}
          {data.logisticsPerformanceIndex?.value !== null && data.logisticsPerformanceIndex?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Truck className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Logistics Performance {data.logisticsPerformanceIndex.year ? <span className="ml-2 text-[10px] text-slate-400">{data.logisticsPerformanceIndex.year}</span> : null}</div>
                <div className="metric-value">{data.logisticsPerformanceIndex.value.toFixed(2)}</div>
              </div>
            </div>
          )}
          {data.refugeePopByOrigin?.value !== null && data.refugeePopByOrigin?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Users className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Refugees Who Have Fled {data.refugeePopByOrigin.year ? <span className="ml-2 text-[10px] text-slate-400">{data.refugeePopByOrigin.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.refugeePopByOrigin.value)}</div>
              </div>
            </div>
          )}
          {data.refugeePopByAsylum?.value !== null && data.refugeePopByAsylum?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Users className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Refugees Hosted {data.refugeePopByAsylum.year ? <span className="ml-2 text-[10px] text-slate-400">{data.refugeePopByAsylum.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.refugeePopByAsylum.value)}</div>
              </div>
            </div>
          )}
          {data.merchandiseExportsUsd?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Package className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Goods Exported {data.merchandiseExportsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.merchandiseExportsUsd.year}</span> : null}</div>
                <div className="metric-value">{s.formatCurrency(data.merchandiseExportsUsd.value)}</div>
              </div>
            </div>
          )}
          {data.merchandiseImportsUsd?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Package className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Goods Imported {data.merchandiseImportsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.merchandiseImportsUsd.year}</span> : null}</div>
                <div className="metric-value">{s.formatCurrency(data.merchandiseImportsUsd.value)}</div>
              </div>
            </div>
          )}
          {data.totalNaturalResourceRentsPctGdp?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Gem className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Natural Resource Income (% GDP) {data.totalNaturalResourceRentsPctGdp.year ? <span className="ml-2 text-[10px] text-slate-400">{data.totalNaturalResourceRentsPctGdp.year}</span> : null}</div>
                <div className="metric-value">{s.formatPercent(data.totalNaturalResourceRentsPctGdp.value)}</div>
              </div>
            </div>
          )}
          {data.foodProductionIndex?.value != null && (
            <div className="metric-item">
              <div className="metric-icon small"><Wheat className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Food Production {data.foodProductionIndex.year ? <span className="ml-2 text-[10px] text-slate-400">{data.foodProductionIndex.year}</span> : null}</div>
                <div className="metric-value">{data.foodProductionIndex.value.toFixed(1)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P4 Fase A: Top Trade Partners (UN Comtrade bilateral TOTAL) */}
      {!tradeLoading && hasTradeData && (
        <div className="section-card">
          <div className="section-header">
            <ArrowRightLeft className="h-4 w-4" />
            <h3>Top Trade Partners</h3>
          </div>

          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setTradeFlow('export')}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: tradeFlow === 'export' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                color: tradeFlow === 'export' ? '#34d399' : '#94a3b8',
                border: `1px solid ${tradeFlow === 'export' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
              }}
            >
              Exports
            </button>
            <button
              onClick={() => setTradeFlow('import')}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: tradeFlow === 'import' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                color: tradeFlow === 'import' ? '#60a5fa' : '#94a3b8',
                border: `1px solid ${tradeFlow === 'import' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
              }}
            >
              Imports
            </button>
          </div>

          {activeTradeData && activeTradeData.partners.length > 0 ? (
            <div className="space-y-1.5">
              {activeTradeData.partners.slice(0, 10).map((p, i) => {
                const maxPct = activeTradeData.partners[0]?.percentOfTotal ?? 1;
                const barWidth = maxPct > 0 ? (p.percentOfTotal / maxPct) * 100 : 0;
                return (
                  <div key={p.iso3} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-4 text-right">{i + 1}</span>
                    <span className="text-[11px] text-slate-300 w-16 truncate">{p.name}</span>
                    <div className="flex-1 relative h-4 rounded-sm overflow-hidden" style={{ background: 'rgba(71, 85, 105, 0.15)' }}>
                      <div
                        className="absolute left-0 top-0 h-full rounded-sm transition-all"
                        style={{
                          width: `${barWidth}%`,
                          background: tradeFlow === 'export'
                            ? 'linear-gradient(90deg, rgba(52, 211, 153, 0.5), rgba(52, 211, 153, 0.2))'
                            : 'linear-gradient(90deg, rgba(96, 165, 250, 0.5), rgba(96, 165, 250, 0.2))',
                        }}
                      />
                      <span className="absolute right-1.5 top-0 h-full flex items-center text-[10px] text-slate-300">
                        {formatTradeValue(p.valueUsd)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 w-10 text-right">{p.percentOfTotal.toFixed(1)}%</span>
                  </div>
                );
              })}
              {activeTradeData.totalValueUsd > 0 && (
                <div className="text-[9px] text-slate-500 mt-2 pt-2" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.2)' }}>
                  Total {tradeFlow}s: {formatTradeValue(activeTradeData.totalValueUsd)} · Source: UN Comtrade · {activeTradeData.year}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">No bilateral trade data available for this country.</p>
          )}
        </div>
      )}

      {/* P4 Fase B: Trade by Commodity (HS2 breakdown) */}
      <TradeCommoditiesCard exportData={commExport} importData={commImport} loading={commLoading} />
    </motion.div>
  );
}
