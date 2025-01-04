import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const ExpressionPlot = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Sample data
    const data = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      value: Math.random() * 100,
    }));

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Clear previous content
    svg.selectAll('*').remove();

    // Scales
    const x = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 100])
      .range([height - margin.bottom, margin.top]);

    // Add line
    const line = d3.line<{ id: number; value: number }>()
      .x(d => x(d.id))
      .y(d => y(d.value));

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4FD1C5')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

  }, []);

  return (
    <div className="w-full overflow-x-auto bg-white p-4 rounded-lg shadow">
      <svg ref={svgRef} className="w-full h-[400px]" />
    </div>
  );
};