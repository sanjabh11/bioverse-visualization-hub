import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ConfidenceViewerProps {
  plddt: number[];
  pae?: number[][];
  structure: string;
}

export const ConfidenceViewer: React.FC<ConfidenceViewerProps> = ({
  plddt,
  pae,
  structure
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const plddtRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // pLDDT visualization
  useEffect(() => {
    if (!plddtRef.current || !plddt?.length) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(plddtRef.current).selectAll('*').remove();

    const svg = d3.select(plddtRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, plddt.length])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create color scale for confidence levels
    const confidenceColorScale = d3.scaleThreshold<number, string>()
      .domain([50, 70, 90])
      .range(['#ff7f7f', '#ffdb7f', '#7fdb7f', '#7f7fff']);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Residue Position');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('pLDDT Score');

    // Add the line
    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d));

    svg.append('path')
      .datum(plddt)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Add confidence bands
    const confidenceLevels = [
      { y: yScale(90), color: '#7f7fff', label: 'Very high (>90)' },
      { y: yScale(70), color: '#7fdb7f', label: 'High (70-90)' },
      { y: yScale(50), color: '#ffdb7f', label: 'Medium (50-70)' },
      { y: yScale(0), color: '#ff7f7f', label: 'Low (<50)' }
    ];

    // Add confidence level background colors
    for (let i = 0; i < confidenceLevels.length - 1; i++) {
      svg.append('rect')
        .attr('x', 0)
        .attr('y', confidenceLevels[i].y)
        .attr('width', width)
        .attr('height', confidenceLevels[i + 1].y - confidenceLevels[i].y)
        .attr('fill', confidenceLevels[i].color)
        .attr('opacity', 0.1);
    }

    // Add legend
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(confidenceLevels.slice(0, -1))
      .enter().append('g')
      .attr('transform', (d, i) => `translate(${width - 120},${i * 20 - 10})`);

    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => d.color)
      .attr('opacity', 0.5);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => d.label);

    // Add hover effect
    const tooltip = d3.select(tooltipRef.current);
    
    const focus = svg.append('g')
      .style('display', 'none');

    focus.append('circle')
      .attr('r', 5)
      .attr('fill', 'steelblue');

    const mousemove = (event: MouseEvent) => {
      const [x] = d3.pointer(event);
      const xValue = Math.round(xScale.invert(x));
      if (xValue >= 0 && xValue < plddt.length) {
        const yValue = plddt[xValue];
        focus
          .attr('transform', `translate(${xScale(xValue)},${yScale(yValue)})`);
        
        tooltip
          .style('opacity', 1)
          .html(`Residue: ${xValue + 1}<br/>pLDDT: ${yValue.toFixed(1)}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      }
    };

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => {
        focus.style('display', null);
        tooltip.style('opacity', 1);
      })
      .on('mouseout', () => {
        focus.style('display', 'none');
        tooltip.style('opacity', 0);
      })
      .on('mousemove', mousemove);

  }, [plddt]);

  // PAE visualization
  useEffect(() => {
    if (!svgRef.current || !pae?.length) return;

    const margin = { top: 50, right: 50, bottom: 70, left: 70 };
    const width = 800 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([d3.max(pae.flat()) || 30, 0]); // Invert domain for better visualization

    // Create scales
    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(d3.range(pae.length).map(String))
      .padding(0.01);

    const yScale = d3.scaleBand()
      .range([0, height])
      .domain(d3.range(pae.length).map(String))
      .padding(0.01);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).tickSize(0));

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Predicted Aligned Error (PAE) Matrix');

    // Add X axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .text('Residue Position');

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Residue Position');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('padding', '5px');

    // Add the squares
    svg.selectAll()
      .data(pae.flatMap((row, i) => row.map((value, j) => ({ i, j, value }))))
      .enter()
      .append('rect')
      .attr('x', d => xScale(String(d.j)) || 0)
      .attr('y', d => yScale(String(d.i)) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => colorScale(d.value))
      .on('mouseover', (event, d) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`Residue ${d.i + 1} to ${d.j + 1}<br/>PAE: ${d.value.toFixed(2)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Add color scale legend
    const legendWidth = 300;
    const legendHeight = 20;

    const legendScale = d3.scaleSequential()
      .domain([0, 30])
      .range([0, legendWidth]);

    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth},${-30})`);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => d.toString());

    // Create gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'pae-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(30 * (1 - d)));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#pae-gradient)');

    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis);

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('PAE (Å)');

  }, [pae]);

  if (!plddt?.length && !pae?.length) {
    return (
      <div className="flex items-center justify-center h-[800px] bg-gray-100 rounded-lg">
        <p className="text-gray-500">No confidence data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {plddt?.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Per-Residue Confidence (pLDDT)</h3>
          <svg ref={plddtRef} />
        </div>
      )}
      
      {pae?.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Predicted Aligned Error Matrix</h3>
          <div className="relative">
            <svg ref={svgRef} />
          </div>
        </div>
      )}
      
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none"
        style={{
          position: 'absolute',
          opacity: 0,
          backgroundColor: 'white',
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
};

export default ConfidenceViewer; 