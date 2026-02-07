import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HexagonalPerformanceChartProps {
  data1: Record<string, number>;
  data2: Record<string, number>;
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  dimensions: string[];
  isLoading1?: boolean;
  isLoading2?: boolean;
  width?: number;
  height?: number;
}

export default function HexagonalPerformanceChart({
  data1,
  data2,
  label1,
  label2,
  color1 = '#3b82f6',
  color2 = '#10b981',
  dimensions,
  isLoading1 = false,
  isLoading2 = false,
  width = 500,
  height = 500
}: HexagonalPerformanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading1 || isLoading2 || dimensions.length === 0) {
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth || width || 500;
    const containerHeight = height;
    const size = Math.min(containerWidth, containerHeight);
    const radius = Math.max(100, size / 2 - 60);

    // Set SVG dimensions
    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Normalize data to 0-100 scale
    const normalizeData = (data: Record<string, number>): Record<string, number> => {
      const normalized: Record<string, number> = {};
      dimensions.forEach(dim => {
        const value = data[dim] || 0;
        // Assume data is already in 0-100 scale, but clamp it
        normalized[dim] = Math.max(0, Math.min(100, value));
      });
      return normalized;
    };

    const normalizedData1 = normalizeData(data1);
    const normalizedData2 = normalizeData(data2);

    // Create angle scale
    const angleSlice = (Math.PI * 2) / dimensions.length;

    // Create radius scale (0-100 to 0-radius)
    const rScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Helper function to convert angle and radius to x, y
    const getCoordinates = (angle: number, value: number): [number, number] => {
      const r = rScale(value);
      return [
        centerX + r * Math.cos(angle - Math.PI / 2),
        centerY + r * Math.sin(angle - Math.PI / 2)
      ];
    };

    // Draw grid circles
    const gridLevels = 5;
    for (let i = 1; i <= gridLevels; i++) {
      const levelRadius = (radius * i) / gridLevels;
      svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);
    }

    // Draw grid lines (axes)
    dimensions.forEach((dim, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const [x, y] = getCoordinates(angle, 100);
      svg.append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);
    });

    // Create polygon path for a dataset
    const createPolygonPath = (data: Record<string, number>, color: string, opacity: number = 0.3) => {
      const points: [number, number][] = dimensions.map((dim, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const value = data[dim] || 0;
        return getCoordinates(angle, value);
      });

      // Close the polygon
      points.push(points[0]);

      const line = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveLinearClosed);

      return { path: line(points) || '', points };
    };

    // Draw polygons
    const polygon1 = createPolygonPath(normalizedData1, color1, 0.2);
    const polygon2 = createPolygonPath(normalizedData2, color2, 0.2);

    // Draw filled polygons (behind)
    if (polygon1.path) {
      svg.append('path')
        .attr('d', polygon1.path)
        .attr('fill', color1)
        .attr('opacity', 0.2)
        .attr('stroke', 'none');
    }

    if (polygon2.path) {
      svg.append('path')
        .attr('d', polygon2.path)
        .attr('fill', color2)
        .attr('opacity', 0.2)
        .attr('stroke', 'none');
    }

    // Draw polygon outlines
    if (polygon1.path) {
      svg.append('path')
        .attr('d', polygon1.path)
        .attr('fill', 'none')
        .attr('stroke', color1)
        .attr('stroke-width', 3)
        .attr('opacity', 0.8);
    }

    if (polygon2.path) {
      svg.append('path')
        .attr('d', polygon2.path)
        .attr('fill', 'none')
        .attr('stroke', color2)
        .attr('stroke-width', 3)
        .attr('opacity', 0.8);
    }

    // Draw data points
    polygon1.points.slice(0, -1).forEach((point, i) => {
      svg.append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', 5)
        .attr('fill', color1)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    });

    polygon2.points.slice(0, -1).forEach((point, i) => {
      svg.append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', 5)
        .attr('fill', color2)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    });

    // Draw dimension labels
    dimensions.forEach((dim, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const labelRadius = radius + 40;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);

      svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(dim);
    });

    // Draw value labels on axes
    dimensions.forEach((dim, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const value1 = normalizedData1[dim] || 0;
      const value2 = normalizedData2[dim] || 0;
      const labelRadius = radius + 15;

      // Country 1 value
      const [x1, y1] = getCoordinates(angle, value1);
      svg.append('text')
        .attr('x', x1 + (x1 - centerX) * 0.15)
        .attr('y', y1 + (y1 - centerY) * 0.15)
        .attr('text-anchor', 'middle')
        .attr('fill', color1)
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('stroke', 'rgba(0, 0, 0, 0.5)')
        .attr('stroke-width', '0.5px')
        .text(Math.round(value1));

      // Country 2 value
      const [x2, y2] = getCoordinates(angle, value2);
      svg.append('text')
        .attr('x', x2 + (x2 - centerX) * 0.15)
        .attr('y', y2 + (y2 - centerY) * 0.15)
        .attr('text-anchor', 'middle')
        .attr('fill', color2)
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('stroke', 'rgba(0, 0, 0, 0.5)')
        .attr('stroke-width', '0.5px')
        .text(Math.round(value2));
    });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${containerWidth - 120}, 20)`);

    // Country 1 legend
    const legend1 = legend.append('g');
    legend1.append('rect')
      .attr('width', 20)
      .attr('height', 3)
      .attr('fill', color1);
    legend1.append('text')
      .attr('x', 25)
      .attr('y', 2)
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(label1);

    // Country 2 legend
    const legend2 = legend.append('g')
      .attr('transform', 'translate(0, 20)');
    legend2.append('rect')
      .attr('width', 20)
      .attr('height', 3)
      .attr('fill', color2);
    legend2.append('text')
      .attr('x', 25)
      .attr('y', 2)
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(label2);

  }, [data1, data2, label1, label2, color1, color2, dimensions, isLoading1, isLoading2, width, height]);

  if (isLoading1 || isLoading2) {
    return (
      <div className="hexagonal-chart-container" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="hexagonal-chart-container" ref={containerRef} style={{ width: '100%', maxWidth: '100%', height, boxSizing: 'border-box' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', maxWidth: '100%' }} />
    </div>
  );
}

