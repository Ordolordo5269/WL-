import { useState } from 'react';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';

interface TopPartner {
  iso3: string;
  name: string;
  valueUsd: number;
}

interface CommodityItem {
  hsCode: string;
  hsName: string;
  valueUsd: number;
  percentOfTotal: number;
  topPartners: TopPartner[];
}

interface CommoditiesData {
  reporter: { iso3: string; name: string } | null;
  year: number;
  flow: 'export' | 'import';
  commodities: CommodityItem[];
  totalValueUsd: number;
}

interface TradeCommoditiesCardProps {
  exportData: CommoditiesData | null;
  importData: CommoditiesData | null;
  loading: boolean;
}

function formatValue(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

export default function TradeCommoditiesCard({ exportData, importData, loading }: TradeCommoditiesCardProps) {
  const [flow, setFlow] = useState<'export' | 'import'>('export');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return null;

  const hasData = (exportData?.commodities?.length ?? 0) > 0 || (importData?.commodities?.length ?? 0) > 0;
  if (!hasData) return null;

  const activeData = flow === 'export' ? exportData : importData;

  return (
    <div className="section-card">
      <div className="section-header">
        <BarChart3 className="h-4 w-4" />
        <h3>Trade by Commodity</h3>
      </div>

      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setFlow('export')}
          className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
          style={{
            background: flow === 'export' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(71, 85, 105, 0.2)',
            color: flow === 'export' ? '#34d399' : '#94a3b8',
            border: `1px solid ${flow === 'export' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
          }}
        >
          Exports
        </button>
        <button
          onClick={() => setFlow('import')}
          className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
          style={{
            background: flow === 'import' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(71, 85, 105, 0.2)',
            color: flow === 'import' ? '#60a5fa' : '#94a3b8',
            border: `1px solid ${flow === 'import' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
          }}
        >
          Imports
        </button>
      </div>

      {activeData && activeData.commodities.length > 0 ? (
        <div className="space-y-1">
          {activeData.commodities.slice(0, 10).map((c) => {
            const maxPct = activeData.commodities[0]?.percentOfTotal ?? 1;
            const barWidth = maxPct > 0 ? (c.percentOfTotal / maxPct) * 100 : 0;
            const isExpanded = expanded === c.hsCode;

            return (
              <div key={c.hsCode}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.hsCode)}
                  className="w-full flex items-center gap-1.5 group cursor-pointer"
                  style={{ background: 'transparent', border: 'none', padding: 0 }}
                >
                  {c.topPartners.length > 0 ? (
                    isExpanded
                      ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                  ) : (
                    <span className="w-3 shrink-0" />
                  )}
                  <span className="text-[10px] text-slate-400 w-14 truncate text-left" title={c.hsName}>
                    {c.hsName.length > 16 ? c.hsName.substring(0, 16) + '…' : c.hsName}
                  </span>
                  <div className="flex-1 relative h-4 rounded-sm overflow-hidden" style={{ background: 'rgba(71, 85, 105, 0.15)' }}>
                    <div
                      className="absolute left-0 top-0 h-full rounded-sm transition-all"
                      style={{
                        width: `${barWidth}%`,
                        background: flow === 'export'
                          ? 'linear-gradient(90deg, rgba(52, 211, 153, 0.5), rgba(52, 211, 153, 0.2))'
                          : 'linear-gradient(90deg, rgba(96, 165, 250, 0.5), rgba(96, 165, 250, 0.2))',
                      }}
                    />
                    <span className="absolute right-1.5 top-0 h-full flex items-center text-[10px] text-slate-300">
                      {formatValue(c.valueUsd)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 w-10 text-right shrink-0">
                    {c.percentOfTotal.toFixed(1)}%
                  </span>
                </button>

                {isExpanded && c.topPartners.length > 0 && (
                  <div className="ml-6 mt-1 mb-2 space-y-0.5">
                    {c.topPartners.map((p) => (
                      <div key={p.iso3} className="flex items-center gap-2 text-[9px] text-slate-400">
                        <span className="w-10 truncate">{p.name}</span>
                        <span className="text-slate-500">{formatValue(p.valueUsd)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {activeData.totalValueUsd > 0 && (
            <div className="text-[9px] text-slate-500 mt-2 pt-2" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.2)' }}>
              Total {flow}s: {formatValue(activeData.totalValueUsd)} · Source: UN Comtrade HS2 · {activeData.year}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">No commodity breakdown available.</p>
      )}
    </div>
  );
}
