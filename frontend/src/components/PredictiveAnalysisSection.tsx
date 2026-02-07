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
import '../styles/predictive-analysis.css';

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
      <div className="predictive-analysis-section p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Modern Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-2 border-blue-500/30 mb-6 shadow-lg"
            >
              <BarChart3 className="w-12 h-12 text-blue-400" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Predictive Analysis
            </h2>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
              Select a country to view AI-powered forecasts and insights
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Get detailed predictions for economic, social, and political indicators
            </p>
          </motion.div>

          {/* Enhanced Country Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Search Country</h3>
              </div>
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
              className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-700/50"
            >
              <AlertCircle className="w-20 h-20 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2 font-medium">Unable to load countries</p>
              <p className="text-sm text-slate-500">Please try refreshing the page</p>
            </motion.div>
          )}

          {/* Loading state */}
          {loadingCountries && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading countries...</p>
            </motion.div>
          )}
        </div>
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
    <div className="predictive-analysis-section min-h-full p-6 md:p-8">
      {/* Modern Header Banner */}
      {selectedCountryName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-blue-500/30 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative p-6 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {countryFlagUrl && (
                  <motion.img
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    src={countryFlagUrl}
                    alt={selectedCountryName}
                    className="w-16 h-16 rounded-xl border-2 border-white/20 shadow-lg object-cover"
                  />
                )}
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-1 flex items-center gap-3">
                    <Zap className="w-8 h-8 text-yellow-400" />
                    {selectedCountryName}
                  </h2>
                  <p className="text-slate-300 text-sm md:text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI-Powered Predictive Analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedIso3(null);
                    setSelectedCountryName(null);
                    setPrediction(null);
                    setInsights(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                  Change Country
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    loadInsights();
                  }}
                  disabled={!prediction || loadingInsights}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                  title={!prediction ? 'Generate a prediction first' : 'Generate AI-powered insights'}
                >
                  {loadingInsights ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate AI Insights</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!selectedCountryName && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            Predictive Analysis
          </h2>
          <p className="text-slate-400">Select a country to view AI-powered forecasts and insights</p>
        </div>
      )}

      {/* Modern Category Selector */}
      <div className="mb-6">
        <div className="flex gap-3 mb-4 flex-wrap">
          {(['Economy', 'Society', 'Politics'] as IndicatorCategory[]).map(category => (
            <motion.button
              key={category}
              onClick={() => setSelectedCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-3 rounded-xl transition-all duration-200 font-semibold flex items-center gap-2 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {category === 'Economy' && <DollarSign className="w-5 h-5" />}
              {category === 'Society' && <Users className="w-5 h-5" />}
              {category === 'Politics' && <Shield className="w-5 h-5" />}
              {category}
            </motion.button>
          ))}
        </div>

        {/* Modern Indicator Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="wait">
            {INDICATORS_BY_CATEGORY[selectedCategory].map((ind, index) => (
              <motion.button
                key={ind.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedIndicator(ind.slug)}
                className={`p-4 rounded-xl transition-all duration-200 text-left border-2 ${
                  selectedIndicator === ind.slug
                    ? 'text-white border-transparent shadow-lg'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/50 hover:border-slate-600 hover:bg-slate-700/60'
                }`}
                style={selectedIndicator === ind.slug ? {
                  background: `linear-gradient(135deg, ${ind.color} 0%, ${ind.color}dd 100%)`
                } : {}}
              >
                <div className={`flex items-center gap-3 mb-2 ${selectedIndicator === ind.slug ? 'text-white' : 'text-slate-400'}`}>
                  {getIndicatorIconComponent(ind.slug)}
                  <span className={`font-semibold text-sm ${selectedIndicator === ind.slug ? 'text-white' : 'text-slate-300'}`}>
                    {ind.name}
                  </span>
                </div>
                {selectedIndicator === ind.slug && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-1 bg-white/30 rounded-full mt-2"
                  />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
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
          {/* Modern Statistics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {/* Trend Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative bg-gradient-to-br from-blue-600/20 to-blue-800/20 p-6 rounded-2xl border border-blue-500/30 backdrop-blur-sm overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Trend</div>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    {getTrendIcon()}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-bold text-2xl capitalize">
                    {prediction.trend.direction}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-300 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{Math.abs(prediction.trend.rate).toFixed(2)}% annual</span>
                </div>
              </div>
            </motion.div>
            
            {/* Model Quality Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative bg-gradient-to-br from-purple-600/20 to-purple-800/20 p-6 rounded-2xl border border-purple-500/30 backdrop-blur-sm overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Model Quality</div>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Award className="w-5 h-5 text-purple-300" />
                  </div>
                </div>
                <div className="text-white font-bold text-3xl mb-2">
                  {(prediction.trend.rSquared * 100).toFixed(1)}%
                </div>
                <div className="text-purple-300 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>R² score</span>
                </div>
              </div>
            </motion.div>
            
            {/* Projection Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative bg-gradient-to-br from-green-600/20 to-green-800/20 p-6 rounded-2xl border border-green-500/30 backdrop-blur-sm overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Projected (5 years)</div>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-green-300" />
                  </div>
                </div>
                <div className="text-white font-bold text-2xl mb-2">
                  {formatValue(prediction.statistics.projectedValue)}
                </div>
                <div className="text-green-300 text-sm mb-3">
                  vs {formatValue(prediction.statistics.lastValue)} now
                </div>
                {prediction.statistics.optimisticValue !== undefined && prediction.statistics.pessimisticValue !== undefined && (
                  <div className="pt-3 border-t border-green-500/20">
                    <div className="text-slate-400 text-xs mb-1">Range</div>
                    <div className="text-green-200 text-sm font-medium">
                      {formatValue(prediction.statistics.pessimisticValue)} - {formatValue(prediction.statistics.optimisticValue)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Modern Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            id="predictive-charts-section"
            className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 md:p-8 rounded-2xl mb-6 border border-slate-700/50 backdrop-blur-sm shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                  Historical Data + 5-Year Projection
                </h3>
                <p className="text-slate-400 text-sm">
                  {INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || 'Indicator'} forecast
                </p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <TimeSeriesChart
                data={combinedData}
                indicatorName={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || ''}
                height={400}
                color={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.color || '#3b82f6'}
                projectionStartYear={currentYear + 1}
                scenarios={scenarios}
              />
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm flex-wrap bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-blue-400 rounded"></div>
                <span className="text-slate-300">Historical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-blue-400 border-dashed border-t-2"></div>
                <span className="text-slate-300">Base Projection</span>
              </div>
              {scenarios.optimistic.length > 0 && scenarios.pessimistic.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-green-500/40 rounded"></div>
                    <span className="text-slate-300">Optimistic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-red-500/40 rounded"></div>
                    <span className="text-slate-300">Pessimistic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2 bg-blue-500/20 rounded"></div>
                    <span className="text-slate-300">Uncertainty Range</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Modern AI Insights Section */}
          <AnimatePresence>
            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-yellow-600/10 via-purple-600/10 to-pink-600/10 p-6 md:p-8 rounded-2xl border border-yellow-500/20 backdrop-blur-sm shadow-xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-purple-500/20 rounded-xl">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">AI-Generated Insights</h3>
                    <p className="text-slate-400 text-sm">Powered by advanced AI analysis</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Summary Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/50"
                  >
                    <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Executive Summary
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-base">{insights.summary}</p>
                  </motion.div>
                  
                  {/* Key Findings Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/50"
                  >
                    <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                      Key Findings
                    </h4>
                    <div className="space-y-3">
                      {insights.keyFindings.map((finding, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border-l-4 border-yellow-500/50"
                        >
                          <ChevronRight className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-300 leading-relaxed flex-1">{finding}</p>
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
                      className="bg-gradient-to-br from-red-900/20 to-red-800/10 p-6 rounded-xl border border-red-500/30"
                    >
                      <h4 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Potential Risks
                      </h4>
                      <div className="space-y-3">
                        {insights.risks.map((risk, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="p-3 bg-red-900/20 rounded-lg border border-red-500/20"
                          >
                            <p className="text-slate-300 text-sm leading-relaxed">{risk}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-6 rounded-xl border border-green-500/30"
                    >
                      <h4 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Opportunities
                      </h4>
                      <div className="space-y-3">
                        {insights.opportunities.map((opp, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="p-3 bg-green-900/20 rounded-lg border border-green-500/20"
                          >
                            <p className="text-slate-300 text-sm leading-relaxed">{opp}</p>
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

