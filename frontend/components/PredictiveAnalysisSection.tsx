import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, Lightbulb, Loader2, Globe,
  DollarSign, Users, TrendingUp as TrendUp, Gauge, ArrowUpDown, FileText, 
  Building2, Briefcase, Heart, BookOpen, AlertTriangle, Activity, Baby, 
  UserMinus, MapPin, Users2, HeartPulse, GraduationCap, Scale, Shield,
  X, ChevronRight, BarChart3, Zap, Target, Award
} from 'lucide-react';
import { predictionService, PredictionResult, DeepSeekInsight } from '../services/prediction.service';
import TimeSeriesChart from './TimeSeriesChart';
import CountrySelector, { Country as CountrySelectorCountry } from './CountrySelector';
import '../src/styles/predictive-analysis.css';

interface PredictiveAnalysisSectionProps {
  iso3: string | null;
  countryName: string | null;
}

interface Country {
  name: {
    common: string;
    official: string;
  };
  cca3: string;
  flags?: {
    png?: string;
    svg?: string;
  };
}

// Iconos para cada indicador - retorna el componente de icono
const getIndicatorIconComponent = (slug: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'gdp': DollarSign,
    'gdp-per-capita': Users,
    'inflation': TrendUp,
    'gini': Gauge,
    'exports': ArrowUpDown,
    'imports': ArrowUpDown,
    'unemployment': Briefcase,
    'debt': FileText,
    'life-expectancy': Heart,
    'literacy': BookOpen,
    'poverty': AlertTriangle,
    'uhc-coverage': Activity,
    'primary-enrollment': GraduationCap,
    'population-growth': Users2,
    'birth-rate': Baby,
    'death-rate': UserMinus,
    'urban-population': Building2,
    'population-density': MapPin,
    'infant-mortality': HeartPulse,
    'fertility-rate': Baby,
    'political-stability': Shield,
    'voice-accountability': Users,
    'government-effectiveness': Building2,
    'regulatory-quality': Scale,
    'rule-of-law': Scale,
    'control-corruption': Shield
  };
  const IconComponent = iconMap[slug] || BarChart3;
  return <IconComponent className="w-5 h-5" />;
};

// Indicadores organizados por categoría con iconos
const ECONOMY_INDICATORS = [
  { slug: 'gdp', name: 'GDP', color: '#3b82f6' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita', color: '#10b981' },
  { slug: 'inflation', name: 'Inflation', color: '#f59e0b' },
  { slug: 'gini', name: 'GINI Index', color: '#ef4444' },
  { slug: 'exports', name: 'Exports', color: '#8b5cf6' },
  { slug: 'imports', name: 'Imports', color: '#ec4899' },
  { slug: 'unemployment', name: 'Unemployment', color: '#06b6d4' },
  { slug: 'debt', name: 'External Debt', color: '#f97316' }
];

const SOCIETY_INDICATORS = [
  { slug: 'life-expectancy', name: 'Life Expectancy', color: '#10b981' },
  { slug: 'literacy', name: 'Adult Literacy', color: '#3b82f6' },
  { slug: 'poverty', name: 'Extreme Poverty', color: '#ef4444' },
  { slug: 'uhc-coverage', name: 'UHC Coverage', color: '#8b5cf6' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment', color: '#14b8a6' },
  { slug: 'population-growth', name: 'Population Growth', color: '#22d3ee' },
  { slug: 'birth-rate', name: 'Birth Rate', color: '#ec4899' },
  { slug: 'death-rate', name: 'Death Rate', color: '#f59e0b' },
  { slug: 'urban-population', name: 'Urban Population', color: '#06b6d4' },
  { slug: 'population-density', name: 'Population Density', color: '#f97316' },
  { slug: 'infant-mortality', name: 'Infant Mortality', color: '#dc2626' },
  { slug: 'fertility-rate', name: 'Fertility Rate', color: '#a855f7' }
];

const POLITICS_INDICATORS = [
  { slug: 'political-stability', name: 'Political Stability', color: '#3b82f6' },
  { slug: 'voice-accountability', name: 'Voice & Accountability', color: '#10b981' },
  { slug: 'government-effectiveness', name: 'Government Effectiveness', color: '#8b5cf6' },
  { slug: 'regulatory-quality', name: 'Regulatory Quality', color: '#f59e0b' },
  { slug: 'rule-of-law', name: 'Rule of Law', color: '#06b6d4' },
  { slug: 'control-corruption', name: 'Control of Corruption', color: '#ef4444' }
];

type IndicatorCategory = 'Economy' | 'Society' | 'Politics';

const INDICATORS_BY_CATEGORY: Record<IndicatorCategory, typeof ECONOMY_INDICATORS> = {
  Economy: ECONOMY_INDICATORS,
  Society: SOCIETY_INDICATORS,
  Politics: POLITICS_INDICATORS
};

export default function PredictiveAnalysisSection({ iso3: propIso3, countryName: propCountryName }: PredictiveAnalysisSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory>('Economy');
  const [selectedIndicator, setSelectedIndicator] = useState<string>('gdp');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [insights, setInsights] = useState<DeepSeekInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Internal state for country selection
  const [selectedIso3, setSelectedIso3] = useState<string | null>(propIso3);
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(propCountryName);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Sync with props
  useEffect(() => {
    if (propIso3) {
      setSelectedIso3(propIso3);
      setSelectedCountryName(propCountryName);
    }
  }, [propIso3, propCountryName]);

  // Load countries list
  useEffect(() => {
    const loadCountries = async () => {
      if (countries.length > 0) return; // Already loaded
      setLoadingCountries(true);
      
      // Use the same API base URL as other services
      const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');
      
      try {
        // Try to load from /all endpoint first (this will try API, then DB, then cache)
        const response = await fetch(`${API_BASE_URL}/api/countries/all`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if we got data (even if there was a warning/error)
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          // Remove duplicates by cca3 code
          const uniqueCountries = Array.from(
            new Map(data.data.map((country: Country) => [country.cca3, country])).values()
          );
          console.log(`✅ Loaded ${uniqueCountries.length} unique countries from ${data.source || 'unknown source'} (${data.data.length} total, ${data.data.length - uniqueCountries.length} duplicates removed)`);
          setCountries(uniqueCountries);
        } else {
          // Fallback: try to use cached countries
          console.warn('No countries from /all endpoint, trying cache...');
          try {
            const cachedResponse = await fetch(`${API_BASE_URL}/api/countries`);
            if (cachedResponse.ok) {
              const cachedData = await cachedResponse.json();
              const cachedList = Array.isArray(cachedData.data) ? cachedData.data : [];
              if (cachedList.length > 0) {
                // Remove duplicates by cca3 code
                const uniqueCountries = Array.from(
                  new Map(cachedList.map((country: Country) => [country.cca3, country])).values()
                );
                console.log(`✅ Loaded ${uniqueCountries.length} unique countries from cache (${cachedList.length} total, ${cachedList.length - uniqueCountries.length} duplicates removed)`);
                setCountries(uniqueCountries);
              } else {
                console.warn('⚠️ Cache is empty, countries list will be limited');
              }
            }
          } catch (cacheErr) {
            console.error('❌ Failed to load cached countries:', cacheErr);
          }
        }
      } catch (err) {
        console.error('❌ Failed to load countries from /all endpoint:', err);
        // Last resort: try cache endpoint
        try {
          const cachedResponse = await fetch(`${API_BASE_URL}/api/countries`);
          if (cachedResponse.ok) {
            const cachedData = await cachedResponse.json();
            const cachedList = Array.isArray(cachedData.data) ? cachedData.data : [];
            if (cachedList.length > 0) {
              // Remove duplicates by cca3 code
              const uniqueCountries = Array.from(
                new Map(cachedList.map((country: Country) => [country.cca3, country])).values()
              );
              console.log(`✅ Loaded ${uniqueCountries.length} unique countries from cache (fallback) (${cachedList.length} total, ${cachedList.length - uniqueCountries.length} duplicates removed)`);
              setCountries(uniqueCountries);
            }
          }
        } catch (cacheErr) {
          console.error('❌ Failed to load cached countries:', cacheErr);
        }
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, [countries.length]);

  // Transform countries data to CountrySelector format
  const selectorCountries = useMemo<CountrySelectorCountry[]>(() => {
    return countries.map(country => ({
      iso3: country.cca3,
      name: country.name.common,
      flagUrl: country.flags?.png || country.flags?.svg
    }));
  }, [countries]);

  // Reset indicator when category changes
  useEffect(() => {
    const categoryIndicators = INDICATORS_BY_CATEGORY[selectedCategory];
    if (categoryIndicators.length > 0) {
      const firstIndicator = categoryIndicators[0].slug;
      if (selectedIndicator !== firstIndicator && !categoryIndicators.find(ind => ind.slug === selectedIndicator)) {
        setSelectedIndicator(firstIndicator);
      }
    }
  }, [selectedCategory, selectedIndicator]);

  useEffect(() => {
    if (!selectedIso3 || !selectedIndicator) return;
    
    loadPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIso3, selectedIndicator]);

  const loadPrediction = async () => {
    if (!selectedIso3) return;
    
    setLoading(true);
    setError(null);
    setInsights(null); // Limpiar insights al cambiar indicador
    
    try {
      const result = await predictionService.getPrediction(selectedIndicator, selectedIso3, 5);
      setPrediction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    if (!selectedIso3 || !selectedCountryName || !prediction) {
      console.warn('Cannot load insights: missing required data', { selectedIso3, selectedCountryName, prediction: !!prediction });
      return;
    }
    
    setLoadingInsights(true);
    setError(null); // Clear previous errors
    
    try {
      const categoryIndicators = INDICATORS_BY_CATEGORY[selectedCategory];
      const indicator = categoryIndicators.find(ind => ind.slug === selectedIndicator);
      const result = await predictionService.getInsights(
        selectedIso3,
        selectedIndicator,
        selectedCountryName,
        indicator?.name || selectedIndicator
      );
      setInsights(result.insights);
      setError(null); // Clear any previous errors on success
    } catch (err) {
      console.error('Failed to load insights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate insights';
      setError(errorMessage);
      // Don't clear insights if they exist, just show the error
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleCountrySelect = (iso3: string) => {
    const country = countries.find(c => c.cca3 === iso3);
    if (country) {
      setSelectedIso3(country.cca3);
      setSelectedCountryName(country.name.common);
    }
  };

  if (!selectedIso3) {
    return (
      <div className="predictions-section">
        <h2>Predictive Analysis</h2>
        <p>Select a country to view AI-powered forecasts and insights</p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="country-selector-container">
            <h3>
              <Globe className="w-5 h-5" />
              Search Country
            </h3>
            <CountrySelector
              countries={selectorCountries}
              onSelectCountry={handleCountrySelect}
              loading={loadingCountries}
              placeholder="Search countries by name or ISO3 code (e.g., Spain, USA, CHN)..."
              scrollTargetId="predictive-charts-section"
            />
          </div>
        </motion.div>

        {/* Empty state when no countries loaded */}
        {!loadingCountries && countries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="empty-state"
          >
            <AlertCircle className="empty-state-icon" />
            <h3>Unable to load countries</h3>
            <p>Please try refreshing the page</p>
          </motion.div>
        )}

        {/* Loading state */}
        {loadingCountries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="loading-state"
          >
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading countries...</p>
          </motion.div>
        )}
      </div>
    );
  }

  // Combinar datos históricos y proyección para la gráfica
  const currentYear = new Date().getFullYear();
  const scenarios = prediction?.scenarios || {
    base: prediction?.projection || [],
    optimistic: [],
    pessimistic: []
  };
  
  const combinedData = prediction ? [
    ...prediction.historical.map(d => ({ year: d.year, value: d.value })),
    ...scenarios.base.map(d => ({ year: d.year, value: d.value }))
  ] : [];

  const getTrendIcon = () => {
    if (!prediction) return null;
    const { direction } = prediction.trend;
    if (direction === 'up') return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (direction === 'down') return <TrendingDown className="w-5 h-5 text-red-400" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const formatValue = (value: number): string => {
    const categoryIndicators = INDICATORS_BY_CATEGORY[selectedCategory];
    const indicator = categoryIndicators.find(ind => ind.slug === selectedIndicator);
    if (indicator?.slug.includes('gdp') || indicator?.slug.includes('export') || indicator?.slug.includes('import') || indicator?.slug.includes('debt')) {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toLocaleString()}`;
    }
    if (indicator?.slug.includes('percent') || indicator?.slug.includes('rate') || indicator?.slug.includes('poverty') || indicator?.slug.includes('literacy')) {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
  };

  // Get country flag URL
  const selectedCountryData = countries.find(c => c.cca3 === selectedIso3);
  const countryFlagUrl = selectedCountryData?.flags?.png || selectedCountryData?.flags?.svg;

  return (
    <div className="predictions-section">
      {/* Country Header Banner */}
      {selectedCountryName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="country-header-banner"
        >
          <div className="country-header-banner-content">
            <div className="country-header-banner-left">
              {countryFlagUrl && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="country-header-banner-flag"
                >
                  <img
                    src={countryFlagUrl}
                    alt={selectedCountryName}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </motion.div>
              )}
              <div className="country-header-banner-info">
                <h2>{selectedCountryName}</h2>
                <p>AI-Powered Predictive Analysis</p>
              </div>
            </div>
            <div className="country-header-banner-actions">
              <button
                onClick={() => {
                  setSelectedIso3(null);
                  setSelectedCountryName(null);
                  setPrediction(null);
                  setInsights(null);
                }}
                className="action-button"
              >
                <X className="w-3.5 h-3.5" />
                Change Country
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadInsights();
                }}
                disabled={!prediction || loadingInsights}
                className="action-button action-button-primary"
                title={!prediction ? 'Generate a prediction first' : 'Generate AI-powered insights'}
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate AI Insights
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Selector */}
      <div className="category-buttons">
        {(['Economy', 'Society', 'Politics'] as IndicatorCategory[]).map(category => (
          <motion.button
            key={category}
            onClick={() => setSelectedCategory(category)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
          >
            {category === 'Economy' && <DollarSign className="w-4 h-4" />}
            {category === 'Society' && <Users className="w-4 h-4" />}
            {category === 'Politics' && <Shield className="w-4 h-4" />}
            {category}
          </motion.button>
        ))}
      </div>

      {/* Indicator Cards Grid */}
      <div className="indicator-grid">
        {INDICATORS_BY_CATEGORY[selectedCategory].map((ind, index) => (
          <motion.button
            key={ind.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedIndicator(ind.slug)}
            className={`indicator-card ${selectedIndicator === ind.slug ? 'active' : ''}`}
          >
            <div className="indicator-card-icon">
              {getIndicatorIconComponent(ind.slug)}
            </div>
            <p className="indicator-card-name">{ind.name}</p>
          </motion.button>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 flex items-start gap-2"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="relative inline-block">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
            <Sparkles className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-300 text-lg font-medium">Generating prediction...</p>
          <p className="text-slate-500 text-sm mt-2">Analyzing historical data and trends</p>
        </motion.div>
      ) : prediction ? (
        <>
          {/* Statistics Cards */}
          <div className="stats-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="stat-card"
            >
              <p className="stat-card-label">Trend</p>
              <p className="stat-card-value capitalize">{prediction.trend.direction}</p>
              <p className="stat-card-detail">{Math.abs(prediction.trend.rate).toFixed(2)}% annual</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -2 }}
              className="stat-card"
            >
              <p className="stat-card-label">Model Quality</p>
              <p className="stat-card-value">{(prediction.trend.rSquared * 100).toFixed(1)}%</p>
              <p className="stat-card-detail">R² score</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -2 }}
              className="stat-card"
            >
              <p className="stat-card-label">Projected (5 years)</p>
              <p className="stat-card-value">{formatValue(prediction.statistics.projectedValue)}</p>
              <p className="stat-card-detail">
                vs {formatValue(prediction.statistics.lastValue)} now
                {prediction.statistics.optimisticValue !== undefined && prediction.statistics.pessimisticValue !== undefined && (
                  <span className="block mt-1">
                    Range: {formatValue(prediction.statistics.pessimisticValue)} - {formatValue(prediction.statistics.optimisticValue)}
                  </span>
                )}
              </p>
            </motion.div>
          </div>

          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            id="predictive-charts-section"
            className="chart-section"
          >
            <h3>Historical Data + 5-Year Projection</h3>
            <p>{INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || 'Indicator'} forecast</p>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-rgba(71, 85, 105, 0.2)">
              <TimeSeriesChart
                data={combinedData}
                indicatorName={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || ''}
                height={400}
                color={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.color || '#3b82f6'}
                projectionStartYear={currentYear + 1}
                scenarios={scenarios}
              />
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-blue-400 rounded"></div>
                <span style={{ color: '#cbd5e1' }}>Historical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-blue-400 border-dashed border-t-2"></div>
                <span style={{ color: '#cbd5e1' }}>Base Projection</span>
              </div>
              {scenarios.optimistic.length > 0 && scenarios.pessimistic.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-green-500/40 rounded"></div>
                    <span style={{ color: '#cbd5e1' }}>Optimistic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-red-500/40 rounded"></div>
                    <span style={{ color: '#cbd5e1' }}>Pessimistic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-blue-500/20 rounded"></div>
                    <span style={{ color: '#cbd5e1' }}>Uncertainty Range</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* AI Insights Section */}
          <AnimatePresence>
            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="insights-section"
              >
                <h3>AI-Generated Insights</h3>
                
                <div className="space-y-4">
                  {/* Summary Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="insight-card"
                  >
                    <h4>
                      <FileText className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <p>{insights.summary}</p>
                  </motion.div>
                  
                  {/* Key Findings Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="insight-card"
                  >
                    <h4>
                      <Lightbulb className="w-4 h-4" />
                      Key Findings
                    </h4>
                    <div className="space-y-2 mt-2">
                      {insights.keyFindings.map((finding, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="flex items-start gap-2"
                        >
                          <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
                          <p>{finding}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Risks & Opportunities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="insight-card"
                    >
                      <h4 style={{ color: '#f87171' }}>
                        <AlertCircle className="w-4 h-4" />
                        Potential Risks
                      </h4>
                      <div className="space-y-2 mt-2">
                        {insights.risks.map((risk, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            className="p-2 bg-red-900/10 rounded border border-red-500/20"
                          >
                            <p>{risk}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="insight-card"
                    >
                      <h4 style={{ color: '#4ade80' }}>
                        <TrendingUp className="w-4 h-4" />
                        Opportunities
                      </h4>
                      <div className="space-y-2 mt-2">
                        {insights.opportunities.map((opp, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            className="p-2 bg-green-900/10 rounded border border-green-500/20"
                          >
                            <p>{opp}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Contextual Analysis Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/50"
                  >
                    <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      Contextual Analysis
                    </h4>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">{insights.contextualAnalysis}</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}
