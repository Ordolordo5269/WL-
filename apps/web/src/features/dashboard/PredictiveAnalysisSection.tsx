import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, Lightbulb, Loader2, Globe,
  DollarSign, Users, TrendingUp as TrendUp, Gauge, ArrowUpDown, FileText, 
  Building2, Briefcase, Heart, BookOpen, AlertTriangle, Activity, Baby, 
  UserMinus, MapPin, Users2, HeartPulse, GraduationCap, Scale, Shield,
  X, ChevronRight, BarChart3, Target
} from 'lucide-react';
import { predictionService } from './prediction.service';
import type { PredictionResult, DeepSeekInsight } from './prediction.service';
import TimeSeriesChart from '../../components/ui/TimeSeriesChart';
import CountrySelector from '../../components/ui/CountrySelector';
import type { Country as CountrySelectorCountry } from '../../components/ui/CountrySelector';
import '../../styles/predictive-analysis.css';

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
          setCountries(uniqueCountries as Country[]);
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
                setCountries(uniqueCountries as Country[]);
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
              setCountries(uniqueCountries as Country[]);
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Predictive Analysis</h2>
            <p className="text-sm text-slate-400">Select a country to view AI-powered forecasts for economic, social, and political indicators</p>
          </motion.div>

          {/* Country Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5"
            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Search Country</span>
            </div>
            <CountrySelector
              countries={selectorCountries}
              onSelectCountry={handleCountrySelect}
              loading={loadingCountries}
              placeholder="Search by name or ISO3 code (e.g., Spain, USA, CHN)..."
              scrollTargetId="predictive-charts-section"
            />
          </motion.div>

          {/* Error state */}
          {!loadingCountries && countries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 mt-6 rounded-xl"
              style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
            >
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-medium mb-1">Unable to load countries</p>
              <p className="text-xs text-slate-500">Please try refreshing the page</p>
            </motion.div>
          )}

          {loadingCountries && (
            <div className="flex items-center justify-center gap-3 py-12 mt-6">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">Loading countries...</span>
            </div>
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
    <div className="predictive-analysis-section min-h-full p-5 md:p-6">
      {/* ── Country Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {countryFlagUrl && (
            <img
              src={countryFlagUrl}
              alt={selectedCountryName || ''}
              className="w-8 h-6 rounded object-cover"
              style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
            />
          )}
          <div>
            <h2 className="text-lg font-semibold text-white leading-tight">
              {selectedCountryName || 'Predictive Analysis'}
            </h2>
            <p className="text-[11px] text-slate-500">Predictive Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedIso3(null); setSelectedCountryName(null); setPrediction(null); setInsights(null); }}
            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white rounded-lg transition-all flex items-center gap-1"
            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
          >
            <X className="w-3 h-3" /> Change
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadInsights(); }}
            disabled={!prediction || loadingInsights}
            className="px-2.5 py-1.5 rounded-lg text-[11px] text-white font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25))', border: '1px solid rgba(59, 130, 246, 0.3)' }}
          >
            {loadingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loadingInsights ? 'Analyzing...' : 'AI Insights'}
          </button>
        </div>
      </div>

      {/* ── Category Tabs ───────────────────────────────────── */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
        {(['Economy', 'Society', 'Politics'] as IndicatorCategory[]).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              selectedCategory === category ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            style={selectedCategory === category ? {
              background: 'rgba(59, 130, 246, 0.15)',
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.1)',
            } : {}}
          >
            {category === 'Economy' && <DollarSign className="w-3.5 h-3.5" />}
            {category === 'Society' && <Users className="w-3.5 h-3.5" />}
            {category === 'Politics' && <Shield className="w-3.5 h-3.5" />}
            {category}
          </button>
        ))}
      </div>

      {/* ── Indicator Picker ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {INDICATORS_BY_CATEGORY[selectedCategory].map((ind) => {
          const isActive = selectedIndicator === ind.slug;
          return (
            <button
              key={ind.slug}
              onClick={() => setSelectedIndicator(ind.slug)}
              className="px-3 py-2 rounded-lg text-left transition-all text-xs font-medium"
              style={{
                background: isActive ? `${ind.color}18` : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${isActive ? `${ind.color}40` : 'rgba(71, 85, 105, 0.2)'}`,
                color: isActive ? '#ffffff' : '#94a3b8',
              }}
            >
              <span className="flex items-center gap-1.5">
                <span style={{ color: isActive ? ind.color : '#64748b' }} className="flex-shrink-0">
                  {getIndicatorIconComponent(ind.slug)}
                </span>
                {ind.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Error State ─────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs"
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-sm text-slate-400">Analyzing historical data...</span>
        </div>
      ) : prediction ? (
        <>
          {/* ── Key Metrics Row ────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Trend */}
            <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Trend</span>
                {getTrendIcon()}
              </div>
              <div className="text-white font-bold text-lg capitalize mb-0.5">{prediction.trend.direction}</div>
              <div className="text-xs text-slate-400">{Math.abs(prediction.trend.rate).toFixed(2)}% / year</div>
            </div>

            {/* R² */}
            <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Model Fit</span>
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-white font-bold text-lg mb-0.5">{(prediction.trend.rSquared * 100).toFixed(1)}%</div>
              <div className="text-xs text-slate-400">R² score</div>
            </div>

            {/* Projection */}
            <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">5-Year</span>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-white font-bold text-lg mb-0.5">{formatValue(prediction.statistics.projectedValue)}</div>
              <div className="text-xs text-slate-400">
                from {formatValue(prediction.statistics.lastValue)}
                {prediction.statistics.optimisticValue != null && prediction.statistics.pessimisticValue != null && (
                  <span className="text-slate-500"> · {formatValue(prediction.statistics.pessimisticValue)}–{formatValue(prediction.statistics.optimisticValue)}</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Chart ───────────────────────────────────────── */}
          <div
            id="predictive-charts-section"
            className="rounded-xl mb-5 overflow-hidden"
            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}
          >
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.15)' }}>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  {INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || 'Indicator'} — Forecast
                </h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 rounded inline-block" /> Historical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ borderBottom: '1.5px dashed #60a5fa' }} /> Projection</span>
                {scenarios.optimistic.length > 0 && (
                  <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded inline-block" style={{ background: 'rgba(59, 130, 246, 0.15)' }} /> Range</span>
                )}
              </div>
            </div>
            <div className="px-3 py-2">
              <TimeSeriesChart
                data={combinedData}
                indicatorName={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.name || ''}
                height={350}
                color={INDICATORS_BY_CATEGORY[selectedCategory].find(ind => ind.slug === selectedIndicator)?.color || '#3b82f6'}
                projectionStartYear={currentYear + 1}
                scenarios={scenarios}
              />
            </div>
          </div>

          {/* ── AI Insights ──────────────────────────────────── */}
          <AnimatePresence>
            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.2)' }}
              >
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.15)' }}>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                  <span className="text-[10px] text-slate-500 ml-auto">Powered by AI</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Summary */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" /> Summary
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{insights.summary}</p>
                  </div>

                  {/* Key Findings */}
                  {insights.keyFindings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Key Findings
                      </h4>
                      <div className="space-y-2">
                        {insights.keyFindings.map((finding, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm text-slate-300" style={{ background: 'rgba(15, 23, 42, 0.8)', borderLeft: '2px solid rgba(234, 179, 8, 0.3)' }}>
                            <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks & Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.risks.length > 0 && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Risks
                        </h4>
                        <ul className="space-y-1.5">
                          {insights.risks.map((risk, i) => (
                            <li key={i} className="text-xs text-slate-400 leading-relaxed pl-3" style={{ borderLeft: '1px solid rgba(239, 68, 68, 0.2)' }}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.opportunities.length > 0 && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Opportunities
                        </h4>
                        <ul className="space-y-1.5">
                          {insights.opportunities.map((opp, i) => (
                            <li key={i} className="text-xs text-slate-400 leading-relaxed pl-3" style={{ borderLeft: '1px solid rgba(16, 185, 129, 0.2)' }}>{opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Context */}
                  {insights.contextualAnalysis && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-purple-400" /> Deep Analysis
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{insights.contextualAnalysis}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

