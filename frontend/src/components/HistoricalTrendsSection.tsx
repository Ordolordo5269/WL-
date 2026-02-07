import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import TimeSeriesChart from './TimeSeriesChart';
import { historicalIndicatorsService, TimeSeriesPoint } from '../services/historical-indicators.service';
import { societyService } from '../services/society-service';

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
  { slug: 'life-expectancy', name: 'Life Expectancy', code: 'SP.DYN.LE00.IN', color: '#10b981', category: 'society' },
  { slug: 'literacy', name: 'Adult Literacy', code: 'SE.ADT.LITR.ZS', color: '#3b82f6', category: 'society' },
  { slug: 'uhc-coverage', name: 'UHC Coverage', code: 'SH.UHC.SRVS.CV.XD', color: '#8b5cf6', category: 'society' },
  { slug: 'population-growth', name: 'Population Growth', code: 'SP.POP.GROW', color: '#22d3ee', category: 'society' },
  { slug: 'birth-rate', name: 'Birth Rate', code: 'SP.DYN.CBRT.IN', color: '#ec4899', category: 'society' },
  { slug: 'death-rate', name: 'Death Rate', code: 'SP.DYN.CDRT.IN', color: '#f59e0b', category: 'society' },
  { slug: 'urban-population', name: 'Urban Population', code: 'SP.URB.TOTL.IN.ZS', color: '#06b6d4', category: 'society' },
  { slug: 'population-density', name: 'Population Density', code: 'SP.POP.DNST', color: '#f97316', category: 'society' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment', code: 'SE.PRM.NENR', color: '#14b8a6', category: 'society' },
  { slug: 'poverty', name: 'Extreme Poverty', code: 'SI.POV.DDAY', color: '#ef4444', category: 'society' }
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
const ALL_INDICATORS = [...ECONOMIC_INDICATORS, ...SOCIETY_INDICATORS, ...POLITICS_INDICATORS, ...DEFENSE_INDICATORS, ...INTERNATIONAL_INDICATORS];

export default function HistoricalTrendsSection({ iso3, countryName, fetchSocietyIndicatorSeries }: HistoricalTrendsSectionProps) {
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
      // If already loaded, don't reload
      if (timeSeriesData[selectedIndicator]) return;
      
      setLoading(prev => ({ ...prev, [selectedIndicator]: true }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[selectedIndicator];
        return newErrors;
      });

      try {
        const indicator = ALL_INDICATORS.find(ind => ind.slug === selectedIndicator);
        if (!indicator) return;

        let data: TimeSeriesPoint[] = [];
        
        if (indicator.category === 'economic' || indicator.category === 'politics' || indicator.category === 'defense' || indicator.category === 'international') {
          // Use historical indicators service for economic, politics, defense, and international data
          data = await historicalIndicatorsService.getTimeSeries(selectedIndicator, iso3);
        } else if (indicator.category === 'society' && fetchSocietyIndicatorSeries) {
          // Use society service for society data
          data = await fetchSocietyIndicatorSeries(indicator.code, 30);
        } else if (indicator.category === 'society') {
          // Fallback to direct World Bank API
          data = await societyService.fetchWorldBankSeries(iso3, indicator.code, 30);
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
  }, [iso3, selectedIndicator, fetchSocietyIndicatorSeries]);

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
    const indicator = ALL_INDICATORS.find(ind => ind.slug === slug);
    if (!indicator) return slug;
    
    if (indicator.category === 'economic') {
      return historicalIndicatorsService.getIndicatorName(slug);
    } else if (indicator.category === 'society') {
      // Society indicator
      const societyInd = SOCIETY_INDICATORS.find(ind => ind.slug === slug);
      if (societyInd) {
        const unitMap: Record<string, string> = {
          'SP.DYN.LE00.IN': 'years',
          'SE.ADT.LITR.ZS': '%',
          'SH.UHC.SRVS.CV.XD': 'index',
          'SP.POP.GROW': '%',
          'SP.DYN.CBRT.IN': 'per 1,000',
          'SP.DYN.CDRT.IN': 'per 1,000',
          'SP.URB.TOTL.IN.ZS': '%',
          'SP.POP.DNST': 'per km²',
          'SE.PRM.NENR': '%',
          'SI.POV.DDAY': '%'
        };
        return `${societyInd.name} (${unitMap[societyInd.code] || ''})`;
      }
    } else if (indicator.category === 'politics') {
      // Politics indicators - WGI indices
      const unitMap: Record<string, string> = {
        'political-stability': 'index',
        'voice-accountability': 'index',
        'government-effectiveness': 'index',
        'regulatory-quality': 'index',
        'rule-of-law': 'index',
        'control-of-corruption': 'index'
      };
      return `${indicator.name} (${unitMap[slug] || 'index'})`;
    } else if (indicator.category === 'defense') {
      // Defense indicators
      const unitMap: Record<string, string> = {
        'military-expenditure-pct-gdp': '%',
        'military-expenditure-usd': 'USD',
        'armed-forces-personnel': 'people',
        'arms-imports': 'TIV',
        'arms-exports': 'TIV',
        'battle-deaths': 'people'
      };
      return `${indicator.name} (${unitMap[slug] || ''})`;
    } else if (indicator.category === 'international') {
      // International indicators
      const unitMap: Record<string, string> = {
        'oda-received': 'USD',
        'trade-percent-gdp': '%',
        'current-account': 'USD',
        'fdi-inflows': 'USD',
        'fdi-outflows': 'USD',
        'remittances': 'USD'
      };
      return `${indicator.name} (${unitMap[slug] || 'USD'})`;
    }
    return slug;
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

