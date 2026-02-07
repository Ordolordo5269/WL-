import { useState, useEffect } from 'react';
import TimeSeriesChartRecharts from './TimeSeriesChartRecharts';
import { historicalIndicatorsService, TimeSeriesPoint } from '../services/historical-indicators.service';
import { societyService } from '../services/society-service';

interface SelectableComparisonChartProps {
  country1Iso3: string;
  country2Iso3: string;
  country1Name: string;
  country2Name: string;
}

// Economic Indicators
const ECONOMIC_INDICATORS = [
  { slug: 'gdp', name: 'GDP', category: 'economic' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita', category: 'economic' },
  { slug: 'inflation', name: 'Inflation', category: 'economic' },
  { slug: 'gini', name: 'GINI Index', category: 'economic' },
  { slug: 'exports', name: 'Exports', category: 'economic' },
  { slug: 'imports', name: 'Imports', category: 'economic' },
  { slug: 'unemployment', name: 'Unemployment', category: 'economic' },
  { slug: 'debt', name: 'External Debt', category: 'economic' }
];

// Society Indicators
const SOCIETY_INDICATORS = [
  { slug: 'life-expectancy', name: 'Life Expectancy', code: 'SP.DYN.LE00.IN', category: 'society' },
  { slug: 'literacy', name: 'Adult Literacy', code: 'SE.ADT.LITR.ZS', category: 'society' },
  { slug: 'uhc-coverage', name: 'UHC Coverage', code: 'SH.UHC.SRVS.CV.XD', category: 'society' },
  { slug: 'population-growth', name: 'Population Growth', code: 'SP.POP.GROW', category: 'society' },
  { slug: 'birth-rate', name: 'Birth Rate', code: 'SP.DYN.CBRT.IN', category: 'society' },
  { slug: 'death-rate', name: 'Death Rate', code: 'SP.DYN.CDRT.IN', category: 'society' },
  { slug: 'urban-population', name: 'Urban Population', code: 'SP.URB.TOTL.IN.ZS', category: 'society' },
  { slug: 'population-density', name: 'Population Density', code: 'SP.POP.DNST', category: 'society' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment', code: 'SE.PRM.NENR', category: 'society' },
  { slug: 'poverty', name: 'Extreme Poverty', code: 'SI.POV.DDAY', category: 'society' }
];

// Politics Indicators (WGI)
const POLITICS_INDICATORS = [
  { slug: 'political-stability', name: 'Political Stability', category: 'politics' },
  { slug: 'voice-accountability', name: 'Voice & Accountability', category: 'politics' },
  { slug: 'government-effectiveness', name: 'Government Effectiveness', category: 'politics' },
  { slug: 'regulatory-quality', name: 'Regulatory Quality', category: 'politics' },
  { slug: 'rule-of-law', name: 'Rule of Law', category: 'politics' },
  { slug: 'control-of-corruption', name: 'Control of Corruption', category: 'politics' }
];

// Defense Indicators
const DEFENSE_INDICATORS = [
  { slug: 'military-expenditure-pct-gdp', name: 'Military Expenditure (% GDP)', category: 'defense' },
  { slug: 'military-expenditure-usd', name: 'Military Expenditure (USD)', category: 'defense' },
  { slug: 'armed-forces-personnel', name: 'Armed Forces Personnel', category: 'defense' },
  { slug: 'arms-imports', name: 'Arms Imports', category: 'defense' },
  { slug: 'arms-exports', name: 'Arms Exports', category: 'defense' },
  { slug: 'battle-deaths', name: 'Battle-Related Deaths', category: 'defense' }
];

// International Indicators
const INTERNATIONAL_INDICATORS = [
  { slug: 'oda-received', name: 'ODA Received', category: 'international' },
  { slug: 'trade-percent-gdp', name: 'Trade (% GDP)', category: 'international' },
  { slug: 'current-account', name: 'Current Account', category: 'international' },
  { slug: 'fdi-inflows', name: 'FDI Inflows', category: 'international' },
  { slug: 'fdi-outflows', name: 'FDI Outflows', category: 'international' },
  { slug: 'remittances', name: 'Remittances', category: 'international' }
];

// Combined indicators
const ALL_INDICATORS = [...ECONOMIC_INDICATORS, ...SOCIETY_INDICATORS, ...POLITICS_INDICATORS, ...DEFENSE_INDICATORS, ...INTERNATIONAL_INDICATORS];

export default function SelectableComparisonChart({
  country1Iso3,
  country2Iso3,
  country1Name,
  country2Name
}: SelectableComparisonChartProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('gdp');
  const [data1, setData1] = useState<TimeSeriesPoint[]>([]);
  const [data2, setData2] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!country1Iso3 || !country2Iso3 || !selectedIndicator) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const indicator = ALL_INDICATORS.find(ind => ind.slug === selectedIndicator);
        if (!indicator) return;

        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 10; // Last 10 years

        let data1Result: TimeSeriesPoint[] = [];
        let data2Result: TimeSeriesPoint[] = [];

        if (indicator.category === 'economic' || indicator.category === 'politics' || indicator.category === 'defense' || indicator.category === 'international') {
          // Use historical indicators service
          [data1Result, data2Result] = await Promise.all([
            historicalIndicatorsService.getTimeSeries(selectedIndicator, country1Iso3, startYear, currentYear),
            historicalIndicatorsService.getTimeSeries(selectedIndicator, country2Iso3, startYear, currentYear)
          ]);
        } else if (indicator.category === 'society') {
          // Use society service - always use direct service since we have different ISO3s
          [data1Result, data2Result] = await Promise.all([
            societyService.fetchWorldBankSeries(country1Iso3, indicator.code, 10),
            societyService.fetchWorldBankSeries(country2Iso3, indicator.code, 10)
          ]);
        }

        setData1(data1Result);
        setData2(data2Result);
      } catch (error) {
        console.error('Error loading comparison data:', error);
        setData1([]);
        setData2([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [country1Iso3, country2Iso3, selectedIndicator]);

  const selectedIndicatorData = ALL_INDICATORS.find(ind => ind.slug === selectedIndicator);
  const indicatorName = selectedIndicatorData 
    ? historicalIndicatorsService.getIndicatorName(selectedIndicator) || selectedIndicatorData.name
    : 'Select an indicator';

  return (
    <div className="selectable-comparison-chart-container">
      {/* Selector */}
      <div className="selectable-comparison-selector">
        <label htmlFor="indicator-select" className="selectable-comparison-label">
          Select Statistic:
        </label>
        <select
          id="indicator-select"
          value={selectedIndicator}
          onChange={(e) => setSelectedIndicator(e.target.value)}
          className="selectable-comparison-select"
        >
          <optgroup label="Economic">
            {ECONOMIC_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="Society">
            {SOCIETY_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="Politics">
            {POLITICS_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="Defense">
            {DEFENSE_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="International">
            {INTERNATIONAL_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Chart */}
      <div className="selectable-comparison-chart-wrapper">
        <TimeSeriesChartRecharts
          data1={data1}
          data2={data2}
          label1={country1Name}
          label2={country2Name}
          color1="#3b82f6"
          color2="#10b981"
          indicatorName={indicatorName}
          isLoading1={loading}
          isLoading2={loading}
        />
      </div>
    </div>
  );
}

