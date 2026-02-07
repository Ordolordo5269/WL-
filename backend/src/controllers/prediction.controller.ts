import { Request, Response, RequestHandler } from 'express';
import { generatePrediction } from '../services/prediction.service';
import { generateInsights } from '../services/deepseek.service';

// Mapping de slugs a códigos de indicadores en la DB
// Organizado por categoría: Economy, Society, Politics
const SLUG_TO_CODE: Record<string, string> = {
  // ===== ECONOMY (8 indicadores) =====
  'gdp': 'GDP_USD',
  'gdp-per-capita': 'GDP_PC_USD',
  'inflation': 'INFLATION_CPI_YOY_PCT',
  'gini': 'GINI_INDEX',
  'exports': 'EXPORTS_USD',
  'imports': 'IMPORTS_USD',
  'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
  'debt': 'EXTERNAL_DEBT_USD',
  
  // ===== SOCIETY (12 indicadores principales) =====
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
  
  // ===== POLITICS (6 indicadores WGI) =====
  'political-stability': 'WGI_POLITICAL_STABILITY',
  'voice-accountability': 'WGI_VOICE_ACCOUNTABILITY',
  'government-effectiveness': 'WGI_GOVERNMENT_EFFECTIVENESS',
  'regulatory-quality': 'WGI_REGULATORY_QUALITY',
  'rule-of-law': 'WGI_RULE_OF_LAW',
  'control-corruption': 'WGI_CONTROL_OF_CORRUPTION'
};

// Helper para obtener la categoría de un indicador
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

/**
 * GET /api/prediction/:slug/:iso3?years=5
 */
export const getPrediction: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug, iso3 } = req.params;
    const projectionYears = parseInt(req.query.years as string) || 5;
    
    if (!slug || !iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid parameters. ISO3 must be 3 characters.' });
    }
    
    const indicatorCode = SLUG_TO_CODE[slug];
    if (!indicatorCode) {
      return res.status(400).json({ 
        error: 'Unsupported indicator',
        supported: Object.keys(SLUG_TO_CODE)
      });
    }
    
    if (projectionYears < 1 || projectionYears > 10) {
      return res.status(400).json({ error: 'Projection years must be between 1 and 10' });
    }
    
    // Generar predicción estadística
    const prediction = await generatePrediction(iso3.toUpperCase(), indicatorCode, projectionYears);
    
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      error: 'Failed to generate prediction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/prediction/insights
 * Body: { iso3, slug, countryName, indicatorName }
 */
export const getInsights: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { iso3, slug, countryName, indicatorName } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'DeepSeek API key not configured',
        message: 'Please set DEEPSEEK_API_KEY in environment variables'
      });
    }
    
    if (!iso3 || !slug || !countryName || !indicatorName) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['iso3', 'slug', 'countryName', 'indicatorName']
      });
    }
    
    if (iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    
    const indicatorCode = SLUG_TO_CODE[slug];
    if (!indicatorCode) {
      return res.status(400).json({ 
        error: 'Unsupported indicator',
        supported: Object.keys(SLUG_TO_CODE)
      });
    }
    
    // Obtener predicción
    const prediction = await generatePrediction(iso3.toUpperCase(), indicatorCode, 5);
    
    // Generar insights con DeepSeek
    const insights = await generateInsights(
      countryName,
      indicatorName,
      prediction.historical,
      prediction,
      apiKey
    );
    
    res.json({
      prediction,
      insights
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

