import React, { useMemo } from 'react';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { TimeSeriesPoint } from '../services/historical-indicators.service';
import { ScenarioProjection } from '../services/prediction.service';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  indicatorName: string;
  width?: number;
  height?: number;
  color?: string;
  isLoading?: boolean;
  projectionStartYear?: number; // Año donde comienza la proyección (línea punteada)
  scenarios?: ScenarioProjection; // Nuevo: 3 escenarios para visualizar
}

export default function TimeSeriesChart({
  data,
  indicatorName,
  width = 400,
  height = 250,
  color = '#3b82f6',
  isLoading = false,
  projectionStartYear,
  scenarios
}: TimeSeriesChartProps) {
  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    // Filter out null values
    const validData = data.filter(d => d.value !== null) as Array<{ year: number; value: number }>;
    
    // Separar datos históricos de proyección
    const historicalData = projectionStartYear 
      ? validData.filter(d => d.year < projectionStartYear)
      : validData;
    
    // Preparar datos de escenarios si están disponibles
    const optimisticData = scenarios?.optimistic.map(p => ({ year: p.year, value: p.value })) || [];
    const pessimisticData = scenarios?.pessimistic.map(p => ({ year: p.year, value: p.value })) || [];
    const baseProjectionData = scenarios?.base.map(p => ({ year: p.year, value: p.value })) || [];
    
    // Combinar todos los años únicos
    const allYears = new Set<number>();
    historicalData.forEach(d => allYears.add(d.year));
    baseProjectionData.forEach(d => allYears.add(d.year));
    optimisticData.forEach(d => allYears.add(d.year));
    pessimisticData.forEach(d => allYears.add(d.year));
    
    // Crear estructura de datos combinada
    const combinedData = Array.from(allYears).sort().map(year => {
      const historical = historicalData.find(d => d.year === year);
      const base = baseProjectionData.find(d => d.year === year);
      const optimistic = optimisticData.find(d => d.year === year);
      const pessimistic = pessimisticData.find(d => d.year === year);
      
      return {
        year,
        historical: historical?.value ?? null,
        base: base?.value ?? null,
        optimistic: optimistic?.value ?? null,
        pessimistic: pessimistic?.value ?? null,
        // Para el área de incertidumbre
        uncertaintyTop: optimistic?.value ?? null,
        uncertaintyBottom: pessimistic?.value ?? null
      };
    });
    
    return combinedData;
  }, [data, projectionStartYear, scenarios]);

  // Formatear valores para el eje Y y tooltip
  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      
      return (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          color: '#e2e8f0',
          fontSize: '12px'
        }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#94a3b8' }}>
            {data.year}
          </p>
          {data.historical !== null && (
            <p style={{ color: color, margin: '4px 0' }}>
              Historical: {formatValue(data.historical)}
            </p>
          )}
          {data.base !== null && (
            <p style={{ color: color, margin: '4px 0', opacity: 0.8 }}>
              Base Projection: {formatValue(data.base)}
            </p>
          )}
          {data.optimistic !== null && (
            <p style={{ color: '#10b981', margin: '4px 0', opacity: 0.7 }}>
              Optimistic: {formatValue(data.optimistic)}
            </p>
          )}
          {data.pessimistic !== null && (
            <p style={{ color: '#ef4444', margin: '4px 0', opacity: 0.7 }}>
              Pessimistic: {formatValue(data.pessimistic)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="chart-container" style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (data.length === 0 || chartData.length === 0) {
    return (
      <div className="chart-container" style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>No data available</div>
      </div>
    );
  }

  // Verificar si hay datos de incertidumbre
  const hasUncertainty = chartData.some(d => d.uncertaintyTop !== null && d.uncertaintyBottom !== null);
  const hasScenarios = scenarios && (scenarios.optimistic.length > 0 || scenarios.pessimistic.length > 0);

  return (
    <div className="chart-container" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
          <defs>
            {/* Gradiente para el área histórica */}
            <linearGradient id={`gradient-historical-${indicatorName.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
            {/* Gradiente para el área de incertidumbre */}
            {hasUncertainty && (
              <linearGradient id={`gradient-uncertainty-${indicatorName.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>
          
          <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.5} />
          
          <XAxis 
            dataKey="year" 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
            stroke="#334155"
          />
          
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: indicatorName, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={formatValue}
            stroke="#334155"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Área histórica con gradiente */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke="none"
            fill={`url(#gradient-historical-${indicatorName.replace(/\s+/g, '-')})`}
            connectNulls={false}
          />
          
          {/* Línea histórica (sólida) */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 3, strokeWidth: 1.5, stroke: '#ffffff' }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          
          {/* Línea base de proyección (punteada) */}
          {chartData.some(d => d.base !== null) && (
            <Line
              type="monotone"
              dataKey="base"
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray="5 5"
              strokeOpacity={0.8}
              dot={false}
              connectNulls={false}
            />
          )}
          
          {/* Línea optimista (punteada, verde) */}
          {hasScenarios && chartData.some(d => d.optimistic !== null) && (
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={false}
              connectNulls={false}
            />
          )}
          
          {/* Línea pesimista (punteada, roja) */}
          {hasScenarios && chartData.some(d => d.pessimistic !== null) && (
            <Line
              type="monotone"
              dataKey="pessimistic"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={false}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
