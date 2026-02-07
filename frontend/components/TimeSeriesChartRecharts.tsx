import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Maximize2 } from 'lucide-react';
import { TimeSeriesPoint } from '../services/historical-indicators.service';
import FullscreenChartModal from './FullscreenChartModal';

interface TimeSeriesChartRechartsProps {
  data1: TimeSeriesPoint[];
  data2: TimeSeriesPoint[];
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  indicatorName: string;
  isLoading1?: boolean;
  isLoading2?: boolean;
}

export default function TimeSeriesChartRecharts({
  data1,
  data2,
  label1,
  label2,
  color1 = '#3b82f6',
  color2 = '#10b981',
  indicatorName,
  isLoading1 = false,
  isLoading2 = false
}: TimeSeriesChartRechartsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isLoading1 || isLoading2) {
    return (
      <div className="selectable-comparison-chart-wrapper" style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Filter out null values and transform to Recharts format
  const validData1 = data1.filter(d => d.value !== null) as Array<{ year: number; value: number }>;
  const validData2 = data2.filter(d => d.value !== null) as Array<{ year: number; value: number }>;

  // Combine data by year
  const allYears = Array.from(new Set([...validData1.map(d => d.year), ...validData2.map(d => d.year)])).sort();
  
  const chartData = allYears.map(year => {
    const d1 = validData1.find(d => d.year === year);
    const d2 = validData2.find(d => d.year === year);
    return {
      year,
      [label1]: d1?.value ?? null,
      [label2]: d2?.value ?? null
    };
  });

  // Format value for tooltip
  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px' }}>
            {payload[0]?.payload?.year}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '14px', fontWeight: 500 }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartContent = ({ height = 500 }: { height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis 
          dataKey="year" 
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
        />
        <YAxis 
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          label={{ value: indicatorName, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#ffffff', fontSize: '12px' }}>{value}</span>}
        />
        <Line
          type="monotone"
          dataKey={label1}
          stroke={color1}
          strokeWidth={3}
          dot={{ fill: color1, r: 4, strokeWidth: 1.5, stroke: '#ffffff' }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey={label2}
          stroke={color2}
          strokeWidth={3}
          dot={{ fill: color2, r: 4, strokeWidth: 1.5, stroke: '#ffffff' }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <div className="selectable-comparison-chart-wrapper" style={{ width: '100%', height: 500, padding: '20px', position: 'relative' }}>
        <button
          onClick={() => setIsFullscreen(true)}
          className="chart-fullscreen-btn"
          aria-label="View fullscreen"
          title="View fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <ChartContent />
      </div>

      <FullscreenChartModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={indicatorName}
      >
        <ChartContent height={window.innerHeight - 120} />
      </FullscreenChartModal>
    </>
  );
}

