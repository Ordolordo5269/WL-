import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useCountryBasicInfo } from '../country-sidebar/hooks/useCountryBasicInfo';
import { useEconomyData } from '../country-sidebar/hooks/useEconomyData';
import { useSocietyData } from '../country-sidebar/hooks/useSocietyData';
import { usePoliticsData } from '../country-sidebar/hooks/usePoliticsData';
import { useDefenseData } from '../country-sidebar/hooks/useDefenseData';
import { useTechnologyData } from '../country-sidebar/hooks/useTechnologyData';
import { useEnvironmentData } from '../country-sidebar/hooks/useEnvironmentData';
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
                    <h2 className="compare-countries-header-name">{country1Name}</h2>
                    <p className="compare-countries-header-iso">{country1Iso3}</p>
                  </div>
                </div>
                <div className="compare-countries-vs-large">VS</div>
                <div className="compare-countries-header-country">
                  {country2Data?.flagUrl && (
                    <img src={country2Data.flagUrl} alt={country2Name} className="compare-countries-header-flag" />
                  )}
                  <div className="compare-countries-header-info">
                    <h2 className="compare-countries-header-name">{country2Name}</h2>
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
                  {/* KPIs Section — 12 cards */}
                  <div className="compare-countries-section">
                    <h3 className="compare-countries-section-title">Key Indicators</h3>
                    <div className="compare-kpis-grid">
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">GDP</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(economy1?.gdp_usd, 'currency')}</span>
                          <span className="compare-kpi-value country2">{formatValue(economy2?.gdp_usd, 'currency')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">GDP per Capita</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(economy1?.gdp_per_capita_usd, 'currency')}</span>
                          <span className="compare-kpi-value country2">{formatValue(economy2?.gdp_per_capita_usd, 'currency')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">GDP Growth</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(economy1?.gdp_growth_annual_pct, 'percent')}</span>
                          <span className="compare-kpi-value country2">{formatValue(economy2?.gdp_growth_annual_pct, 'percent')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Inflation Rate</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(economy1?.inflation_rate_percent, 'percent')}</span>
                          <span className="compare-kpi-value country2">{formatValue(economy2?.inflation_rate_percent, 'percent')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Life Expectancy</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(society1?.lifeExpectancy.value, 'number')} yrs</span>
                          <span className="compare-kpi-value country2">{formatValue(society2?.lifeExpectancy.value, 'number')} yrs</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Population</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(country1BasicInfo?.population, 'number')}</span>
                          <span className="compare-kpi-value country2">{formatValue(country2BasicInfo?.population, 'number')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Democracy Index</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(politics1?.democracyIndex.value, 'number')}</span>
                          <span className="compare-kpi-value country2">{formatValue(politics2?.democracyIndex.value, 'number')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Govt Debt (% GDP)</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(economy1?.govt_debt_pct_gdp, 'percent')}</span>
                          <span className="compare-kpi-value country2">{formatValue(economy2?.govt_debt_pct_gdp, 'percent')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">CO2 per Capita</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{environment1?.co2EmissionsPerCapita.value != null ? `${environment1.co2EmissionsPerCapita.value.toFixed(1)} t` : 'N/A'}</span>
                          <span className="compare-kpi-value country2">{environment2?.co2EmissionsPerCapita.value != null ? `${environment2.co2EmissionsPerCapita.value.toFixed(1)} t` : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Renewable Energy</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(environment1?.renewableEnergyConsumptionPct.value, 'percent')}</span>
                          <span className="compare-kpi-value country2">{formatValue(environment2?.renewableEnergyConsumptionPct.value, 'percent')}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Broadband (per 100)</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{technology1?.fixedBroadbandPer100.value != null ? technology1.fixedBroadbandPer100.value.toFixed(1) : 'N/A'}</span>
                          <span className="compare-kpi-value country2">{technology2?.fixedBroadbandPer100.value != null ? technology2.fixedBroadbandPer100.value.toFixed(1) : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="compare-kpi-card">
                        <div className="compare-kpi-label">Youth Unemployment</div>
                        <div className="compare-kpi-values">
                          <span className="compare-kpi-value country1">{formatValue(society1?.youthUnemploymentPct?.value, 'percent')}</span>
                          <span className="compare-kpi-value country2">{formatValue(society2?.youthUnemploymentPct?.value, 'percent')}</span>
                        </div>
                      </div>
                    </div>
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
