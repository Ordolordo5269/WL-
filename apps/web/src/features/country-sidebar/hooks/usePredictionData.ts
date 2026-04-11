import { useState, useEffect, useCallback } from 'react';
import { predictionService } from '../../dashboard/prediction.service';
import type { PredictionResult } from '../../dashboard/prediction.service';

export interface PredictionIndicator {
  slug: string;
  name: string;
  category: 'Economy' | 'Society' | 'Politics';
  color: string;
}

// Key indicators to show in the sidebar — one per category for a quick overview
export const SIDEBAR_INDICATORS: PredictionIndicator[] = [
  { slug: 'gdp', name: 'GDP', category: 'Economy', color: '#3b82f6' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita', category: 'Economy', color: '#10b981' },
  { slug: 'inflation', name: 'Inflation', category: 'Economy', color: '#f59e0b' },
  { slug: 'unemployment', name: 'Unemployment', category: 'Economy', color: '#06b6d4' },
  { slug: 'life-expectancy', name: 'Life Expectancy', category: 'Society', color: '#10b981' },
  { slug: 'population-growth', name: 'Population Growth', category: 'Society', color: '#22d3ee' },
  { slug: 'political-stability', name: 'Political Stability', category: 'Politics', color: '#8b5cf6' },
  { slug: 'control-corruption', name: 'Corruption Control', category: 'Politics', color: '#ef4444' },
];

// Default quick-view indicators (one from each category)
const DEFAULT_SLUGS = ['gdp-per-capita', 'life-expectancy', 'political-stability'];

export interface PredictionSummary {
  slug: string;
  name: string;
  category: string;
  color: string;
  result: PredictionResult;
}

export function usePredictionData(iso3: string | null, enabled: boolean = true) {
  const [summaries, setSummaries] = useState<PredictionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Allow loading a specific indicator's prediction
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);

  useEffect(() => {
    if (!iso3 || !enabled) {
      setSummaries([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadSummaries = async () => {
      setIsLoading(true);
      setError(null);

      const results: PredictionSummary[] = [];

      // Load the 3 default indicators in parallel
      const promises = DEFAULT_SLUGS.map(async (slug) => {
        const indicator = SIDEBAR_INDICATORS.find(i => i.slug === slug);
        if (!indicator) return null;

        try {
          const result = await predictionService.getPrediction(slug, iso3, 5);
          return { slug, name: indicator.name, category: indicator.category, color: indicator.color, result };
        } catch {
          return null;
        }
      });

      const settled = await Promise.all(promises);
      if (cancelled) return;

      for (const item of settled) {
        if (item) results.push(item);
      }

      setSummaries(results);
      setIsLoading(false);
    };

    loadSummaries();

    return () => { cancelled = true; };
  }, [iso3, enabled]);

  // Reset selected when country changes
  useEffect(() => {
    setSelectedSlug(null);
    setSelectedPrediction(null);
  }, [iso3]);

  const loadIndicator = useCallback(async (slug: string) => {
    if (!iso3) return;

    setSelectedSlug(slug);
    setIsLoadingSelected(true);

    try {
      const result = await predictionService.getPrediction(slug, iso3, 5);
      setSelectedPrediction(result);
    } catch {
      setSelectedPrediction(null);
    } finally {
      setIsLoadingSelected(false);
    }
  }, [iso3]);

  return {
    summaries,
    isLoading,
    error,
    selectedSlug,
    selectedPrediction,
    isLoadingSelected,
    loadIndicator,
  };
}
