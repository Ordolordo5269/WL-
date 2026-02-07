import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Minimize2 } from 'lucide-react';
import { useCountryBasicInfo } from '../hooks/useCountryBasicInfo';
import { useEconomyData } from '../hooks/useEconomyData';
import { useSocietyData } from '../hooks/useSocietyData';
import { usePoliticsData } from '../hooks/usePoliticsData';
import { historicalIndicatorsService } from '../services/historical-indicators.service';
import RadarChartRecharts from './RadarChartRecharts';
import SelectableComparisonChart from './SelectableComparisonChart';
import type { Country } from './CountrySelector';

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
  // Get country names and flags
  const country1Data = useMemo(() => countries.find(c => c.iso3 === country1Iso3), [countries, country1Iso3]);
  const country2Data = useMemo(() => countries.find(c => c.iso3 === country2Iso3), [countries, country2Iso3]);

  const country1Name = country1Data?.name || country1Iso3;
  const country2Name = country2Data?.name || country2Iso3;

  // Load basic info for both countries
  const { countryData: country1BasicInfo, isLoading: loading1Basic } = useCountryBasicInfo(country1Name);
  const { countryData: country2BasicInfo, isLoading: loading2Basic } = useCountryBasicInfo(country2Name);

  const country1Iso3FromBasic = country1BasicInfo?.cca3 || country1Iso3;
  const country2Iso3FromBasic = country2BasicInfo?.cca3 || country2Iso3;

  // Load economy data
  const { economyData: economy1, isLoading: loading1Economy } = useEconomyData(country1Iso3FromBasic, country1Name);
  const { economyData: economy2, isLoading: loading2Economy } = useEconomyData(country2Iso3FromBasic, country2Name);

  // Load society data
  const { data: society1, isLoading: loading1Society } = useSocietyData(country1Iso3FromBasic);
  const { data: society2, isLoading: loading2Society } = useSocietyData(country2Iso3FromBasic);

  // Load politics data
  const { data: politics1, isLoading: loading1Politics } = usePoliticsData(country1Name, country1Iso3FromBasic);
  const { data: politics2, isLoading: loading2Politics } = usePoliticsData(country2Name, country2Iso3FromBasic);

  // Time series data state
  const [gdpData1, setGdpData1] = useState<Array<{ year: number; value: number | null }>>([]);
  const [gdpData2, setGdpData2] = useState<Array<{ year: number; value: number | null }>>([]);
  const [inflationData1, setInflationData1] = useState<Array<{ year: number; value: number | null }>>([]);
  const [inflationData2, setInflationData2] = useState<Array<{ year: number; value: number | null }>>([]);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(true);

  // Performance data for hexagonal chart
  const [performanceData1, setPerformanceData1] = useState<Record<string, number>>({});
  const [performanceData2, setPerformanceData2] = useState<Record<string, number>>({});
  const [loadingPerformance, setLoadingPerformance] = useState(true);

  // Load time series data
  useEffect(() => {
    if (!country1Iso3FromBasic || !country2Iso3FromBasic) return;

    const loadTimeSeries = async () => {
      setLoadingTimeSeries(true);
      try {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 10; // Last 10 years

        // Load GDP data
        const [gdp1, gdp2] = await Promise.all([
          historicalIndicatorsService.getTimeSeries('gdp', country1Iso3FromBasic, startYear, currentYear),
          historicalIndicatorsService.getTimeSeries('gdp', country2Iso3FromBasic, startYear, currentYear)
        ]);
        setGdpData1(gdp1);
        setGdpData2(gdp2);

        // Load Inflation data
        const [inf1, inf2] = await Promise.all([
          historicalIndicatorsService.getTimeSeries('inflation', country1Iso3FromBasic, startYear, currentYear),
          historicalIndicatorsService.getTimeSeries('inflation', country2Iso3FromBasic, startYear, currentYear)
        ]);
        setInflationData1(inf1);
        setInflationData2(inf2);
      } catch (error) {
        console.error('Error loading time series:', error);
      } finally {
        setLoadingTimeSeries(false);
      }
    };

    loadTimeSeries();
  }, [country1Iso3FromBasic, country2Iso3FromBasic]);

  // Load performance data for hexagonal chart
  useEffect(() => {
    if (!economy1 || !economy2 || !society1 || !society2 || !politics1 || !politics2) return;

    const loadPerformance = async () => {
      setLoadingPerformance(true);
      try {
        // Normalize values to 0-100 scale for hexagonal chart
        const normalize = (value: number | null | undefined, max: number = 100): number => {
          if (!value || value <= 0) return 0;
          return Math.min(100, (value / max) * 100);
        };

        // GDP per Capita (normalize to $100k max)
        const gdpPerCapita1 = normalize(economy1.gdp_per_capita_usd, 100000);
        const gdpPerCapita2 = normalize(economy2.gdp_per_capita_usd, 100000);

        // Life Expectancy (normalize to 85 years max)
        const lifeExp1 = normalize(society1.lifeExpectancy.value, 85);
        const lifeExp2 = normalize(society2.lifeExpectancy.value, 85);

        // Democracy Index (already 0-10, convert to 0-100)
        const democracy1 = (politics1.democracyIndex.value || 0) * 10;
        const democracy2 = (politics2.democracyIndex.value || 0) * 10;

        // Education (literacy rate, already 0-100)
        const education1 = society1.literacyRateAdult.value || 0;
        const education2 = society2.literacyRateAdult.value || 0;

        // Healthcare (UHC coverage, already 0-100)
        const healthcare1 = society1.uhcServiceCoverageIndex.value || 0;
        const healthcare2 = society2.uhcServiceCoverageIndex.value || 0;

        // Trade Openness (calculate from exports + imports / GDP, normalize to 200% max)
        const trade1 = economy1.exports_usd && economy1.gdp_usd 
          ? normalize(((economy1.exports_usd + (economy1.imports_usd || 0)) / economy1.gdp_usd) * 100, 200)
          : 0;
        const trade2 = economy2.exports_usd && economy2.gdp_usd
          ? normalize(((economy2.exports_usd + (economy2.imports_usd || 0)) / economy2.gdp_usd) * 100, 200)
          : 0;

        setPerformanceData1({
          'GDP per Capita': gdpPerCapita1,
          'Life Expectancy': lifeExp1,
          'Democracy': democracy1,
          'Education': education1,
          'Healthcare': healthcare1,
          'Trade Openness': trade1
        });

        setPerformanceData2({
          'GDP per Capita': gdpPerCapita2,
          'Life Expectancy': lifeExp2,
          'Democracy': democracy2,
          'Education': education2,
          'Healthcare': healthcare2,
          'Trade Openness': trade2
        });
      } catch (error) {
        console.error('Error loading performance data:', error);
      } finally {
        setLoadingPerformance(false);
      }
    };

    loadPerformance();
  }, [economy1, economy2, society1, society2, politics1, politics2]);

  const isLoading = loading1Basic || loading2Basic || loading1Economy || loading2Economy || loading1Society || loading2Society || loading1Politics || loading2Politics;

  // Scroll detection for header shrinking
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
      setIsScrolled(contentElement.scrollTop > 50);
    };

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
    if (type === 'percent') {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for expanded view */}
          <motion.div
            className="country-info-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={onClose}
          />

          {/* Main View - Using expanded modal pattern */}
          <motion.div
            className="expanded-country-view"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.3
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimize button (similar to CountrySidebar) */}
            <button
              onClick={onClose}
              className="country-sidebar-minimize-btn"
              aria-label="Close comparison"
              title="Close comparison"
            >
              <Minimize2 className="h-4 w-4" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="conflict-tracker-close-btn"
              aria-label="Close comparison"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header - Sticky with shrink on scroll */}
            <div 
              className={`compare-countries-header ${isScrolled ? 'compare-countries-header-scrolled' : ''}`}
              style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0F0F1E', borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <div className="compare-countries-header-content">
                {/* Country 1 */}
                <div className="compare-countries-header-country">
                  {country1Data?.flagUrl && (
                    <img
                      src={country1Data.flagUrl}
                      alt={country1Name}
                      className="compare-countries-header-flag"
                    />
                  )}
                  <div className="compare-countries-header-info">
                    <h2 className="compare-countries-header-name">{country1Name}</h2>
                    <p className="compare-countries-header-iso">{country1Iso3}</p>
                  </div>
                </div>

                {/* VS */}
                <div className="compare-countries-vs-large">VS</div>

                {/* Country 2 */}
                <div className="compare-countries-header-country">
                  {country2Data?.flagUrl && (
                    <img
                      src={country2Data.flagUrl}
                      alt={country2Name}
                      className="compare-countries-header-flag"
                    />
                  )}
                  <div className="compare-countries-header-info">
                    <h2 className="compare-countries-header-name">{country2Name}</h2>
                    <p className="compare-countries-header-iso">{country2Iso3}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content - Using expanded-country-content wrapper */}
            <div className="expanded-country-content">
              <div className="compare-countries-content" ref={contentRef}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  {/* KPIs Section */}
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
                    </div>
                  </div>

                  {/* Performance Comparison Chart - Single unified chart */}
                  <div className="compare-countries-section">
                    <h3 className="compare-countries-section-title">Performance Comparison</h3>
                    <RadarChartRecharts
                      data1={performanceData1}
                      data2={performanceData2}
                      label1={country1Name}
                      label2={country2Name}
                      color1="#3b82f6"
                      color2="#10b981"
                      dimensions={['GDP per Capita', 'Life Expectancy', 'Democracy', 'Education', 'Healthcare', 'Trade Openness']}
                      isLoading1={loadingPerformance}
                      isLoading2={loadingPerformance}
                    />
                  </div>

                  {/* Selectable Statistics Comparison Chart */}
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

