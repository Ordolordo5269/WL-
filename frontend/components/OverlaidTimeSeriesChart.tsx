import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TimeSeriesPoint } from '../services/historical-indicators.service';

interface OverlaidTimeSeriesChartProps {
  data1: TimeSeriesPoint[];
  data2: TimeSeriesPoint[];
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  indicatorName: string;
  isLoading1?: boolean;
  isLoading2?: boolean;
  width?: number;
  height?: number;
}

export default function OverlaidTimeSeriesChart({
  data1,
  data2,
  label1,
  label2,
  color1 = '#3b82f6',
  color2 = '#10b981',
  indicatorName,
  isLoading1 = false,
  isLoading2 = false,
  width = 600,
  height = 350
}: OverlaidTimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading1 || isLoading2) {
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth || width;
    const containerHeight = height;

    // Set SVG dimensions
    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    // Filter out null values
    const validData1 = data1.filter(d => d.value !== null) as Array<{ year: number; value: number }>;
    const validData2 = data2.filter(d => d.value !== null) as Array<{ year: number; value: number }>;

    if (validData1.length === 0 && validData2.length === 0) {
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', containerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '14px')
        .text('No data available');
      return;
    }

    // Margins - responsive based on container width
    const marginRight = containerWidth > 800 ? 100 : containerWidth > 500 ? 70 : 50;
    const marginLeft = containerWidth > 800 ? 70 : containerWidth > 500 ? 55 : 45;
    const marginTop = containerWidth > 500 ? 30 : 25;
    const marginBottom = containerWidth > 500 ? 50 : 40;
    const margin = { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft };
    const innerWidth = Math.max(100, containerWidth - margin.left - margin.right);
    const innerHeight = Math.max(200, containerHeight - margin.top - margin.bottom);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Combine all data for domain calculation
    const allData = [...validData1, ...validData2];
    const allYears = allData.map(d => d.year);
    const allValues = allData.map(d => d.value);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([0, innerWidth])
      .nice();

    const yScale = d3.scaleLinear()
      .domain(d3.extent(allValues) as [number, number])
      .range([innerHeight, 0])
      .nice();

    // Line generator
    const line = d3.line<{ year: number; value: number }>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Create gradients
    const defs = svg.append('defs');

    // Gradient for country 1
    const gradient1 = defs.append('linearGradient')
      .attr('id', `gradient-${indicatorName.replace(/\s+/g, '-')}-1`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient1.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color1)
      .attr('stop-opacity', 0.2);

    gradient1.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color1)
      .attr('stop-opacity', 0.05);

    // Gradient for country 2
    const gradient2 = defs.append('linearGradient')
      .attr('id', `gradient-${indicatorName.replace(/\s+/g, '-')}-2`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient2.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color2)
      .attr('stop-opacity', 0.2);

    gradient2.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color2)
      .attr('stop-opacity', 0.05);

    // Area generator
    const area = d3.area<{ year: number; value: number }>()
      .x(d => xScale(d.year))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add areas (behind lines)
    if (validData1.length > 0) {
      g.append('path')
        .datum(validData1)
        .attr('fill', `url(#gradient-${indicatorName.replace(/\s+/g, '-')}-1)`)
        .attr('d', area);
    }

    if (validData2.length > 0) {
      g.append('path')
        .datum(validData2)
        .attr('fill', `url(#gradient-${indicatorName.replace(/\s+/g, '-')}-2)`)
        .attr('d', area);
    }

    // Add lines
    if (validData1.length > 0) {
      g.append('path')
        .datum(validData1)
        .attr('fill', 'none')
        .attr('stroke', color1)
        .attr('stroke-width', 3)
        .attr('d', line);
    }

    if (validData2.length > 0) {
      g.append('path')
        .datum(validData2)
        .attr('fill', 'none')
        .attr('stroke', color2)
        .attr('stroke-width', 3)
        .attr('d', line);
    }

    // Add dots for data points
    if (validData1.length > 0) {
      g.selectAll('.dot1')
        .data(validData1)
        .enter()
        .append('circle')
        .attr('class', 'dot1')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', color1)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);
    }

    if (validData2.length > 0) {
      g.selectAll('.dot2')
        .data(validData2)
        .enter()
        .append('circle')
        .attr('class', 'dot2')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', color2)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);
    }

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, xScale.domain()[1] - xScale.domain()[0]))
      .tickFormat(d3.format('d'));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .select('.domain')
      .attr('stroke', '#475569');

    // Y Axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(8);

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px');

    g.append('g')
      .call(yAxis)
      .select('.domain')
      .attr('stroke', '#475569');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(Math.min(10, xScale.domain()[1] - xScale.domain()[0]))
          .tickSize(-innerHeight)
      )
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.3);

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .ticks(8)
          .tickSize(-innerWidth)
      )
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.3);

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 90}, 10)`);

    // Country 1 legend
    if (validData1.length > 0) {
      const legend1 = legend.append('g');
      legend1.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', color1)
        .attr('stroke-width', 3);
      legend1.append('text')
        .attr('x', 25)
        .attr('y', 4)
        .attr('fill', '#ffffff')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(label1);
    }

    // Country 2 legend
    if (validData2.length > 0) {
      const legend2 = legend.append('g')
        .attr('transform', `translate(0, ${validData1.length > 0 ? 20 : 0})`);
      legend2.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', color2)
        .attr('stroke-width', 3);
      legend2.append('text')
        .attr('x', 25)
        .attr('y', 4)
        .attr('fill', '#ffffff')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(label2);
    }

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(indicatorName);

  }, [data1, data2, label1, label2, color1, color2, indicatorName, isLoading1, isLoading2, width, height]);

  if (isLoading1 || isLoading2) {
    return (
      <div className="overlaid-chart-container" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="overlaid-chart-container" ref={containerRef} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', maxWidth: '100%' }} />
    </div>
  );
}

