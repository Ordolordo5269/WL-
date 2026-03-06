import { getIndicatorTimeSeries } from './indicator.service';
import { linearRegression, standardDeviation } from 'simple-statistics';

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
  projection: PredictionPoint[]; // Mantener para compatibilidad hacia atrás (base scenario)
  scenarios?: ScenarioProjection; // Nuevo: 3 escenarios
  trend: {
    direction: 'up' | 'down' | 'stable';
    rate: number; // % de cambio anual promedio
    rSquared: number; // Calidad del ajuste (0-1)
  };
  statistics: {
    mean: number;
    stdDev: number;
    lastValue: number;
    projectedValue: number; // Valor en 5 años (base scenario)
    optimisticValue?: number; // Valor optimista en 5 años
    pessimisticValue?: number; // Valor pesimista en 5 años
  };
}

// Simple in-memory cache
interface CacheEntry {
  result: PredictionResult;
  timestamp: number;
}

const predictionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Calcula R² (coeficiente de determinación)
 */
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

/**
 * Interpola valores faltantes en series temporales
 * Solo interpola si hay gaps de máximo 2 años consecutivos
 */
function interpolateMissingValues(
  data: Array<{ year: number; value: number | null }>
): Array<{ year: number; value: number | null }> {
  const result: Array<{ year: number; value: number | null }> = [];
  const sortedData = [...data].sort((a, b) => a.year - b.year);
  
  for (let i = 0; i < sortedData.length; i++) {
    result.push({ ...sortedData[i] });
    
    // Si hay un gap de 2 años o menos, interpolar
    if (i < sortedData.length - 1) {
      const current = sortedData[i];
      const next = sortedData[i + 1];
      const gap = next.year - current.year;
      
      if (gap > 1 && gap <= 3 && current.value !== null && next.value !== null) {
        // Interpolación lineal simple
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

/**
 * Genera proyección usando regresión lineal con 3 escenarios
 */
export async function generatePrediction(
  iso3: string,
  indicatorCode: string,
  projectionYears: number = 5
): Promise<PredictionResult> {
  // Verificar caché
  const cacheKey = `${iso3.toUpperCase()}:${indicatorCode}:${projectionYears}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  
  // 1. Obtener datos históricos (últimos 15 años)
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 15;
  let historical = await getIndicatorTimeSeries(iso3, indicatorCode, startYear, currentYear);
  
  // 2. Interpolar gaps pequeños (máximo 2 años consecutivos)
  historical = interpolateMissingValues(historical);
  
  // 3. Filtrar valores válidos (permitir valores negativos para algunos indicadores como inflación)
  // Para indicadores económicos, generalmente no queremos valores negativos
  // Pero para inflación, GINI, etc., pueden ser negativos
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
  
  // 4. Calcular regresión lineal
  const dataPoints = validData.map(d => [d.x, d.y]);
  const regression = linearRegression(dataPoints);
  
  // 5. Calcular R² (calidad del ajuste)
  const rSquared = calculateRSquared(validData, regression);
  
  // 6. Calcular desviación estándar de residuos para intervalos de confianza
  const residuals = validData.map(d => {
    const predicted = regression.m * d.x + regression.b;
    return d.y - predicted;
  });
  const residualStdDev = standardDeviation(residuals);
  
  // 7. Generar proyecciones para los 3 escenarios
  const baseProjection: PredictionPoint[] = [];
  const optimisticProjection: PredictionPoint[] = [];
  const pessimisticProjection: PredictionPoint[] = [];
  
  const n = validData.length;
  const xMean = validData.reduce((sum, d) => sum + d.x, 0) / n;
  const sumSqDiff = validData.reduce((sum, d) => sum + Math.pow(d.x - xMean, 2), 0);
  
  for (let i = 1; i <= projectionYears; i++) {
    const year = currentYear + i;
    const baseValue = regression.m * year + regression.b;
    
    // Calcular error estándar para el intervalo de confianza
    const standardError = residualStdDev * Math.sqrt(1 + 1/n + Math.pow(year - xMean, 2) / sumSqDiff);
    
    // Escenarios:
    // - Base: Valor de regresión lineal
    // - Optimista: Base + 1 desviación estándar (límite superior)
    // - Pesimista: Base - 1 desviación estándar (límite inferior)
    const optimisticValue = baseValue + standardError;
    const pessimisticValue = baseValue - standardError;
    
    // Determinar nivel de confianza basado en el error estándar relativo
    const relativeError = standardError / Math.abs(baseValue || 1);
    const confidence: 'high' | 'medium' | 'low' = 
      relativeError < 0.1 ? 'high' :
      relativeError < 0.2 ? 'medium' : 'low';
    
    // Aplicar restricciones según el tipo de indicador
    const applyMinConstraint = (val: number): number => {
      if (isEconomicIndicator) {
        return Math.max(0, val);
      }
      return val;
    };
    
    baseProjection.push({
      year,
      value: applyMinConstraint(baseValue),
      confidence
    });
    
    optimisticProjection.push({
      year,
      value: applyMinConstraint(optimisticValue),
      confidence
    });
    
    pessimisticProjection.push({
      year,
      value: applyMinConstraint(pessimisticValue),
      confidence
    });
  }
  
  // 8. Calcular tendencia
  const lastValue = validData[validData.length - 1].y;
  const firstValue = validData[0].y;
  const yearsSpan = validData[validData.length - 1].x - validData[0].x;
  const rate = yearsSpan > 0 && firstValue !== 0
    ? ((lastValue - firstValue) / Math.abs(firstValue) / yearsSpan) * 100 
    : 0;
  
  const direction: 'up' | 'down' | 'stable' = 
    rate > 2 ? 'up' : rate < -2 ? 'down' : 'stable';
  
  // 9. Estadísticas
  const values = validData.map(d => d.y);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = standardDeviation(values);
  const projectedValue = baseProjection[baseProjection.length - 1].value;
  const optimisticValue = optimisticProjection[optimisticProjection.length - 1].value;
  const pessimisticValue = pessimisticProjection[pessimisticProjection.length - 1].value;
  
  const result: PredictionResult = {
    historical: historical.map(d => ({ year: d.year, value: d.value })),
    projection: baseProjection, // Compatibilidad hacia atrás
    scenarios: {
      base: baseProjection,
      optimistic: optimisticProjection,
      pessimistic: pessimisticProjection
    },
    trend: {
      direction,
      rate: Math.abs(rate),
      rSquared
    },
    statistics: {
      mean,
      stdDev,
      lastValue,
      projectedValue,
      optimisticValue,
      pessimisticValue
    }
  };
  
  // Guardar en caché
  predictionCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  return result;
}

/**
 * Limpia el caché de predicciones (útil para testing o cuando se actualizan datos)
 */
export function clearPredictionCache(): void {
  predictionCache.clear();
}

