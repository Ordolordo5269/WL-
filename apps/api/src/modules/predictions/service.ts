import axios from 'axios';
import { getIndicatorTimeSeries } from '../indicators/service';
import { linearRegression, standardDeviation } from 'simple-statistics';

// ── Prediction types ─────────────────────────────────────────────────────────

export interface PredictionPoint {
  year: number;
  value: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScenarioProjection {
  base: PredictionPoint[];
  optimistic: PredictionPoint[];
  pessimistic: PredictionPoint[];
}

export interface PredictionResult {
  historical: Array<{ year: number; value: number | null }>;
  projection: PredictionPoint[];
  scenarios?: ScenarioProjection;
  trend: {
    direction: 'up' | 'down' | 'stable';
    rate: number;
    rSquared: number;
  };
  statistics: {
    mean: number;
    stdDev: number;
    lastValue: number;
    projectedValue: number;
    optimisticValue?: number;
    pessimisticValue?: number;
  };
}

// ── DeepSeek types ───────────────────────────────────────────────────────────

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface DeepSeekInsight {
  summary: string;
  keyFindings: string[];
  risks: string[];
  opportunities: string[];
  contextualAnalysis: string;
}

// ── Slug → Code mapping ─────────────────────────────────────────────────────

export const SLUG_TO_CODE: Record<string, string> = {
  // Economy
  'gdp': 'GDP_USD',
  'gdp-per-capita': 'GDP_PC_USD',
  'inflation': 'INFLATION_CPI_YOY_PCT',
  'gini': 'GINI_INDEX',
  'exports': 'EXPORTS_USD',
  'imports': 'IMPORTS_USD',
  'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
  'debt': 'EXTERNAL_DEBT_USD',
  // Society
  'life-expectancy': 'LIFE_EXPECTANCY',
  'literacy': 'LITERACY_RATE_ADULT',
  'poverty': 'POVERTY_EXTREME_215',
  'uhc-coverage': 'UHC_SERVICE_COVERAGE_INDEX',
  'primary-enrollment': 'PRIMARY_NET_ENROLLMENT',
  'population-growth': 'POPULATION_GROWTH',
  'birth-rate': 'CRUDE_BIRTH_RATE',
  'death-rate': 'CRUDE_DEATH_RATE',
  'urban-population': 'URBAN_POPULATION_PERCENT',
  'population-density': 'POPULATION_DENSITY',
  'infant-mortality': 'MORTALITY_RATE_INFANT',
  'fertility-rate': 'FERTILITY_RATE_TOTAL',
  // Politics
  'political-stability': 'WGI_POLITICAL_STABILITY',
  'voice-accountability': 'WGI_VOICE_ACCOUNTABILITY',
  'government-effectiveness': 'WGI_GOVERNMENT_EFFECTIVENESS',
  'regulatory-quality': 'WGI_REGULATORY_QUALITY',
  'rule-of-law': 'WGI_RULE_OF_LAW',
  'control-corruption': 'WGI_CONTROL_CORRUPTION',
};

export function getIndicatorCategory(slug: string): 'Economy' | 'Society' | 'Politics' | null {
  const economySlugs = ['gdp', 'gdp-per-capita', 'inflation', 'gini', 'exports', 'imports', 'unemployment', 'debt'];
  const societySlugs = ['life-expectancy', 'literacy', 'poverty', 'uhc-coverage', 'primary-enrollment',
                        'population-growth', 'birth-rate', 'death-rate', 'urban-population', 'population-density',
                        'infant-mortality', 'fertility-rate'];
  const politicsSlugs = ['political-stability', 'voice-accountability', 'government-effectiveness',
                         'regulatory-quality', 'rule-of-law', 'control-corruption'];

  if (economySlugs.includes(slug)) return 'Economy';
  if (societySlugs.includes(slug)) return 'Society';
  if (politicsSlugs.includes(slug)) return 'Politics';
  return null;
}

// ── Prediction cache ─────────────────────────────────────────────────────────

interface CacheEntry {
  result: PredictionResult;
  timestamp: number;
}

const predictionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Prediction helpers ───────────────────────────────────────────────────────

function calculateRSquared(
  data: Array<{ x: number; y: number }>,
  regression: { m: number; b: number }
): number {
  const yMean = data.reduce((sum, d) => sum + d.y, 0) / data.length;
  const ssRes = data.reduce((sum, d) => {
    const predicted = regression.m * d.x + regression.b;
    return sum + Math.pow(d.y - predicted, 2);
  }, 0);
  const ssTot = data.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
  return ssTot > 0 ? Math.max(0, Math.min(1, 1 - (ssRes / ssTot))) : 0;
}

function interpolateMissingValues(
  data: Array<{ year: number; value: number | null }>
): Array<{ year: number; value: number | null }> {
  const result: Array<{ year: number; value: number | null }> = [];
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  for (let i = 0; i < sortedData.length; i++) {
    result.push({ ...sortedData[i] });

    if (i < sortedData.length - 1) {
      const current = sortedData[i];
      const next = sortedData[i + 1];
      const gap = next.year - current.year;

      if (gap > 1 && gap <= 3 && current.value !== null && next.value !== null) {
        for (let year = current.year + 1; year < next.year; year++) {
          const t = (year - current.year) / gap;
          const interpolatedValue = current.value! * (1 - t) + next.value! * t;
          result.push({ year, value: interpolatedValue });
        }
      }
    }
  }

  return result.sort((a, b) => a.year - b.year);
}

// ── Core prediction function ─────────────────────────────────────────────────

export async function generatePrediction(
  iso3: string,
  indicatorCode: string,
  projectionYears: number = 5
): Promise<PredictionResult> {
  const cacheKey = `${iso3.toUpperCase()}:${indicatorCode}:${projectionYears}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 15;
  let historical = await getIndicatorTimeSeries(iso3, indicatorCode, startYear, currentYear);

  historical = interpolateMissingValues(historical);

  const isEconomicIndicator = indicatorCode.includes('GDP') ||
                              indicatorCode.includes('EXPORT') ||
                              indicatorCode.includes('IMPORT') ||
                              indicatorCode.includes('DEBT');

  const validData = historical
    .filter(d => d.value !== null && d.value !== undefined)
    .filter(d => isEconomicIndicator ? d.value! > 0 : true)
    .map(d => ({ x: d.year, y: d.value! }));

  if (validData.length < 3) {
    throw new Error('Insufficient historical data for prediction. Need at least 3 data points.');
  }

  const dataPoints = validData.map(d => [d.x, d.y]);
  const regression = linearRegression(dataPoints);
  const rSquared = calculateRSquared(validData, regression);

  const residuals = validData.map(d => {
    const predicted = regression.m * d.x + regression.b;
    return d.y - predicted;
  });
  const residualStdDev = standardDeviation(residuals);

  const baseProjection: PredictionPoint[] = [];
  const optimisticProjection: PredictionPoint[] = [];
  const pessimisticProjection: PredictionPoint[] = [];

  const n = validData.length;
  const xMean = validData.reduce((sum, d) => sum + d.x, 0) / n;
  const sumSqDiff = validData.reduce((sum, d) => sum + Math.pow(d.x - xMean, 2), 0);

  for (let i = 1; i <= projectionYears; i++) {
    const year = currentYear + i;
    const baseValue = regression.m * year + regression.b;
    const standardError = residualStdDev * Math.sqrt(1 + 1/n + Math.pow(year - xMean, 2) / sumSqDiff);

    const optimisticValue = baseValue + standardError;
    const pessimisticValue = baseValue - standardError;

    const relativeError = standardError / Math.abs(baseValue || 1);
    const confidence: 'high' | 'medium' | 'low' =
      relativeError < 0.1 ? 'high' :
      relativeError < 0.2 ? 'medium' : 'low';

    const applyMinConstraint = (val: number): number => {
      if (isEconomicIndicator) return Math.max(0, val);
      return val;
    };

    baseProjection.push({ year, value: applyMinConstraint(baseValue), confidence });
    optimisticProjection.push({ year, value: applyMinConstraint(optimisticValue), confidence });
    pessimisticProjection.push({ year, value: applyMinConstraint(pessimisticValue), confidence });
  }

  const lastValue = validData[validData.length - 1].y;
  const firstValue = validData[0].y;
  const yearsSpan = validData[validData.length - 1].x - validData[0].x;
  const rate = yearsSpan > 0 && firstValue !== 0
    ? ((lastValue - firstValue) / Math.abs(firstValue) / yearsSpan) * 100
    : 0;

  const direction: 'up' | 'down' | 'stable' =
    rate > 2 ? 'up' : rate < -2 ? 'down' : 'stable';

  const values = validData.map(d => d.y);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = standardDeviation(values);
  const projectedValue = baseProjection[baseProjection.length - 1].value;
  const optimisticFinal = optimisticProjection[optimisticProjection.length - 1].value;
  const pessimisticFinal = pessimisticProjection[pessimisticProjection.length - 1].value;

  const result: PredictionResult = {
    historical: historical.map(d => ({ year: d.year, value: d.value })),
    projection: baseProjection,
    scenarios: {
      base: baseProjection,
      optimistic: optimisticProjection,
      pessimistic: pessimisticProjection
    },
    trend: { direction, rate: Math.abs(rate), rSquared },
    statistics: {
      mean,
      stdDev,
      lastValue,
      projectedValue,
      optimisticValue: optimisticFinal,
      pessimisticValue: pessimisticFinal
    }
  };

  predictionCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

export function clearPredictionCache(): void {
  predictionCache.clear();
}

// ── DeepSeek insights ────────────────────────────────────────────────────────

function extractList(text: string, ...keywords: string[]): string[] {
  const lines = text.split('\n');
  const items: string[] = [];
  let capturing = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (keywords.some(kw => lowerLine.includes(kw.toLowerCase()))) {
      capturing = true;
      continue;
    }
    if (capturing && (line.trim().startsWith('-') || line.trim().match(/^\d+\./) || line.trim().startsWith('•'))) {
      const cleaned = line.trim().replace(/^[-•\d.]+\s*/, '').trim();
      if (cleaned.length > 0) {
        items.push(cleaned);
      }
    }
    if (capturing && line.trim() === '' && items.length > 0) {
      break;
    }
  }

  return items.length > 0 ? items : [];
}

function createFallbackInsight(content: string, countryName: string, indicatorName: string): DeepSeekInsight {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const summary = lines[0] || `Analysis generated for ${countryName} - ${indicatorName}`;

  return {
    summary,
    keyFindings: extractList(content, 'key findings', 'findings', 'key points', 'main findings', 'insights', 'conclusions'),
    risks: extractList(content, 'risks', 'risk', 'threats', 'challenges', 'concerns', 'vulnerabilities'),
    opportunities: extractList(content, 'opportunities', 'opportunity', 'strengths', 'advantages', 'potential', 'prospects'),
    contextualAnalysis: content.substring(0, 1000) || 'Contextual analysis available in the full text.'
  };
}

export async function generateInsights(
  countryName: string,
  indicatorName: string,
  historicalData: Array<{ year: number; value: number | null }>,
  prediction: {
    trend: { direction: string; rate: number; rSquared: number };
    statistics: {
      mean: number;
      stdDev: number;
      lastValue: number;
      projectedValue: number;
      optimisticValue?: number;
      pessimisticValue?: number;
    };
    scenarios?: {
      base: Array<{ year: number; value: number }>;
      optimistic: Array<{ year: number; value: number }>;
      pessimistic: Array<{ year: number; value: number }>;
    };
  },
  apiKey: string
): Promise<DeepSeekInsight> {
  const validData = historicalData.filter(d => d.value !== null && d.value !== undefined);
  if (validData.length === 0) {
    throw new Error('No valid historical data available');
  }

  const firstYear = validData[0].year;
  const lastYear = validData[validData.length - 1].year;
  const firstValue = validData[0].value!;
  const lastValue = validData[validData.length - 1].value!;
  const dataSpan = lastYear - firstYear;
  const totalChange = ((lastValue - firstValue) / Math.abs(firstValue || 1)) * 100;
  const annualizedChange = dataSpan > 0 ? totalChange / dataSpan : 0;

  const formatValue = (val: number): string => {
    if (indicatorName.toLowerCase().includes('gdp') || indicatorName.toLowerCase().includes('export') || indicatorName.toLowerCase().includes('import') || indicatorName.toLowerCase().includes('debt')) {
      if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
      if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
      return `$${val.toLocaleString()}`;
    }
    if (indicatorName.toLowerCase().includes('percent') || indicatorName.toLowerCase().includes('rate') || indicatorName.toLowerCase().includes('index')) {
      return `${val.toFixed(2)}%`;
    }
    return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const hasScenarios = 'scenarios' in prediction && prediction.scenarios;
  const optimisticValue = prediction.statistics.optimisticValue;
  const pessimisticValue = prediction.statistics.pessimisticValue;
  const baseValue = prediction.statistics.projectedValue;

  const volatility = prediction.statistics.stdDev / Math.abs(prediction.statistics.mean || 1);
  const isVolatile = volatility > 0.15;
  const trendStrength = prediction.trend.rSquared;
  const isStrongTrend = trendStrength > 0.7;

  let scenarioInfo = '';
  if (hasScenarios && optimisticValue !== undefined && pessimisticValue !== undefined) {
    const divergence = ((optimisticValue - pessimisticValue) / Math.abs(baseValue || 1)) * 100;
    const optimisticPct = ((optimisticValue - baseValue) / Math.abs(baseValue || 1)) * 100;
    const pessimisticPct = ((pessimisticValue - baseValue) / Math.abs(baseValue || 1)) * 100;
    scenarioInfo = `
PROJECTION SCENARIOS (5 years):
- Base Scenario: ${formatValue(baseValue)}
- Optimistic Scenario: ${formatValue(optimisticValue)} (${optimisticPct >= 0 ? '+' : ''}${optimisticPct.toFixed(1)}% vs base)
- Pessimistic Scenario: ${formatValue(pessimisticValue)} (${pessimisticPct >= 0 ? '+' : ''}${pessimisticPct.toFixed(1)}% vs base)
- Scenario Divergence: ${divergence.toFixed(1)}% (difference between optimistic and pessimistic)
- Uncertainty Level: ${divergence > 30 ? 'High' : divergence > 15 ? 'Medium' : 'Low'}
    `.trim();
  }

  const dataSummary = `
COUNTRY: ${countryName}
INDICATOR: ${indicatorName}
HISTORICAL PERIOD: ${firstYear} - ${lastYear} (${validData.length} years of data, spanning ${dataSpan} years)
DATA QUALITY: ${validData.length >= 10 ? 'Excellent' : validData.length >= 5 ? 'Good' : 'Limited'} coverage

HISTORICAL VALUES:
- Initial Value (${firstYear}): ${formatValue(firstValue)}
- Final Value (${lastYear}): ${formatValue(lastValue)}
- Total Change: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}% over ${dataSpan} years
- Annualized Change: ${annualizedChange >= 0 ? '+' : ''}${annualizedChange.toFixed(2)}% per year
- Historical Average: ${formatValue(prediction.statistics.mean)}
- Standard Deviation: ${formatValue(prediction.statistics.stdDev)}
- Volatility: ${(volatility * 100).toFixed(1)}% ${isVolatile ? '(High volatility - unstable trend)' : '(Low volatility - stable trend)'}

TREND ANALYSIS:
- Direction: ${prediction.trend.direction === 'up' ? 'UPWARD' : prediction.trend.direction === 'down' ? 'DOWNWARD' : 'STABLE'}
- Annual Growth Rate: ${prediction.trend.rate.toFixed(2)}%
- Model Quality (R²): ${(trendStrength * 100).toFixed(1)}% ${isStrongTrend ? '(Strong predictive power)' : trendStrength > 0.5 ? '(Moderate predictive power)' : '(Weak predictive power - high uncertainty)'}
- Trend Reliability: ${isStrongTrend ? 'High' : trendStrength > 0.5 ? 'Moderate' : 'Low'}

${scenarioInfo}
  `.trim();

  const scenarioPrompt = hasScenarios && optimisticValue !== undefined && pessimisticValue !== undefined
    ? `\n\nSCENARIO ANALYSIS REQUIREMENTS:
The projection includes three scenarios (Base, Optimistic, Pessimistic). Provide a comprehensive analysis that addresses:

1. OPTIMISTIC SCENARIO FACTORS:
   - What positive factors could drive the optimistic scenario?
   - What specific conditions or events would need to occur?

2. PESSIMISTIC SCENARIO FACTORS:
   - What risks or negative factors could lead to the pessimistic scenario?
   - What specific conditions or events would trigger this outcome?

3. SCENARIO PROBABILITY ASSESSMENT:
   - Based on historical patterns and current context, what is the relative likelihood of each scenario?

4. CATALYSTS AND GAME-CHANGERS:
   - What specific events, policies, or external factors could significantly alter the trajectory?

5. SCENARIO DIVERGENCE ANALYSIS:
   - Explain the divergence between scenarios: does it indicate high uncertainty or are there clear factors determining direction?`
    : '';

  const prompt = `You are a senior economic analyst with expertise in macroeconomic analysis, international economics, and country-level economic forecasting.

${dataSummary}

Provide a comprehensive analysis in valid JSON format with the following structure:
{
  "summary": "A concise 2-3 sentence executive summary${hasScenarios ? ', including scenario uncertainty' : ''}.",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"],
  "contextualAnalysis": "A comprehensive 4-5 paragraph contextual analysis."
}${scenarioPrompt}

CRITICAL: Respond ONLY in English. Output must be valid, parseable JSON.`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior economic analyst. Always respond in English and output valid JSON format.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    let parsed: DeepSeekInsight;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = createFallbackInsight(content, countryName, indicatorName);
      }
    } else {
      parsed = createFallbackInsight(content, countryName, indicatorName);
    }

    if (!parsed.summary) parsed.summary = `Analysis generated for ${countryName}`;
    if (!parsed.keyFindings || parsed.keyFindings.length === 0) {
      parsed.keyFindings = extractList(content, 'key findings', 'findings', 'key points', 'main findings', 'insights');
    }
    if (!parsed.risks || parsed.risks.length === 0) {
      parsed.risks = extractList(content, 'risks', 'risk', 'threats', 'challenges', 'concerns');
    }
    if (!parsed.opportunities || parsed.opportunities.length === 0) {
      parsed.opportunities = extractList(content, 'opportunities', 'opportunity', 'strengths', 'advantages', 'potential');
    }
    if (!parsed.contextualAnalysis) {
      parsed.contextualAnalysis = content.substring(0, 800) + '...';
    }

    return parsed;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`DeepSeek API error: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
    }
    throw new Error('Failed to generate insights from DeepSeek API');
  }
}
