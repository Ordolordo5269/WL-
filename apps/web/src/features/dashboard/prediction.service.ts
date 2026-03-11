// Use relative URLs in development (Vite proxy) or absolute URLs from env
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

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
  projection: PredictionPoint[]; // Compatibilidad hacia atrás (base scenario)
  scenarios?: ScenarioProjection; // Nuevo: 3 escenarios
  trend: {
    direction: 'up' | 'down' | 'stable';
    rate: number;
    rSquared: number;
  };
  statistics: {
    mean: number;
    stdDev: number;
    lastValue: number;
    projectedValue: number; // Base scenario
    optimisticValue?: number; // Optimistic scenario
    pessimisticValue?: number; // Pessimistic scenario
  };
}

export interface DeepSeekInsight {
  summary: string;
  keyFindings: string[];
  risks: string[];
  opportunities: string[];
  contextualAnalysis: string;
}

class PredictionService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async getPrediction(
    slug: string,
    iso3: string,
    years: number = 5
  ): Promise<PredictionResult> {
    const response = await fetch(
      `${API_BASE_URL}/api/prediction/${slug}/${iso3}?years=${years}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get prediction');
    }

    return await response.json();
  }

  async getInsights(
    iso3: string,
    slug: string,
    countryName: string,
    indicatorName: string
  ): Promise<{ prediction: PredictionResult; insights: DeepSeekInsight }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required. Please log in to generate AI insights.');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/prediction/insights`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ iso3, slug, countryName, indicatorName })
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to get insights';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (response.status === 500 && errorMessage.includes('DeepSeek API key')) {
          errorMessage = 'AI insights service is not configured. Please contact the administrator.';
        }
      } catch {
        errorMessage = response.status === 401 
          ? 'Authentication required. Please log in again.'
          : `Failed to get insights (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }
}

export const predictionService = new PredictionService();

