import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HeartPulse, GraduationCap, Activity, Users, MapPin, TrendingUp } from 'lucide-react';
import { societyService, TSocietyIndicators } from '../services/society-service';
import type { SocietySeriesData } from '../hooks/useSocietyData';
import TimeSeriesChart from './TimeSeriesChart';

interface SocietySectionProps {
  data: TSocietyIndicators | null;
  isLoading: boolean;
  error: string | null;
  series?: SocietySeriesData | null;
  fetchIndicatorSeries?: (indicatorCode: string, limitYears?: number) => Promise<Array<{ year: number; value: number | null }>>;
  iso3?: string | null;
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

// Gráficos antiguos eliminados - solo usamos TimeSeriesChart grandes

// Society indicators for interactive charts
const SOCIETY_INDICATORS = [
  { slug: 'life-expectancy', name: 'Life Expectancy', code: 'SP.DYN.LE00.IN', color: '#10b981', unit: 'years' },
  { slug: 'literacy', name: 'Adult Literacy', code: 'SE.ADT.LITR.ZS', color: '#3b82f6', unit: '%' },
  { slug: 'uhc-coverage', name: 'UHC Coverage', code: 'SH.UHC.SRVS.CV.XD', color: '#8b5cf6', unit: 'index' },
  { slug: 'population-growth', name: 'Population Growth', code: 'SP.POP.GROW', color: '#22d3ee', unit: '%' },
  { slug: 'birth-rate', name: 'Birth Rate', code: 'SP.DYN.CBRT.IN', color: '#ec4899', unit: 'per 1,000' },
  { slug: 'death-rate', name: 'Death Rate', code: 'SP.DYN.CDRT.IN', color: '#f59e0b', unit: 'per 1,000' },
  { slug: 'urban-population', name: 'Urban Population', code: 'SP.URB.TOTL.IN.ZS', color: '#06b6d4', unit: '%' },
  { slug: 'population-density', name: 'Population Density', code: 'SP.POP.DNST', color: '#f97316', unit: 'per km²' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment', code: 'SE.PRM.NENR', color: '#14b8a6', unit: '%' },
  { slug: 'poverty', name: 'Extreme Poverty', code: 'SI.POV.DDAY', color: '#ef4444', unit: '%' }
];

export default function SocietySection({ data, isLoading, error, series, fetchIndicatorSeries, iso3 }: SocietySectionProps) {
  // State for interactive charts - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<Record<string, Array<{ year: number; value: number | null }>>>({});
  const [loadingChart, setLoadingChart] = useState<Record<string, boolean>>({});
  const [chartErrors, setChartErrors] = useState<Record<string, string>>({});

  // Load chart data when indicator is selected - MUST BE BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    if (!selectedIndicator || !fetchIndicatorSeries || !iso3) return;

    const indicator = SOCIETY_INDICATORS.find(ind => ind.slug === selectedIndicator);
    if (!indicator) return;

    // If already loaded, don't reload
    if (timeSeriesData[selectedIndicator]) return;

    const loadChartData = async () => {
      setLoadingChart(prev => ({ ...prev, [selectedIndicator]: true }));
      setChartErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[selectedIndicator];
        return newErrors;
      });

      try {
        const data = await fetchIndicatorSeries(indicator.code, 30);
        setTimeSeriesData(prev => ({ ...prev, [selectedIndicator]: data }));
      } catch (error) {
        setChartErrors(prev => ({
          ...prev,
          [selectedIndicator]: error instanceof Error ? error.message : 'Failed to load data'
        }));
      } finally {
        setLoadingChart(prev => ({ ...prev, [selectedIndicator]: false }));
      }
    };

    loadChartData();
  }, [selectedIndicator, fetchIndicatorSeries, iso3, timeSeriesData]);

  // Helper functions - MUST BE AFTER ALL HOOKS
  const selectIndicator = (slug: string) => {
    // If clicking the same indicator, deselect it (toggle off)
    if (selectedIndicator === slug) {
      setSelectedIndicator(null);
    } else {
      setSelectedIndicator(slug);
    }
  };

  const getIndicatorDisplayName = (slug: string): string => {
    const indicator = SOCIETY_INDICATORS.find(ind => ind.slug === slug);
    if (!indicator) return slug;
    return `${indicator.name} (${indicator.unit})`;
  };

  // CONDITIONAL RETURNS - MUST BE AFTER ALL HOOKS
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
      className="p-3 space-y-3"
    >
      {/* Clean metrics - no small charts */}
      <div className="secondary-metrics society-grid">
        <Metric icon={<HeartPulse className="w-4 h-4" />} label="Life expectancy" value={s.formatYears(data.lifeExpectancy.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Adult literacy" value={s.formatPercent(data.literacyRateAdult.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="UHC coverage" value={s.formatPercent(data.uhcServiceCoverageIndex.value)} />
        <Metric icon={<Users className="w-4 h-4" />} label="Population" value={s.formatNumber(data.populationTotal.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Population growth" value={s.formatPercent(data.populationGrowth.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Urban population" value={s.formatPercent(data.urbanPopulationPercent.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Rural population" value={s.formatPercent(data.ruralPopulationPercent.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Birth rate" value={s.formatPerThousand(data.crudeBirthRate.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Death rate" value={s.formatPerThousand(data.crudeDeathRate.value)} />
        <Metric icon={<MapPin className="w-4 h-4" />} label="Population density" value={s.formatNumber(data.populationDensity.value)} />
        <Metric icon={<GraduationCap className="w-4 h-4" />} label="Primary net enrollment" value={s.formatPercent(data.primaryNetEnrollment.value)} />
        <Metric icon={<Activity className="w-4 h-4" />} label="Extreme poverty ($2.15)" value={s.formatPercent(data.povertyExtreme215.value)} />
      </div>

      {/* Historical Trends Section - Now in main Historical Trends zone, hidden here */}
      {false && iso3 && fetchIndicatorSeries && (
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-slate-200">Society Historical Trends</h3>
          </div>

          {/* Indicator selector */}
          <div className="historical-indicator-selector mb-4">
            {SOCIETY_INDICATORS.map(indicator => {
              const isSelected = selectedIndicator === indicator.slug;
              return (
                <button
                  key={indicator.slug}
                  onClick={() => selectIndicator(indicator.slug)}
                  className={`historical-indicator-btn ${isSelected ? 'selected' : ''}`}
                  style={isSelected ? { 
                    borderColor: `${indicator.color}80`,
                    color: indicator.color,
                    background: `${indicator.color}15`
                  } : {}}
                >
                  {indicator.name}
                </button>
              );
            })}
          </div>

          {/* Chart display */}
          {selectedIndicator ? (
            (() => {
              const indicator = SOCIETY_INDICATORS.find(ind => ind.slug === selectedIndicator);
              if (!indicator) return null;

              const chartData = timeSeriesData[selectedIndicator] || [];
              const isLoading = loadingChart[selectedIndicator];
              const chartError = chartErrors[selectedIndicator];

              return (
                <motion.div
                  key={selectedIndicator}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="historical-chart-card"
                >
                  <div className="historical-chart-header">
                    <h4 className="historical-chart-title">
                      {getIndicatorDisplayName(selectedIndicator)}
                    </h4>
                    {chartData.length > 0 && (
                      <p className="historical-chart-meta">
                        {chartData[0]?.year} - {chartData[chartData.length - 1]?.year} ({chartData.length} data points)
                      </p>
                    )}
                  </div>

                  {chartError ? (
                    <div className="historical-chart-error">
                      <AlertCircle className="w-4 h-4" />
                      <span>{chartError}</span>
                    </div>
                  ) : (
                    <div className="historical-chart-container">
                      <TimeSeriesChart
                        data={chartData}
                        indicatorName={getIndicatorDisplayName(selectedIndicator)}
                        height={300}
                        color={indicator.color}
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })()
          ) : (
            <div className="historical-trends-empty">
              <p className="text-slate-400 text-center py-8">Select an indicator above to view historical trends</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


