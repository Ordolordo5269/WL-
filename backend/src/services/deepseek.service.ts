import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface DeepSeekInsight {
  summary: string;
  keyFindings: string[];
  risks: string[];
  opportunities: string[];
  contextualAnalysis: string;
}

/**
 * Extracts list items from text
 */
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

/**
 * Generates insights using DeepSeek API
 */
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
  // Prepare data for the prompt
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
  
  // Format values based on indicator type
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
  
  // Extract scenario information if available
  const hasScenarios = 'scenarios' in prediction && prediction.scenarios;
  const optimisticValue = prediction.statistics.optimisticValue;
  const pessimisticValue = prediction.statistics.pessimisticValue;
  const baseValue = prediction.statistics.projectedValue;
  
  // Calculate volatility and stability metrics
  const values = validData.map(d => d.value!);
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
- Direction: ${prediction.trend.direction === 'up' ? 'UPWARD ↗️' : prediction.trend.direction === 'down' ? 'DOWNWARD ↘️' : 'STABLE ➡️'}
- Annual Growth Rate: ${prediction.trend.rate.toFixed(2)}%
- Model Quality (R²): ${(trendStrength * 100).toFixed(1)}% ${isStrongTrend ? '(Strong predictive power)' : trendStrength > 0.5 ? '(Moderate predictive power)' : '(Weak predictive power - high uncertainty)'}
- Trend Reliability: ${isStrongTrend ? 'High' : trendStrength > 0.5 ? 'Moderate' : 'Low'}

${scenarioInfo}
  `.trim();
  
  const scenarioPrompt = hasScenarios && optimisticValue !== undefined && pessimisticValue !== undefined
    ? `\n\nSCENARIO ANALYSIS REQUIREMENTS:
The projection includes three scenarios (Base, Optimistic, Pessimistic). Provide a comprehensive analysis that addresses:

1. OPTIMISTIC SCENARIO FACTORS:
   - What positive factors could drive the optimistic scenario? (favorable policies, global trends, structural improvements, external support)
   - What specific conditions or events would need to occur?
   - Historical precedents or similar cases where optimistic outcomes materialized

2. PESSIMISTIC SCENARIO FACTORS:
   - What risks or negative factors could lead to the pessimistic scenario? (crises, policy failures, external shocks, structural weaknesses)
   - What specific conditions or events would trigger this outcome?
   - Historical precedents or warning signs to monitor

3. SCENARIO PROBABILITY ASSESSMENT:
   - Based on historical patterns and current context, what is the relative likelihood of each scenario?
   - What factors increase or decrease the probability of each scenario?
   - Are there early indicators that could signal which scenario is more likely?

4. CATALYSTS AND GAME-CHANGERS:
   - What specific events, policies, or external factors could significantly alter the trajectory?
   - What would need to happen to shift from base to optimistic or pessimistic?
   - Timeline considerations: which factors could materialize in the short-term vs. long-term?

5. SCENARIO DIVERGENCE ANALYSIS:
   - Explain the divergence between scenarios: does it indicate high uncertainty or are there clear factors determining direction?
   - Is the uncertainty driven by external factors (global economy, geopolitics) or internal factors (policy, structure)?
   - What would reduce this uncertainty over time?`
    : '';
  
  const prompt = `You are a senior economic analyst with expertise in macroeconomic analysis, international economics, and country-level economic forecasting. You work for a prestigious economic research institution and your insights are used by policymakers, investors, and international organizations.

Your task is to analyze the provided economic data and generate comprehensive, professional, and actionable insights. Your analysis should be data-driven, contextually aware, and provide strategic value.

${dataSummary}

ANALYSIS REQUIREMENTS:

Provide a comprehensive analysis in valid JSON format with the following structure:
{
  "summary": "A concise 2-3 sentence executive summary of the trend, current state, and future projection${hasScenarios ? ', including a mention of scenario uncertainty and key drivers' : ''}. Be specific with numbers and percentages.",
  "keyFindings": [
    "Finding 1: [Specific, data-driven insight with numbers]",
    "Finding 2: [Another specific insight]",
    "Finding 3: [Additional insight]"
  ],
  "risks": [
    "Risk 1: [Specific risk with potential impact assessment]",
    "Risk 2: [Another specific risk]"
  ],
  "opportunities": [
    "Opportunity 1: [Specific opportunity with potential benefit]",
    "Opportunity 2: [Another specific opportunity]"
  ],
  "contextualAnalysis": "A comprehensive 4-5 paragraph contextual analysis that: (1) Explains the historical context and what drove past trends, (2) Analyzes current economic, political, and social factors affecting this indicator, (3) Compares with regional peers and global trends when relevant, (4) Discusses structural factors, policy implications, and external dependencies${hasScenarios ? ', (5) Provides detailed scenario analysis explaining what factors drive each scenario and their relative probabilities' : ''}. Use specific examples and data points. Be analytical, not descriptive."
}${scenarioPrompt}

CRITICAL INSTRUCTIONS:

1. DATA-DRIVEN ANALYSIS:
   - Always reference specific numbers, percentages, and timeframes
   - Use the provided statistics (mean, volatility, R²) to support your conclusions
   - Distinguish between correlation and causation
   - Acknowledge data limitations when R² is low or volatility is high

2. CONTEXTUAL AWARENESS:
   - Consider the country's development level, regional context, and economic structure
   - Factor in geopolitical situation, trade relationships, and regional dynamics
   - Account for natural resources, demographics, and institutional quality
   - Compare with similar countries or regional averages when relevant

3. ACTIONABLE INSIGHTS:
   - Provide insights that can inform decision-making
   - Identify specific factors to monitor
   - Suggest what would need to change to alter the trajectory
   - Be forward-looking and strategic, not just descriptive

4. PROFESSIONAL TONE:
   - Write as a senior analyst would for a professional audience
   - Use economic terminology appropriately
   - Be balanced: acknowledge both strengths and weaknesses
   - Avoid speculation; base conclusions on data and established economic principles

5. SCENARIO ANALYSIS (if applicable):
   - Provide detailed, nuanced analysis of each scenario
   - Explain the probability assessment with reasoning
   - Identify specific catalysts and early warning indicators
   - Discuss how scenario divergence reflects uncertainty vs. clear directional factors

6. OUTPUT REQUIREMENTS:
   - Respond ONLY in English
   - Output must be valid, parseable JSON
   - Each finding, risk, and opportunity should be a complete, standalone insight
   - Contextual analysis should be well-structured paragraphs, not bullet points
   - Be comprehensive but concise - quality over quantity`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior economic analyst with expertise in macroeconomic analysis, international economics, and country-level forecasting. You provide professional, data-driven, and actionable insights. Always respond in English and output valid JSON format. Your analysis should be comprehensive, contextually aware, and strategically valuable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      }
    );
    
    // Parsear respuesta
    const content = response.data.choices[0]?.message?.content || '';
    
    // Intentar extraer JSON de la respuesta
    let parsed: DeepSeekInsight;
    
    // Buscar JSON en la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Error parsing JSON from DeepSeek:', parseError);
        // Fallback: crear estructura desde texto
        parsed = createFallbackInsight(content, countryName, indicatorName);
      }
    } else {
      // No hay JSON válido, crear estructura desde texto
      parsed = createFallbackInsight(content, countryName, indicatorName);
    }
    
    // Validate that all fields are present
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
    console.error('DeepSeek API error:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`DeepSeek API error: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
    }
    throw new Error('Failed to generate insights from DeepSeek API');
  }
}

/**
 * Creates insight structure from text when no valid JSON is found
 */
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

