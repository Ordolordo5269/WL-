import { motion } from 'framer-motion';
import { AlertCircle, Globe2, DollarSign, Percent, ArrowDownUp, Landmark, Users, Truck, HandCoins } from 'lucide-react';
import { internationalService } from '../services/international-service';
import type { TInternationalData } from '../services/international-service';

interface InternationalSectionProps {
  data: TInternationalData | null;
  isLoading: boolean;
  error: string | null;
}


export default function InternationalSection({ data, isLoading, error }: InternationalSectionProps) {
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
              <div className="metric-label">Net ODA received {data.odaReceivedUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.odaReceivedUsd.year}</span> : null}</div>
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
              <div className="metric-label">Current account {data.currentAccountUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.currentAccountUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.currentAccountUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowDownUp className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">FDI net inflows {data.fdiNetInflowsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fdiNetInflowsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.fdiNetInflowsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><ArrowDownUp className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">FDI net outflows {data.fdiNetOutflowsUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.fdiNetOutflowsUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.fdiNetOutflowsUsd.value)}</div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon small"><Globe2 className="w-4 h-4" /></div>
            <div className="metric-content">
              <div className="metric-label">Remittances received {data.remittancesUsd.year ? <span className="ml-2 text-[10px] text-slate-400">{data.remittancesUsd.year}</span> : null}</div>
              <div className="metric-value">{s.formatCurrency(data.remittancesUsd.value)}</div>
            </div>
          </div>
          {data.odaGivenPctGni?.value !== null && data.odaGivenPctGni?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><HandCoins className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">ODA given (% GNI) {data.odaGivenPctGni.year ? <span className="ml-2 text-[10px] text-slate-400">{data.odaGivenPctGni.year}</span> : null}</div>
                <div className="metric-value">{s.formatPercent(data.odaGivenPctGni.value)}</div>
              </div>
            </div>
          )}
          {data.logisticsPerformanceIndex?.value !== null && data.logisticsPerformanceIndex?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Truck className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Logistics Index (LPI) {data.logisticsPerformanceIndex.year ? <span className="ml-2 text-[10px] text-slate-400">{data.logisticsPerformanceIndex.year}</span> : null}</div>
                <div className="metric-value">{data.logisticsPerformanceIndex.value.toFixed(2)}</div>
              </div>
            </div>
          )}
          {data.refugeePopByOrigin?.value !== null && data.refugeePopByOrigin?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Users className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Refugees (from country) {data.refugeePopByOrigin.year ? <span className="ml-2 text-[10px] text-slate-400">{data.refugeePopByOrigin.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.refugeePopByOrigin.value)}</div>
              </div>
            </div>
          )}
          {data.refugeePopByAsylum?.value !== null && data.refugeePopByAsylum?.value !== undefined && (
            <div className="metric-item">
              <div className="metric-icon small"><Users className="w-4 h-4" /></div>
              <div className="metric-content">
                <div className="metric-label">Refugees (in country) {data.refugeePopByAsylum.year ? <span className="ml-2 text-[10px] text-slate-400">{data.refugeePopByAsylum.year}</span> : null}</div>
                <div className="metric-value">{s.formatNumber(data.refugeePopByAsylum.value)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}


