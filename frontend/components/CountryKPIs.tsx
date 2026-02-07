import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CountryBasicInfo } from '../services/country-basic-info.service';
import { countryBasicInfoService } from '../services/country-basic-info.service';
import { economyService } from '../services/economy-service.ts';
import { historicalIndicatorsService, TimeSeriesPoint } from '../services/historical-indicators.service';
import { societyService } from '../services/society-service';

interface CountryKPIsProps {
  countryData: CountryBasicInfo | null;
  economyData: any;
  isLoading?: boolean;
}

interface TrendData {
  value: number | null;
  changePercent: number | null;
  isPositive: boolean;
}

export default function CountryKPIs({ countryData, economyData, isLoading }: CountryKPIsProps) {
  const [gdpTrend, setGdpTrend] = useState<TrendData>({ value: null, changePercent: null, isPositive: true });
  const [populationTrend, setPopulationTrend] = useState<TrendData>({ value: null, changePercent: null, isPositive: true });
  const [inflationTrend, setInflationTrend] = useState<TrendData>({ value: null, changePercent: null, isPositive: false });
  const [trendsLoading, setTrendsLoading] = useState(true);

  const iso3 = countryData?.cca3 || null;

  // Calculate trend from time series data
  const calculateTrend = (series: TimeSeriesPoint[]): TrendData => {
    if (!series || series.length < 2) {
      return { value: null, changePercent: null, isPositive: true };
    }

    // Get last two valid data points
    const validPoints = series.filter(p => p.value !== null && p.value !== undefined);
    if (validPoints.length < 2) {
      return { value: null, changePercent: null, isPositive: true };
    }

    const latest = validPoints[validPoints.length - 1];
    const previous = validPoints[validPoints.length - 2];

    if (latest.value === null || previous.value === null) {
      return { value: null, changePercent: null, isPositive: true };
    }

    const change = ((latest.value - previous.value) / previous.value) * 100;
    const isPositive = change > 0;

    return {
      value: latest.value,
      changePercent: Math.abs(change),
      isPositive
    };
  };

  // Fetch historical data and calculate trends
  useEffect(() => {
    if (!iso3 || isLoading) {
      setTrendsLoading(false);
      return;
    }

    const loadTrends = async () => {
      setTrendsLoading(true);
      try {
        // Load GDP time series (last 5 years for trend calculation)
        const currentYear = new Date().getFullYear();
        const gdpSeries = await historicalIndicatorsService.getTimeSeries('gdp', iso3, currentYear - 5, currentYear);

        // Calculate GDP trend
        const gdpTrendData = calculateTrend(gdpSeries);
        setGdpTrend(gdpTrendData);

        // Inflation doesn't need trend calculation - it's already a rate of change
        // Get the value directly from DB via economyData
        const inflationValue = economyData?.inflation_rate_percent || null;
        setInflationTrend({
          value: inflationValue,
          changePercent: null,
          isPositive: false
        });

        // For population, get growth rate from DB first, then fallback to World Bank
        const populationValue = countryData?.population || null;
        if (populationValue && iso3) {
          try {
            // Try to get population growth from DB first
            let growthSeries: TimeSeriesPoint[] = [];
            try {
              growthSeries = await historicalIndicatorsService.getTimeSeries('population-growth', iso3, currentYear - 5, currentYear);
            } catch (dbError) {
              // If DB doesn't have it, fallback to World Bank API
              console.log('Population growth not in DB, using World Bank API');
            }
            
            // If DB didn't return data, try World Bank API
            if (growthSeries.length === 0) {
              growthSeries = await societyService.fetchWorldBankSeries(iso3, 'SP.POP.GROW', 5);
            }
            
            // Get the latest growth rate value
            const validGrowth = growthSeries.filter(p => p.value !== null && p.value !== undefined);
            const latestGrowth = validGrowth.length > 0 ? validGrowth[validGrowth.length - 1].value : null;
            
            if (latestGrowth !== null) {
              // Population growth is already a percentage, use it directly
              setPopulationTrend({
                value: populationValue,
                changePercent: Math.abs(latestGrowth),
                isPositive: latestGrowth > 0
              });
            } else {
              // Fallback: try to calculate from population total series if available
              try {
                const populationSeries = await societyService.fetchWorldBankSeries(iso3, 'SP.POP.TOTL', 5);
                const populationTrendData = calculateTrend(populationSeries);
                setPopulationTrend({
                  value: populationValue,
                  changePercent: populationTrendData.changePercent,
                  isPositive: populationTrendData.isPositive
                });
              } catch (error) {
                setPopulationTrend({
                  value: populationValue,
                  changePercent: null,
                  isPositive: true
                });
              }
            }
          } catch (error) {
            console.error('Error fetching population growth:', error);
            setPopulationTrend({
              value: populationValue,
              changePercent: null,
              isPositive: true
            });
          }
        } else if (populationValue) {
          setPopulationTrend({
            value: populationValue,
            changePercent: null,
            isPositive: true
          });
        }
      } catch (error) {
        console.error('Error loading trends:', error);
      } finally {
        setTrendsLoading(false);
      }
    };

    loadTrends();
  }, [iso3, countryData, isLoading]);

  if (isLoading || !countryData) {
    return (
      <div className="country-kpis-zone">
        <div className="country-kpi-card">
          <div className="country-kpi-label">GDP</div>
          <div className="country-kpi-value">—</div>
        </div>
        <div className="country-kpi-card">
          <div className="country-kpi-label">Population</div>
          <div className="country-kpi-value">—</div>
        </div>
        <div className="country-kpi-card">
          <div className="country-kpi-label">Inflation</div>
          <div className="country-kpi-value">—</div>
        </div>
      </div>
    );
  }

  // Use data from DB (economyData) or calculated trends, prioritizing DB values
  // For display, use the latest value from DB, but show trend from historical comparison
  const gdp = economyData?.gdp_usd || gdpTrend.value || null;
  const inflation = economyData?.inflation_rate_percent || inflationTrend.value || null;
  const population = populationTrend.value || countryData.population;
  
  // If we have DB values but no trend calculated, use DB value but show no trend
  // If we calculated trend, use that value and show the trend
  const displayGdpTrend = gdpTrend.changePercent !== null ? gdpTrend : { changePercent: null, isPositive: true };
  const displayInflationTrend = inflationTrend.changePercent !== null ? inflationTrend : { changePercent: null, isPositive: false };

  // Get trend indicators based on calculated changes
  const getTrendIcon = (trend: TrendData) => {
    if (trend.changePercent === null) return <Minus className="w-4 h-4" />;
    return trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getTrendColor = (trend: TrendData, isPositiveBetter: boolean = true) => {
    if (trend.changePercent === null) return 'rgba(255, 255, 255, 0.3)';
    
    // For inflation, lower is better; for GDP/population, higher is better
    const isGood = isPositiveBetter ? trend.isPositive : !trend.isPositive;
    return isGood ? '#10b981' : '#ef4444';
  };

  const formatTrendChange = (changePercent: number | null) => {
    if (changePercent === null) return '—';
    return `${changePercent.toFixed(2)}%`;
  };

  return (
    <div className="country-kpis-zone">
      {/* GDP KPI */}
      <div className="country-kpi-card">
        <div className="country-kpi-label">GDP</div>
        <div className="country-kpi-value">
          {gdp !== null ? economyService.formatCurrency(gdp) : 'N/A'}
        </div>
        {displayGdpTrend.changePercent !== null && (
          <div className="country-kpi-trend" style={{ color: getTrendColor(displayGdpTrend, true) }}>
            {getTrendIcon(displayGdpTrend)}
            <span>{formatTrendChange(displayGdpTrend.changePercent)}</span>
          </div>
        )}
        {displayGdpTrend.changePercent === null && gdp !== null && (
          <div className="country-kpi-trend" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            <Minus className="w-4 h-4" />
            <span>—</span>
          </div>
        )}
      </div>

      {/* Population KPI */}
      <div className="country-kpi-card">
        <div className="country-kpi-label">Population</div>
        <div className="country-kpi-value">
          {countryBasicInfoService.formatPopulation(population)}
        </div>
        {populationTrend.changePercent !== null ? (
          <div className="country-kpi-trend" style={{ color: getTrendColor(populationTrend, true) }}>
            {getTrendIcon(populationTrend)}
            <span>{formatTrendChange(populationTrend.changePercent)}</span>
          </div>
        ) : (
          <div className="country-kpi-trend" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            <Minus className="w-4 h-4" />
            <span>—</span>
          </div>
        )}
      </div>

      {/* Inflation KPI */}
      <div className="country-kpi-card">
        <div className="country-kpi-label">Inflation</div>
        <div className="country-kpi-value">
          {inflation !== null ? `${inflation.toFixed(2)}%` : 'N/A'}
        </div>
        {displayInflationTrend.changePercent !== null && (
          <div className="country-kpi-trend" style={{ color: getTrendColor(displayInflationTrend, false) }}>
            {getTrendIcon(displayInflationTrend)}
            <span>{formatTrendChange(displayInflationTrend.changePercent)}</span>
          </div>
        )}
        {displayInflationTrend.changePercent === null && inflation !== null && (
          <div className="country-kpi-trend" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            <Minus className="w-4 h-4" />
            <span>—</span>
          </div>
        )}
      </div>
    </div>
  );
}

