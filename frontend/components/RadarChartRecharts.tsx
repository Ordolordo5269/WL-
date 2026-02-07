import { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Maximize2 } from 'lucide-react';
import FullscreenChartModal from './FullscreenChartModal';

interface RadarChartRechartsProps {
  data1: Record<string, number>;
  data2: Record<string, number>;
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  dimensions: string[];
  isLoading1?: boolean;
  isLoading2?: boolean;
}

export default function RadarChartRecharts({
  data1,
  data2,
  label1,
  label2,
  color1 = '#3b82f6',
  color2 = '#10b981',
  dimensions,
  isLoading1 = false,
  isLoading2 = false
}: RadarChartRechartsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Transform data to Recharts format
  const chartData = dimensions.map(dim => ({
    dimension: dim,
    [label1]: data1[dim] || 0,
    [label2]: data2[dim] || 0
  }));

  const ChartContent = ({ height = 500 }: { height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <PolarGrid />
        <PolarAngleAxis 
          dataKey="dimension" 
          tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }}
          style={{ fontSize: '12px' }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickCount={6}
        />
        <Radar
          name={label1}
          dataKey={label1}
          stroke={color1}
          fill={color1}
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Radar
          name={label2}
          dataKey={label2}
          stroke={color2}
          fill={color2}
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
          formatter={(value) => <span style={{ color: '#ffffff', fontSize: '12px' }}>{value}</span>}
        />
      </RadarChart>
    </ResponsiveContainer>
  );

  if (isLoading1 || isLoading2) {
    return (
      <div className="hexagonal-chart-container" style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <>
      <div className="hexagonal-chart-container" style={{ width: '100%', height: 500, padding: '20px', position: 'relative' }}>
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
        title="Performance Comparison"
      >
        <ChartContent height={window.innerHeight - 120} />
      </FullscreenChartModal>
    </>
  );
}

