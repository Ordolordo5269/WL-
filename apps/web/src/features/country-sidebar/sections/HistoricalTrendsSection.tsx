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

// Health Indicators
const HEALTH_INDICATORS = [
  { slug: 'health-expenditure', name: 'Health Expenditure', color: '#f43f5e', category: 'health' },
  { slug: 'physicians', name: 'Physicians', color: '#ec4899', category: 'health' },
  { slug: 'hospital-beds', name: 'Hospital Beds', color: '#be185d', category: 'health' },
  { slug: 'infant-mortality', name: 'Infant Mortality', color: '#f97316', category: 'health' },
  { slug: 'maternal-mortality', name: 'Maternal Mortality', color: '#dc2626', category: 'health' },
  { slug: 'immunization-measles', name: 'Immunization Measles', color: '#10b981', category: 'health' },
  { slug: 'undernourishment', name: 'Undernourishment', color: '#eab308', category: 'health' },
];

// Education Indicators
const EDUCATION_INDICATORS = [
  { slug: 'education-expenditure', name: 'Education Expenditure', color: '#6366f1', category: 'education' },
  { slug: 'secondary-enrollment', name: 'Secondary Enrollment', color: '#8b5cf6', category: 'education' },
  { slug: 'tertiary-enrollment', name: 'Tertiary Enrollment', color: '#a855f7', category: 'education' },
  { slug: 'pupil-teacher-ratio', name: 'Pupil-Teacher Ratio', color: '#7c3aed', category: 'education' },
  { slug: 'out-of-school', name: 'Out of School Children', color: '#ef4444', category: 'education' },
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

// Technology Indicators
const TECHNOLOGY_INDICATORS = [
  { slug: 'rnd-expenditure', name: 'R&D Expenditure', color: '#6366f1', category: 'technology' },
  { slug: 'high-tech-exports', name: 'High-Tech Exports (USD)', color: '#818cf8', category: 'technology' },
  { slug: 'researchers', name: 'Researchers', color: '#a5b4fc', category: 'technology' },
  { slug: 'patents', name: 'Patent Applications', color: '#4f46e5', category: 'technology' },
  { slug: 'journal-articles', name: 'Journal Articles', color: '#7c3aed', category: 'technology' },
  { slug: 'broadband', name: 'Broadband', color: '#8b5cf6', category: 'technology' },
];

// Infrastructure Indicators
const INFRASTRUCTURE_INDICATORS = [
  { slug: 'internet-users', name: 'Internet Users', color: '#14b8a6', category: 'infrastructure' },
  { slug: 'mobile-subscriptions', name: 'Mobile Subscriptions', color: '#06b6d4', category: 'infrastructure' },
  { slug: 'access-electricity', name: 'Access to Electricity', color: '#eab308', category: 'infrastructure' },
  { slug: 'air-transport', name: 'Air Transport', color: '#0ea5e9', category: 'infrastructure' },
  { slug: 'secure-servers', name: 'Secure Servers', color: '#0284c7', category: 'infrastructure' },
];

// Raw Materials / Commodities Indicators
const COMMODITIES_INDICATORS = [
  { slug: 'energy-imports', name: 'Energy Imports', color: '#d97706', category: 'commodities' },
  { slug: 'fuel-exports', name: 'Fuel Exports', color: '#f59e0b', category: 'commodities' },
  { slug: 'fuel-imports', name: 'Fuel Imports', color: '#fbbf24', category: 'commodities' },
  { slug: 'energy-use-per-capita', name: 'Energy Use/Capita', color: '#b45309', category: 'commodities' },
  { slug: 'electricity-renewables', name: 'Electricity Renewables', color: '#10b981', category: 'commodities' },
  { slug: 'mineral-rents', name: 'Mineral Rents', color: '#78716c', category: 'commodities' },
  { slug: 'ore-metal-exports', name: 'Ore & Metal Exports', color: '#a8a29e', category: 'commodities' },
  { slug: 'cereal-production', name: 'Cereal Production', color: '#84cc16', category: 'commodities' },
  { slug: 'arable-land', name: 'Arable Land', color: '#22c55e', category: 'commodities' },
];

// Environment Indicators
const ENVIRONMENT_INDICATORS = [
  { slug: 'co2-per-capita', name: 'CO2 per Capita', color: '#78716c', category: 'environment' },
  { slug: 'co2-total', name: 'CO2 Total', color: '#a8a29e', category: 'environment' },
  { slug: 'forest-area', name: 'Forest Area', color: '#22c55e', category: 'environment' },
  { slug: 'pm25', name: 'PM2.5 Pollution', color: '#f97316', category: 'environment' },
  { slug: 'renewable-energy', name: 'Renewable Energy', color: '#10b981', category: 'environment' },
  { slug: 'clean-water', name: 'Clean Water Access', color: '#06b6d4', category: 'environment' },
  { slug: 'renewable-electricity', name: 'Renewable Electricity', color: '#14b8a6', category: 'environment' },
  { slug: 'protected-areas', name: 'Protected Areas', color: '#16a34a', category: 'environment' },
  { slug: 'methane-emissions', name: 'Methane Emissions', color: '#dc2626', category: 'environment' },
];

type CategoryKey = 'all' | 'economic' | 'society' | 'health' | 'education' | 'politics' | 'defense' | 'international' | 'technology' | 'infrastructure' | 'commodities' | 'environment';

// Combined indicators
const ALL_INDICATORS: Array<{ slug: string; name: string; color: string; category: string }> = [
  ...ECONOMIC_INDICATORS,
  ...SOCIETY_INDICATORS,
  ...HEALTH_INDICATORS,
  ...EDUCATION_INDICATORS,
  ...POLITICS_INDICATORS,
  ...DEFENSE_INDICATORS,
  ...INTERNATIONAL_INDICATORS,
  ...TECHNOLOGY_INDICATORS,
  ...INFRASTRUCTURE_INDICATORS,
  ...COMMODITIES_INDICATORS,
  ...ENVIRONMENT_INDICATORS,
];

const CATEGORY_BUTTONS: Array<{ key: CategoryKey; label: string; cssClass: string }> = [
  { key: 'all', label: 'All', cssClass: 'category-all-active' },
  { key: 'economic', label: 'Economic', cssClass: 'category-economic-active' },
  { key: 'society', label: 'Society', cssClass: 'category-society-active' },
  { key: 'health', label: 'Health', cssClass: 'category-health-active' },
  { key: 'education', label: 'Education', cssClass: 'category-education-active' },
  { key: 'politics', label: 'Politics', cssClass: 'category-politics-active' },
  { key: 'defense', label: 'Defense', cssClass: 'category-defense-active' },
  { key: 'international', label: 'International', cssClass: 'category-international-active' },
  { key: 'technology', label: 'Technology', cssClass: 'category-technology-active' },
  { key: 'infrastructure', label: 'Infrastructure', cssClass: 'category-infrastructure-active' },
  { key: 'commodities', label: 'Raw Materials', cssClass: 'category-commodities-active' },
  { key: 'environment', label: 'Environment', cssClass: 'category-environment-active' },
];

export default function HistoricalTrendsSection({ iso3, countryName: _countryName }: HistoricalTrendsSectionProps) {
  // Only one indicator can be selected at a time
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>('gdp');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
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
        {CATEGORY_BUTTONS.map(cat => (
          <button
            key={cat.key}
            onClick={() => {
              setSelectedCategory(cat.key);
              setSelectedIndicator(null);
            }}
            className={`historical-category-btn ${selectedCategory === cat.key ? cat.cssClass : ''}`}
          >
            {cat.label}
          </button>
        ))}
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
