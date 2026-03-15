import { useState, useEffect } from 'react';
import TimeSeriesChartRecharts from './TimeSeriesChartRecharts';
import { historicalIndicatorsService } from '../world-map/services/historical-indicators.service';
import type { TimeSeriesPoint } from '../world-map/services/historical-indicators.service';

interface SelectableComparisonChartProps {
  country1Iso3: string;
  country2Iso3: string;
  country1Name: string;
  country2Name: string;
}

// All indicators use historicalIndicatorsService.getTimeSeries() via SLUG_TO_CODE

const ECONOMIC_INDICATORS = [
  { slug: 'gdp', name: 'GDP (USD)' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita (USD)' },
  { slug: 'gdp-growth', name: 'GDP Growth (annual %)' },
  { slug: 'gni-per-capita-ppp', name: 'GNI per Capita PPP' },
  { slug: 'inflation', name: 'Inflation (%)' },
  { slug: 'gini', name: 'GINI Index' },
  { slug: 'exports', name: 'Exports (USD)' },
  { slug: 'imports', name: 'Imports (USD)' },
  { slug: 'unemployment', name: 'Unemployment (%)' },
  { slug: 'debt', name: 'External Debt (USD)' },
  { slug: 'govt-debt', name: 'Government Debt (% GDP)' },
  { slug: 'tax-revenue', name: 'Tax Revenue (% GDP)' },
  { slug: 'gross-savings', name: 'Gross Savings (% GDP)' },
  { slug: 'total-reserves', name: 'Total Reserves (USD)' },
  { slug: 'gross-capital-formation', name: 'Capital Formation (% GDP)' },
  { slug: 'fdi-inflows-pct-gdp', name: 'FDI Inflows (% GDP)' },
  { slug: 'remittances-pct-gdp', name: 'Remittances Received (% GDP)' },
  { slug: 'manufacturing', name: 'Manufacturing (% GDP)' },
];

const SOCIETY_INDICATORS = [
  { slug: 'life-expectancy', name: 'Life Expectancy' },
  { slug: 'literacy', name: 'Adult Literacy (%)' },
  { slug: 'uhc-coverage', name: 'UHC Coverage Index' },
  { slug: 'population-growth', name: 'Population Growth (%)' },
  { slug: 'birth-rate', name: 'Birth Rate (per 1,000)' },
  { slug: 'death-rate', name: 'Death Rate (per 1,000)' },
  { slug: 'urban-population', name: 'Urban Population (%)' },
  { slug: 'population-density', name: 'Population Density' },
  { slug: 'primary-enrollment', name: 'Primary Enrollment (%)' },
  { slug: 'poverty', name: 'Extreme Poverty (%)' },
  { slug: 'youth-unemployment', name: 'Youth Unemployment (%)' },
  { slug: 'homicides', name: 'Homicides (per 100k)' },
];

const POLITICS_INDICATORS = [
  { slug: 'political-stability', name: 'Political Stability' },
  { slug: 'voice-accountability', name: 'Voice & Accountability' },
  { slug: 'government-effectiveness', name: 'Government Effectiveness' },
  { slug: 'regulatory-quality', name: 'Regulatory Quality' },
  { slug: 'rule-of-law', name: 'Rule of Law' },
  { slug: 'control-of-corruption', name: 'Control of Corruption' },
];

const DEFENSE_INDICATORS = [
  { slug: 'military-expenditure-pct-gdp', name: 'Military Expenditure (% GDP)' },
  { slug: 'military-expenditure-usd', name: 'Military Expenditure (USD)' },
  { slug: 'armed-forces-personnel', name: 'Armed Forces Personnel' },
  { slug: 'arms-imports', name: 'Arms Imports (TIV)' },
  { slug: 'arms-exports', name: 'Arms Exports (TIV)' },
  { slug: 'battle-deaths', name: 'Battle-Related Deaths' },
];

const INTERNATIONAL_INDICATORS = [
  { slug: 'oda-received', name: 'ODA Received (USD)' },
  { slug: 'trade-percent-gdp', name: 'Trade (% GDP)' },
  { slug: 'current-account', name: 'Current Account (USD)' },
  { slug: 'fdi-inflows', name: 'FDI Inflows (USD)' },
  { slug: 'fdi-outflows', name: 'FDI Outflows (USD)' },
  { slug: 'remittances', name: 'Remittances (USD)' },
  { slug: 'refugees-origin', name: 'Refugees by Origin' },
  { slug: 'refugees-asylum', name: 'Refugees by Asylum' },
  { slug: 'logistics-index', name: 'Logistics Performance Index' },
  { slug: 'oda-given', name: 'ODA Given (% GNI)' },
];

const TECHNOLOGY_INDICATORS = [
  { slug: 'rnd-expenditure', name: 'R&D Expenditure (% GDP)' },
  { slug: 'high-tech-exports', name: 'High-Tech Exports (USD)' },
  { slug: 'researchers', name: 'Researchers (per million)' },
  { slug: 'patents', name: 'Patent Applications' },
  { slug: 'journal-articles', name: 'Scientific Journal Articles' },
  { slug: 'broadband', name: 'Broadband (per 100 people)' },
  { slug: 'high-tech-exports-pct', name: 'High-Tech Exports (% manuf.)' },
];

const COMMODITIES_INDICATORS = [
  { slug: 'energy-imports', name: 'Energy Imports (% use)' },
  { slug: 'fuel-exports', name: 'Fuel Exports (% merch.)' },
  { slug: 'fuel-imports', name: 'Fuel Imports (% merch.)' },
  { slug: 'energy-use-per-capita', name: 'Energy Use (kg oil eq/capita)' },
  { slug: 'electricity-renewables', name: 'Electricity from Renewables (%)' },
  { slug: 'mineral-rents', name: 'Mineral Rents (% GDP)' },
  { slug: 'ore-metal-exports', name: 'Ore & Metal Exports (%)' },
  { slug: 'cereal-production', name: 'Cereal Production (MT)' },
  { slug: 'cereal-yield', name: 'Cereal Yield (kg/ha)' },
  { slug: 'food-exports', name: 'Food Exports (%)' },
  { slug: 'food-imports', name: 'Food Imports (%)' },
  { slug: 'arable-land', name: 'Arable Land (%)' },
  { slug: 'electric-power-consumption', name: 'Electric Power (kWh/capita)' },
  { slug: 'natural-gas-rents', name: 'Natural Gas Rents (% GDP)' },
  { slug: 'oil-rents', name: 'Oil Rents (% GDP)' },
];

const ENVIRONMENT_INDICATORS = [
  { slug: 'co2-per-capita', name: 'CO2 per Capita (t)' },
  { slug: 'co2-total', name: 'CO2 Total (Mt)' },
  { slug: 'forest-area', name: 'Forest Area (% land)' },
  { slug: 'pm25', name: 'PM2.5 Pollution (µg/m³)' },
  { slug: 'renewable-energy', name: 'Renewable Energy (%)' },
  { slug: 'clean-water', name: 'Clean Water Access (%)' },
  { slug: 'renewable-electricity', name: 'Renewable Electricity (%)' },
  { slug: 'co2-electricity', name: 'CO2 from Power (Mt)' },
  { slug: 'protected-areas', name: 'Protected Areas (% land)' },
  { slug: 'methane-emissions', name: 'Methane Emissions (Mt)' },
  { slug: 'forest-rents', name: 'Forest Rents (% GDP)' },
];

const ALL_INDICATORS: Array<{ slug: string; name: string }> = [
  ...ECONOMIC_INDICATORS, ...SOCIETY_INDICATORS, ...POLITICS_INDICATORS,
  ...DEFENSE_INDICATORS, ...INTERNATIONAL_INDICATORS, ...TECHNOLOGY_INDICATORS,
  ...COMMODITIES_INDICATORS, ...ENVIRONMENT_INDICATORS
];

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
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 10;

        const [data1Result, data2Result] = await Promise.all([
          historicalIndicatorsService.getTimeSeries(selectedIndicator, country1Iso3, startYear, currentYear),
          historicalIndicatorsService.getTimeSeries(selectedIndicator, country2Iso3, startYear, currentYear)
        ]);

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
          <optgroup label="Technology">
            {TECHNOLOGY_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="Raw Materials">
            {COMMODITIES_INDICATORS.map(ind => (
              <option key={ind.slug} value={ind.slug}>{ind.name}</option>
            ))}
          </optgroup>
          <optgroup label="Environment">
            {ENVIRONMENT_INDICATORS.map(ind => (
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
