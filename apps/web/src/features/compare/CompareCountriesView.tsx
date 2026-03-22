import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, DollarSign, Users, Landmark, Leaf, Cpu, Shield, Globe } from 'lucide-react';
import { useCountryBasicInfo } from '../country-sidebar/hooks/useCountryBasicInfo';
import { useEconomyData } from '../country-sidebar/hooks/useEconomyData';
import { useSocietyData } from '../country-sidebar/hooks/useSocietyData';
import { usePoliticsData } from '../country-sidebar/hooks/usePoliticsData';
import { useDefenseData } from '../country-sidebar/hooks/useDefenseData';
import { useTechnologyData } from '../country-sidebar/hooks/useTechnologyData';
import { useEnvironmentData } from '../country-sidebar/hooks/useEnvironmentData';
import { useInternationalData } from '../country-sidebar/hooks/useInternationalData';
import { useInfrastructureData } from '../country-sidebar/hooks/useInfrastructureData';
import RadarChartRecharts from './RadarChartRecharts';
import SelectableComparisonChart from './SelectableComparisonChart';
import type { Country } from '../../components/ui/CountrySelector';

interface CompareCountriesViewProps {
  isOpen: boolean;
  onClose: () => void;
  country1Iso3: string;
  country2Iso3: string;
  countries: Country[];
}

export default function CompareCountriesView({
  isOpen,
  onClose,
  country1Iso3,
  country2Iso3,
  countries
}: CompareCountriesViewProps) {
  const country1Data = useMemo(() => countries.find(c => c.iso3 === country1Iso3), [countries, country1Iso3]);
  const country2Data = useMemo(() => countries.find(c => c.iso3 === country2Iso3), [countries, country2Iso3]);

  const country1Name = country1Data?.name || country1Iso3;
  const country2Name = country2Data?.name || country2Iso3;

  // Load basic info
  const { countryData: country1BasicInfo, isLoading: loading1Basic } = useCountryBasicInfo(country1Name);
  const { countryData: country2BasicInfo, isLoading: loading2Basic } = useCountryBasicInfo(country2Name);

  const country1Iso3FromBasic = country1BasicInfo?.cca3 || country1Iso3;
  const country2Iso3FromBasic = country2BasicInfo?.cca3 || country2Iso3;

  // Load section data for both countries
  const { economyData: economy1, isLoading: loading1Economy } = useEconomyData(country1Iso3FromBasic, country1Name);
  const { economyData: economy2, isLoading: loading2Economy } = useEconomyData(country2Iso3FromBasic, country2Name);

  const { data: society1, isLoading: loading1Society } = useSocietyData(country1Iso3FromBasic);
  const { data: society2, isLoading: loading2Society } = useSocietyData(country2Iso3FromBasic);

  const { data: politics1, isLoading: loading1Politics } = usePoliticsData(country1Name, country1Iso3FromBasic);
  const { data: politics2, isLoading: loading2Politics } = usePoliticsData(country2Name, country2Iso3FromBasic);

  const { data: defense1 } = useDefenseData(country1Iso3FromBasic, country1Name);
  const { data: defense2 } = useDefenseData(country2Iso3FromBasic, country2Name);

  const { data: technology1 } = useTechnologyData(country1Iso3FromBasic, country1Name);
  const { data: technology2 } = useTechnologyData(country2Iso3FromBasic, country2Name);

  const { data: environment1 } = useEnvironmentData(country1Iso3FromBasic, country1Name);
  const { data: environment2 } = useEnvironmentData(country2Iso3FromBasic, country2Name);

  const { data: international1 } = useInternationalData(country1Iso3FromBasic, country1Name);
  const { data: international2 } = useInternationalData(country2Iso3FromBasic, country2Name);

  const { data: infrastructure1 } = useInfrastructureData(country1Iso3FromBasic, country1Name);
  const { data: infrastructure2 } = useInfrastructureData(country2Iso3FromBasic, country2Name);

  // Performance data for radar chart (10 dimensions)
  const [performanceData1, setPerformanceData1] = useState<Record<string, number>>({});
  const [performanceData2, setPerformanceData2] = useState<Record<string, number>>({});
  const [loadingPerformance, setLoadingPerformance] = useState(true);

  useEffect(() => {
    if (!economy1 || !economy2 || !society1 || !society2 || !politics1 || !politics2) return;

    setLoadingPerformance(true);
    const normalize = (value: number | null | undefined, max: number = 100): number => {
      if (!value || value <= 0) return 0;
      return Math.min(100, (value / max) * 100);
    };

    // GDP per Capita (normalize to $100k)
    const gdpPc1 = normalize(economy1.gdp_per_capita_usd, 100000);
    const gdpPc2 = normalize(economy2.gdp_per_capita_usd, 100000);

    // Life Expectancy (normalize to 85 years)
    const life1 = normalize(society1.lifeExpectancy.value, 85);
    const life2 = normalize(society2.lifeExpectancy.value, 85);

    // Democracy (0-10 → 0-100)
    const dem1 = (politics1.democracyIndex.value ?? 0) * 10;
    const dem2 = (politics2.democracyIndex.value ?? 0) * 10;

    // Education (literacy %, already 0-100)
    const edu1 = society1.literacyRateAdult.value ?? 0;
    const edu2 = society2.literacyRateAdult.value ?? 0;

    // Healthcare (UHC index, already 0-100)
    const health1 = society1.uhcServiceCoverageIndex.value ?? 0;
    const health2 = society2.uhcServiceCoverageIndex.value ?? 0;

    // Trade Openness (normalize to 200% max)
    const trade1 = economy1.exports_usd && economy1.gdp_usd
      ? normalize(((economy1.exports_usd + (economy1.imports_usd ?? 0)) / economy1.gdp_usd) * 100, 200)
      : 0;
    const trade2 = economy2.exports_usd && economy2.gdp_usd
      ? normalize(((economy2.exports_usd + (economy2.imports_usd ?? 0)) / economy2.gdp_usd) * 100, 200)
      : 0;

    // Environment — renewable energy % (already 0-100)
    const env1 = environment1?.renewableEnergyConsumptionPct?.value ?? 0;
    const env2 = environment2?.renewableEnergyConsumptionPct?.value ?? 0;

    // Technology — broadband per 100 (normalize to 50 max)
    const tech1 = normalize(technology1?.fixedBroadbandPer100?.value, 50);
    const tech2 = normalize(technology2?.fixedBroadbandPer100?.value, 50);

    // Military — mil exp % GDP (normalize to 5% max)
    const mil1 = normalize(defense1?.militaryExpenditurePctGdp?.value, 5);
    const mil2 = normalize(defense2?.militaryExpenditurePctGdp?.value, 5);

    // Reserves (normalize to $1T)
    const res1 = normalize(economy1.total_reserves_usd, 1e12);
    const res2 = normalize(economy2.total_reserves_usd, 1e12);

    setPerformanceData1({
      'GDP/cap': gdpPc1, 'Life Exp.': life1, 'Democracy': dem1,
      'Education': edu1, 'Healthcare': health1, 'Trade': trade1,
      'Environment': env1, 'Technology': tech1, 'Military': mil1, 'Reserves': res1
    });
    setPerformanceData2({
      'GDP/cap': gdpPc2, 'Life Exp.': life2, 'Democracy': dem2,
      'Education': edu2, 'Healthcare': health2, 'Trade': trade2,
      'Environment': env2, 'Technology': tech2, 'Military': mil2, 'Reserves': res2
    });
    setLoadingPerformance(false);
  }, [economy1, economy2, society1, society2, politics1, politics2, defense1, defense2, technology1, technology2, environment1, environment2]);

  const isLoading = loading1Basic || loading2Basic || loading1Economy || loading2Economy || loading1Society || loading2Society || loading1Politics || loading2Politics;

  // Scroll detection for header shrinking
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;
    const handleScroll = () => setIsScrolled(contentElement.scrollTop > 50);
    contentElement.addEventListener('scroll', handleScroll);
    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Winner logic
  type Polarity = 'higher' | 'lower' | 'neutral';

  const getWinner = (v1: number | null | undefined, v2: number | null | undefined, polarity: Polarity): 'country1' | 'country2' | 'tie' => {
    if (polarity === 'neutral' || v1 == null || v2 == null || v1 === v2) return 'tie';
    const c1Wins = polarity === 'higher' ? v1 > v2 : v1 < v2;
    return c1Wins ? 'country1' : 'country2';
  };

  const getWinnerClasses = (v1: number | null | undefined, v2: number | null | undefined, polarity: Polarity) => {
    const winner = getWinner(v1, v2, polarity);
    return {
      c1: winner === 'country1' ? 'compare-kpi-winner' : '',
      c2: winner === 'country2' ? 'compare-kpi-winner' : '',
      card: winner === 'country1' ? 'winner-c1' : winner === 'country2' ? 'winner-c2' : '',
    };
  };

  // Proportion bar helper — for "lower is better" metrics, invert so the better value gets a longer bar
  const getBarWidths = (v1: number | null | undefined, v2: number | null | undefined, polarity: Polarity) => {
    if (v1 == null || v2 == null || v1 <= 0 || v2 <= 0) return null;
    if (polarity === 'lower') {
      // Invert: lower value should get longer bar
      const inv1 = 1 / v1, inv2 = 1 / v2;
      const total = inv1 + inv2;
      return { w1: (inv1 / total) * 100, w2: (inv2 / total) * 100 };
    }
    const total = Math.abs(v1) + Math.abs(v2);
    return { w1: (Math.abs(v1) / total) * 100, w2: (Math.abs(v2) / total) * 100 };
  };

  // Category definitions
  interface MetricDef {
    label: string;
    v1: number | null | undefined;
    v2: number | null | undefined;
    format: 'currency' | 'percent' | 'number';
    suffix?: string;
    polarity: Polarity;
  }

  interface CategoryDef {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    metrics: MetricDef[];
    scorecardV1: number | null | undefined;
    scorecardV2: number | null | undefined;
    scorecardPolarity: Polarity;
  }

  const categories: CategoryDef[] = useMemo(() => [
    {
      id: 'economy', label: 'Economy', icon: DollarSign,
      scorecardV1: economy1?.gdp_per_capita_usd, scorecardV2: economy2?.gdp_per_capita_usd, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'GDP', v1: economy1?.gdp_usd, v2: economy2?.gdp_usd, format: 'currency' as const, polarity: 'higher' as Polarity },
        { label: 'GDP per Capita', v1: economy1?.gdp_per_capita_usd, v2: economy2?.gdp_per_capita_usd, format: 'currency' as const, polarity: 'higher' as Polarity },
        { label: 'GDP Growth', v1: economy1?.gdp_growth_annual_pct, v2: economy2?.gdp_growth_annual_pct, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'Inflation Rate', v1: economy1?.inflation_rate_percent, v2: economy2?.inflation_rate_percent, format: 'percent' as const, polarity: 'lower' as Polarity },
        { label: 'Unemployment Rate', v1: economy1?.unemployment_rate_percent, v2: economy2?.unemployment_rate_percent, format: 'percent' as const, polarity: 'lower' as Polarity },
        { label: 'Govt Debt (% GDP)', v1: economy1?.govt_debt_pct_gdp, v2: economy2?.govt_debt_pct_gdp, format: 'percent' as const, polarity: 'lower' as Polarity },
        { label: 'Total Reserves', v1: economy1?.total_reserves_usd, v2: economy2?.total_reserves_usd, format: 'currency' as const, polarity: 'higher' as Polarity },
      ]
    },
    {
      id: 'society', label: 'Society & Development', icon: Users,
      scorecardV1: society1?.lifeExpectancy?.value, scorecardV2: society2?.lifeExpectancy?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'Population', v1: country1BasicInfo?.population, v2: country2BasicInfo?.population, format: 'number' as const, polarity: 'neutral' as Polarity },
        { label: 'Life Expectancy', v1: society1?.lifeExpectancy?.value, v2: society2?.lifeExpectancy?.value, format: 'number' as const, suffix: ' yrs', polarity: 'higher' as Polarity },
        { label: 'UHC Coverage', v1: society1?.uhcServiceCoverageIndex?.value, v2: society2?.uhcServiceCoverageIndex?.value, format: 'number' as const, polarity: 'higher' as Polarity },
        { label: 'Youth Unemployment', v1: society1?.youthUnemploymentPct?.value, v2: society2?.youthUnemploymentPct?.value, format: 'percent' as const, polarity: 'lower' as Polarity },
      ]
    },
    {
      id: 'governance', label: 'Governance & Stability', icon: Landmark,
      scorecardV1: politics1?.democracyIndex?.value, scorecardV2: politics2?.democracyIndex?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'Democracy Index', v1: politics1?.democracyIndex?.value, v2: politics2?.democracyIndex?.value, format: 'number' as const, polarity: 'higher' as Polarity },
        { label: 'Political Stability', v1: politics1?.wgiPoliticalStability?.value, v2: politics2?.wgiPoliticalStability?.value, format: 'number' as const, polarity: 'higher' as Polarity },
        { label: 'Corruption Control', v1: politics1?.wgiControlOfCorruption?.value, v2: politics2?.wgiControlOfCorruption?.value, format: 'number' as const, polarity: 'higher' as Polarity },
      ]
    },
    {
      id: 'environment', label: 'Environment & Energy', icon: Leaf,
      scorecardV1: environment1?.renewableEnergyConsumptionPct?.value, scorecardV2: environment2?.renewableEnergyConsumptionPct?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'CO2 per Capita', v1: environment1?.co2EmissionsPerCapita?.value, v2: environment2?.co2EmissionsPerCapita?.value, format: 'number' as const, suffix: ' t', polarity: 'lower' as Polarity },
        { label: 'Renewable Energy', v1: environment1?.renewableEnergyConsumptionPct?.value, v2: environment2?.renewableEnergyConsumptionPct?.value, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'Fossil Fuel Consumption', v1: environment1?.fossilFuelConsumptionPct?.value, v2: environment2?.fossilFuelConsumptionPct?.value, format: 'percent' as const, polarity: 'lower' as Polarity },
      ]
    },
    {
      id: 'technology', label: 'Technology', icon: Cpu,
      scorecardV1: technology1?.fixedBroadbandPer100?.value, scorecardV2: technology2?.fixedBroadbandPer100?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'Broadband (per 100)', v1: technology1?.fixedBroadbandPer100?.value, v2: technology2?.fixedBroadbandPer100?.value, format: 'number' as const, polarity: 'higher' as Polarity },
        { label: 'Internet Users', v1: infrastructure1?.internetUsersPct?.value, v2: infrastructure2?.internetUsersPct?.value, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'R&D (% GDP)', v1: technology1?.rndExpenditurePctGdp?.value, v2: technology2?.rndExpenditurePctGdp?.value, format: 'percent' as const, polarity: 'higher' as Polarity },
      ]
    },
    {
      id: 'defense', label: 'Defense', icon: Shield,
      scorecardV1: defense1?.militaryExpenditurePctGdp?.value, scorecardV2: defense2?.militaryExpenditurePctGdp?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'Military (% GDP)', v1: defense1?.militaryExpenditurePctGdp?.value, v2: defense2?.militaryExpenditurePctGdp?.value, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'Armed Forces', v1: defense1?.armedForcesPersonnelTotal?.value, v2: defense2?.armedForcesPersonnelTotal?.value, format: 'number' as const, polarity: 'neutral' as Polarity },
      ]
    },
    {
      id: 'trade', label: 'Trade & Investment', icon: Globe,
      scorecardV1: international1?.tradePercentGdp?.value, scorecardV2: international2?.tradePercentGdp?.value, scorecardPolarity: 'higher' as Polarity,
      metrics: [
        { label: 'Trade (% GDP)', v1: international1?.tradePercentGdp?.value, v2: international2?.tradePercentGdp?.value, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'FDI Inflows (% GDP)', v1: economy1?.fdi_net_inflows_pct_gdp, v2: economy2?.fdi_net_inflows_pct_gdp, format: 'percent' as const, polarity: 'higher' as Polarity },
        { label: 'External Debt (% GNI)', v1: economy1?.external_debt_pct_gni, v2: economy2?.external_debt_pct_gni, format: 'percent' as const, polarity: 'lower' as Polarity },
      ]
    },
  ], [economy1, economy2, society1, society2, politics1, politics2, environment1, environment2, technology1, technology2, defense1, defense2, international1, international2, infrastructure1, infrastructure2, country1BasicInfo, country2BasicInfo]);

  // Win counter
  const winCounts = useMemo(() => {
    let c1 = 0, c2 = 0;
    for (const cat of categories) {
      for (const m of cat.metrics) {
        const w = getWinner(m.v1, m.v2, m.polarity);
        if (w === 'country1') c1++;
        else if (w === 'country2') c2++;
      }
    }
    return { c1, c2 };
  }, [categories]);

  const formatValue = (value: number | null | undefined, type: 'currency' | 'percent' | 'number' = 'number'): string => {
    if (value === null || value === undefined) return 'N/A';
    if (type === 'currency') {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toLocaleString()}`;
    }
    if (type === 'percent') return `${value.toFixed(2)}%`;
    return value.toLocaleString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="country-info-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={onClose}
          />

          <motion.div
            className="expanded-country-view"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`compare-countries-header ${isScrolled ? 'compare-countries-header-scrolled' : ''}`}
              style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0F0F1E', borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <div className="compare-countries-header-content">
                <div className="compare-countries-header-country">
                  {country1Data?.flagUrl && (
                    <img src={country1Data.flagUrl} alt={country1Name} className="compare-countries-header-flag" />
                  )}
                  <div className="compare-countries-header-info">
                    <h2 className="compare-countries-header-name">
                      <span className="compare-countries-color-dot country1" />
                      {country1Name}
                    </h2>
                    <p className="compare-countries-header-iso">{country1Iso3}</p>
                  </div>
                </div>
                <div className="compare-countries-vs-large">VS</div>
                <div className="compare-countries-header-country">
                  {country2Data?.flagUrl && (
                    <img src={country2Data.flagUrl} alt={country2Name} className="compare-countries-header-flag" />
                  )}
                  <div className="compare-countries-header-info">
                    <h2 className="compare-countries-header-name">
                      <span className="compare-countries-color-dot country2" />
                      {country2Name}
                    </h2>
                    <p className="compare-countries-header-iso">{country2Iso3}</p>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="compare-countries-close-btn" aria-label="Close comparison">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="expanded-country-content">
              <div className="compare-countries-content" ref={contentRef}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  {/* Scorecard At-a-Glance */}
                  <div className="compare-countries-section">
                    <h3 className="compare-countries-section-title">Key Indicators</h3>

                    {/* Wins Summary */}
                    <div className="compare-wins-summary">
                      <div className="compare-wins-side country1">
                        <span className="compare-wins-iso">{country1Iso3}</span>
                        <span className="compare-wins-count">{winCounts.c1}</span>
                        <span className="compare-wins-label">leads</span>
                      </div>
                      <div className="compare-wins-center-col">
                        <div className="compare-wins-dots">
                          {categories.map(cat => {
                            const winner = getWinner(cat.scorecardV1, cat.scorecardV2, cat.scorecardPolarity);
                            return (
                              <button
                                key={cat.id}
                                className={`compare-wins-dot-btn ${winner}`}
                                title={cat.label}
                                onClick={() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              >
                                <cat.icon className="compare-wins-dot-icon" />
                              </button>
                            );
                          })}
                        </div>
                        <span className="compare-wins-subtitle">
                          Country leading in more indicators across {categories.length} categories
                        </span>
                      </div>
                      <div className="compare-wins-side country2">
                        <span className="compare-wins-label">leads</span>
                        <span className="compare-wins-count">{winCounts.c2}</span>
                        <span className="compare-wins-iso">{country2Iso3}</span>
                      </div>
                    </div>

                    {/* Grouped KPIs */}
                    {categories.map(cat => {
                      const visibleMetrics = cat.metrics.filter(m => m.v1 != null || m.v2 != null);
                      if (visibleMetrics.length === 0) return null;
                      return (
                        <div key={cat.id} id={`cat-${cat.id}`} className="compare-category-group">
                          <div className="compare-category-header">
                            <cat.icon className="compare-category-icon" />
                            <span className="compare-category-label">{cat.label}</span>
                          </div>
                          <div className="compare-kpis-grid">
                            {visibleMetrics.map(m => {
                              const win = getWinnerClasses(m.v1, m.v2, m.polarity);
                              const bar = getBarWidths(m.v1, m.v2, m.polarity);
                              return (
                                <div key={m.label} className={`compare-kpi-card ${win.card}`}>
                                  <div className="compare-kpi-label">{m.label}</div>
                                  <div className="compare-kpi-values">
                                    <span className={`compare-kpi-value country1 ${win.c1}`}>
                                      <span className="compare-kpi-iso">{country1Iso3}</span>
                                      {formatValue(m.v1, m.format)}{m.suffix || ''}
                                    </span>
                                    <span className={`compare-kpi-value country2 ${win.c2}`}>
                                      <span className="compare-kpi-iso">{country2Iso3}</span>
                                      {formatValue(m.v2, m.format)}{m.suffix || ''}
                                    </span>
                                  </div>
                                  {bar && (
                                    <div className="compare-kpi-bar">
                                      <div className="compare-kpi-bar-c1" style={{ width: `${bar.w1}%` }} />
                                      <div className="compare-kpi-bar-c2" style={{ width: `${bar.w2}%` }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Performance Comparison — 10-dimension Radar */}
                  <div className="compare-countries-section">
                    <h3 className="compare-countries-section-title">Performance Comparison</h3>
                    <RadarChartRecharts
                      data1={performanceData1}
                      data2={performanceData2}
                      label1={country1Name}
                      label2={country2Name}
                      color1="#3b82f6"
                      color2="#10b981"
                      dimensions={['GDP/cap', 'Life Exp.', 'Democracy', 'Education', 'Healthcare', 'Trade', 'Environment', 'Technology', 'Military', 'Reserves']}
                      isLoading1={loadingPerformance}
                      isLoading2={loadingPerformance}
                    />
                  </div>

                  {/* Selectable Statistics — 8 categories */}
                  <div className="compare-countries-section">
                    <h3 className="compare-countries-section-title">Custom Statistics Comparison</h3>
                    <SelectableComparisonChart
                      country1Iso3={country1Iso3FromBasic}
                      country2Iso3={country2Iso3FromBasic}
                      country1Name={country1Name}
                      country2Name={country2Name}
                    />
                  </div>
                </>
              )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
