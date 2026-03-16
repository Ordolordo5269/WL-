import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import TimeSeriesChart from '../../../components/ui/TimeSeriesChart';
import { historicalIndicatorsService } from '../../world-map/services/historical-indicators.service';
import type { TimeSeriesPoint } from '../../world-map/services/historical-indicators.service';

interface HistoricalTrendsSectionProps {
  iso3: string | null;
  countryName: string | null;
  fetchSocietyIndicatorSeries?: (indicatorCode: string, limitYears?: number) => Promise<Array<{ year: number; value: number | null }>>;
}

// Economic Indicators
const ECONOMIC_INDICATORS = [
  { slug: 'gdp', name: 'GDP', color: '#3b82f6', category: 'economic' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita', color: '#10b981', category: 'economic' },
  { slug: 'inflation', name: 'Inflation', color: '#f59e0b', category: 'economic' },
  { slug: 'gini', name: 'GINI Index', color: '#ef4444', category: 'economic' },
  { slug: 'exports', name: 'Exports', color: '#8b5cf6', category: 'economic' },
  { slug: 'imports', name: 'Imports', color: '#ec4899', category: 'economic' },
  { slug: 'unemployment', name: 'Unemployment', color: '#06b6d4', category: 'economic' },
  { slug: 'debt', name: 'External Debt', color: '#f97316', category: 'economic' }
];

// Society Indicators
const SOCIETY_INDICATORS = [
  { slug: 'life-expectancy', name: 'Life Expectancy', color: '#10b981', category: 'society' },
  { slug: 'literacy', name: 'Adult Literacy', color: '#3b82f6', category: 'society' },
  { slug: 'uhc-coverage', name: 'UHC Coverage', color: '#8b5cf6', category: 'society' },
  { slug: 'population-growth', name: 'Population Growth', color: '#22d3ee', category: 'society' },
  { slug: 'birth-rate', name: 'Birth Rate', color: '#ec4899', category: 'society' },
  { slug: 'death-rate', name: 'Death Rate', color: '#f59e0b', category: 'society' },
  { slug: 'urban-population', name: 'Urban Population', color: '#06b6d4', category: 'society' },
  { slug: 'population-density', name: 'Population Density', color: '#f97316', category: 'society' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment', color: '#14b8a6', category: 'society' },
  { slug: 'poverty', name: 'Extreme Poverty', color: '#ef4444', category: 'society' }
];

// Politics Indicators (WGI)
const POLITICS_INDICATORS = [
  { slug: 'political-stability', name: 'Political Stability', color: '#a855f7', category: 'politics' },
  { slug: 'voice-accountability', name: 'Voice & Accountability', color: '#6366f1', category: 'politics' },
  { slug: 'government-effectiveness', name: 'Government Effectiveness', color: '#8b5cf6', category: 'politics' },
  { slug: 'regulatory-quality', name: 'Regulatory Quality', color: '#7c3aed', category: 'politics' },
  { slug: 'rule-of-law', name: 'Rule of Law', color: '#9333ea', category: 'politics' },
  { slug: 'control-of-corruption', name: 'Control of Corruption', color: '#c026d3', category: 'politics' }
];

// Defense Indicators
const DEFENSE_INDICATORS = [
  { slug: 'military-expenditure-pct-gdp', name: 'Military Expenditure (% GDP)', color: '#dc2626', category: 'defense' },
  { slug: 'military-expenditure-usd', name: 'Military Expenditure (USD)', color: '#ef4444', category: 'defense' },
  { slug: 'armed-forces-personnel', name: 'Armed Forces Personnel', color: '#f87171', category: 'defense' },
  { slug: 'arms-imports', name: 'Arms Imports', color: '#fb923c', category: 'defense' },
  { slug: 'arms-exports', name: 'Arms Exports', color: '#f97316', category: 'defense' },
  { slug: 'battle-deaths', name: 'Battle-Related Deaths', color: '#991b1b', category: 'defense' }
];

// International Indicators
const INTERNATIONAL_INDICATORS = [
  { slug: 'oda-received', name: 'ODA Received', color: '#06b6d4', category: 'international' },
  { slug: 'trade-percent-gdp', name: 'Trade (% GDP)', color: '#0891b2', category: 'international' },
  { slug: 'current-account', name: 'Current Account', color: '#0e7490', category: 'international' },
  { slug: 'fdi-inflows', name: 'FDI Inflows', color: '#155e75', category: 'international' },
  { slug: 'fdi-outflows', name: 'FDI Outflows', color: '#164e63', category: 'international' },
  { slug: 'remittances', name: 'Remittances', color: '#0c4a6e', category: 'international' }
];

// Combined indicators
const ALL_INDICATORS: Array<{ slug: string; name: string; color: string; category: string }> = [...ECONOMIC_INDICATORS, ...SOCIETY_INDICATORS, ...POLITICS_INDICATORS, ...DEFENSE_INDICATORS, ...INTERNATIONAL_INDICATORS];

export default function HistoricalTrendsSection({ iso3, countryName: _countryName }: HistoricalTrendsSectionProps) {
  // Only one indicator can be selected at a time
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>('gdp');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'economic' | 'society' | 'politics' | 'defense' | 'international'>('all');
  const [timeSeriesData, setTimeSeriesData] = useState<Record<string, TimeSeriesPoint[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!iso3 || !selectedIndicator) return;

    // Load data for the selected indicator only
    const loadData = async () => {
      // If already loaded with actual data, don't reload
      const cached = timeSeriesData[selectedIndicator];
      if (cached && cached.length > 0) return;

      setLoading(prev => ({ ...prev, [selectedIndicator]: true }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[selectedIndicator];
        return newErrors;
      });

      try {
        const indicator = ALL_INDICATORS.find(ind => ind.slug === selectedIndicator);
        if (!indicator) return;

        // All categories use the same backend endpoint via slug mapping
        const rawData = await historicalIndicatorsService.getTimeSeries(selectedIndicator, iso3);

        // Filter out null-value data points so charts only receive usable data
        const data = rawData.filter(d => d.value !== null && d.value !== undefined);

        if (data.length === 0) {
          setErrors(prev => ({
            ...prev,
            [selectedIndicator]: 'No historical data available for this indicator'
          }));
        }

        setTimeSeriesData(prev => ({ ...prev, [selectedIndicator]: data }));
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          [selectedIndicator]: error instanceof Error ? error.message : 'Failed to load data'
        }));
      } finally {
        setLoading(prev => ({ ...prev, [selectedIndicator]: false }));
      }
    };

    loadData();
  }, [iso3, selectedIndicator]);

  const selectIndicator = (slug: string) => {
    // If clicking the same indicator, deselect it (toggle off)
    if (selectedIndicator === slug) {
      setSelectedIndicator(null);
    } else {
      setSelectedIndicator(slug);
    }
  };

  if (!iso3) {
    return (
      <div className="p-4 text-center text-slate-400">
        <p>Select a country to view historical trends</p>
      </div>
    );
  }

  // Filter indicators by category
  const filteredIndicators = selectedCategory === 'all' 
    ? ALL_INDICATORS 
    : ALL_INDICATORS.filter(ind => ind.category === selectedCategory);

  const getIndicatorDisplayName = (slug: string): string => {
    return historicalIndicatorsService.getIndicatorName(slug);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="historical-trends-content"
    >
      {/* Category Filter */}
      <div className="historical-category-filter">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'all' ? 'category-all-active' : ''}`}
        >
          All
        </button>
        <button
          onClick={() => {
            setSelectedCategory('economic');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'economic' ? 'category-economic-active' : ''}`}
        >
          Economic
        </button>
        <button
          onClick={() => {
            setSelectedCategory('society');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'society' ? 'category-society-active' : ''}`}
        >
          Society
        </button>
        <button
          onClick={() => {
            setSelectedCategory('politics');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'politics' ? 'category-politics-active' : ''}`}
        >
          Politics
        </button>
        <button
          onClick={() => {
            setSelectedCategory('defense');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'defense' ? 'category-defense-active' : ''}`}
        >
          Defense
        </button>
        <button
          onClick={() => {
            setSelectedCategory('international');
            setSelectedIndicator(null);
          }}
          className={`historical-category-btn ${selectedCategory === 'international' ? 'category-international-active' : ''}`}
        >
          International
        </button>
      </div>

      {/* Indicator selector - Modern Dark Style (Single Selection) */}
      <div className="historical-indicator-selector">
        {filteredIndicators.map(indicator => {
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

      {/* Single Chart Display */}
      {selectedIndicator ? (
        (() => {
          const indicator = ALL_INDICATORS.find(ind => ind.slug === selectedIndicator);
          if (!indicator) return null;

          const data = timeSeriesData[selectedIndicator] || [];
          const isLoading = loading[selectedIndicator];
          const error = errors[selectedIndicator];

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
                {data.length > 0 && (
                  <p className="historical-chart-meta">
                    {data[0]?.year} - {data[data.length - 1]?.year} ({data.length} data points)
                  </p>
                )}
              </div>

              {error ? (
                <div className="historical-chart-error">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="historical-chart-container">
                  <TimeSeriesChart
                    data={data}
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
          <p>Select an indicator above to view historical trends</p>
        </div>
      )}
    </motion.div>
  );
}

