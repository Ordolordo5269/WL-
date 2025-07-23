import React from 'react';
import { 
  DollarSign, 
  PieChart, 
  Globe, 
  AlertTriangle,
  Activity,
  Target,
  Briefcase,
  Users,
  ArrowRightLeft
} from 'lucide-react';
import { economyService } from '../services/economy-service';
import type { EconomyData } from '../services/economy-service';

interface EconomySectionProps {
  economyData: EconomyData | null;
  isLoading: boolean;
  error: string | null;
}

export default function EconomySection({ economyData, isLoading, error }: EconomySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-slate-800/40 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!economyData) {
    return (
      <div className="p-4 bg-slate-800/20 border border-slate-600/30 rounded-lg text-center">
        <p className="text-slate-400 text-sm">No economic data available</p>
      </div>
    );
  }

  const getSectorBreakdown = () => {
    const agriculture = economyData.agriculture_percent;
    const industry = economyData.industry_percent;
    const services = economyData.services_percent;

    if (!agriculture && !industry && !services) return null;

    const sectors = [
      { name: 'Agriculture', value: agriculture, color: 'emerald' },
      { name: 'Industry', value: industry, color: 'blue' },
      { name: 'Services', value: services, color: 'purple' }
    ].filter(sector => sector.value);

    return (
      <div className="sectors-grid">
        {sectors.map((sector) => {
          const percentage = sector.value || 0;
          
          return (
            <div key={sector.name} className="sector-item">
              <div className="sector-header">
                <span className="sector-name">{sector.name}</span>
                <span className={`sector-value ${sector.color}`}>
                  {economyService.formatPercentage(percentage)}
                </span>
              </div>
              <div className="sector-bar">
                <div 
                  className={`sector-progress ${sector.color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getTradeInfo = () => {
    const exports = economyData.exports_usd;
    const imports = economyData.imports_usd;
    const balance = economyData.trade_balance_usd;

    if (!exports && !imports && !balance) return null;

    return (
      <div className="trade-items">
        {exports && (
          <div className="trade-item">
            <div className="trade-label">Exports</div>
            <div className="trade-value positive">{economyService.formatCurrency(exports)}</div>
          </div>
        )}
        {imports && (
          <div className="trade-item">
            <div className="trade-label">Imports</div>
            <div className="trade-value negative">{economyService.formatCurrency(imports)}</div>
          </div>
        )}
        {balance !== null && (
          <div className="trade-item balance">
            <div className="trade-label">Trade Balance</div>
            <div className={`trade-value ${balance >= 0 ? 'positive' : 'negative'}`}>
              {economyService.formatCurrency(balance)}
            </div>
            <div className="trade-status">
              {balance >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="economy-container">
      {/* Main Economic Metrics - Compact Layout */}
      <div className="metrics-grid">
        {/* GDP - Main Metric */}
        <div className="metric-card main-metric">
          <div className="metric-header">
            <div className="metric-icon">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="metric-info">
              <h3 className="metric-title">GDP</h3>
              <div className="metric-value">{economyService.formatCurrency(economyData.gdp_usd)}</div>
              <div className="metric-subtitle">{economyData.gdp_year} data</div>
            </div>
            <div className="quality-badge good">Good</div>
          </div>
        </div>

        {/* Secondary Metrics Row */}
        <div className="secondary-metrics">
          <div className="metric-item">
            <div className="metric-icon small">
              <Users className="h-4 w-4" />
            </div>
            <div className="metric-content">
              <div className="metric-label">GDP per Capita</div>
              <div className="metric-value">{economyService.formatCurrency(economyData.gdp_per_capita_usd)}</div>
            </div>
          </div>

          {economyData.inflation_rate_percent !== null && (
            <div className="metric-item">
              <div className="metric-icon small">
                <Activity className="h-4 w-4" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Inflation Rate</div>
                <div className={`metric-value ${economyData.inflation_rate_percent > 3 ? 'value-negative' : economyData.inflation_rate_percent < 0 ? 'value-positive' : 'value-neutral'}`}>
                  {economyService.formatPercentage(economyData.inflation_rate_percent)}
                </div>
              </div>
            </div>
          )}

          {economyData.unemployment_rate_percent !== null && (
            <div className="metric-item">
              <div className="metric-icon small">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Unemployment</div>
                <div className={`metric-value ${economyData.unemployment_rate_percent > 8 ? 'value-negative' : economyData.unemployment_rate_percent < 4 ? 'value-positive' : 'value-neutral'}`}>
                  {economyService.formatPercentage(economyData.unemployment_rate_percent)}
                </div>
              </div>
            </div>
          )}

          {economyData.gini_index !== null && (
            <div className="metric-item">
              <div className="metric-icon small">
                <Target className="h-4 w-4" />
              </div>
              <div className="metric-content">
                <div className="metric-label">GINI Index</div>
                <div className={`metric-value ${economyData.gini_index > 40 ? 'value-negative' : economyData.gini_index < 25 ? 'value-positive' : 'value-neutral'}`}>
                  {economyData.gini_index.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Economic Sectors - Compact */}
      {getSectorBreakdown() && (
        <div className="section-card">
          <div className="section-header">
            <PieChart className="h-4 w-4" />
            <h3>Economic Sectors</h3>
          </div>
          <div className="sectors-list">
            {getSectorBreakdown()}
          </div>
        </div>
      )}

      {/* Trade Information - Compact */}
      {getTradeInfo() && (
        <div className="section-card">
          <div className="section-header">
            <ArrowRightLeft className="h-4 w-4" />
            <h3>International Trade</h3>
          </div>
          <div className="trade-grid">
            {getTradeInfo()}
          </div>
        </div>
      )}

      {/* External Debt - If Available */}
      {economyData.external_debt_usd !== null && (
        <div className="metric-item">
          <div className="metric-icon small">
            <Globe className="h-4 w-4" />
          </div>
          <div className="metric-content">
            <div className="metric-label">External Debt</div>
            <div className="metric-value">{economyService.formatCurrency(economyData.external_debt_usd)}</div>
          </div>
        </div>
      )}

      {/* Country Info - Compact */}
      <div className="info-row">
        <div className="info-item">
          <span className="info-label">Region:</span>
          <span className="info-value">{economyData.region}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Income Level:</span>
          <span className="info-value">{economyData.income_level}</span>
        </div>
      </div>
    </div>
  );
} 