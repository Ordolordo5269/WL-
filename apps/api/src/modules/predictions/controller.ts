import { Request, Response, RequestHandler } from 'express';
import { generatePrediction, generateInsights, SLUG_TO_CODE } from './service';

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

    const prediction = await generatePrediction(iso3.toUpperCase(), indicatorCode, 5);
    const insights = await generateInsights(
      countryName,
      indicatorName,
      prediction.historical,
      prediction,
      apiKey
    );

    res.json({ prediction, insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
