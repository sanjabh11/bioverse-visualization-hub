import React, { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import * as d3 from 'd3';

interface ConfidenceScoresProps {
  plddt: number[];
  pae?: number[][];
}

export const ConfidenceScores: React.FC<ConfidenceScoresProps> = ({
  plddt,
  pae
}) => {
  const plddtRef = useRef<HTMLDivElement>(null);
  const paeRef = useRef<HTMLDivElement>(null);

  // Render pLDDT visualization
  useEffect(() => {
    if (!plddtRef.current || !plddt.length) return;

    // Clear previous visualization
    d3.select(plddtRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 50, bottom: 30, left: 50 };
    const width = plddtRef.current.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(plddtRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, plddt.length])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create line generator
    const line = d3.line<number>()
      .x((_, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    // Add confidence level backgrounds
    const confidenceLevels = [
      { min: 90, max: 100, color: '#00af54', label: 'Very high (90-100)' },
      { min: 70, max: 90, color: '#46e8c8', label: 'Confident (70-90)' },
      { min: 50, max: 70, color: '#ffd966', label: 'Low (50-70)' },
      { min: 0, max: 50, color: '#ff7d45', label: 'Very low (0-50)' }
    ];

    confidenceLevels.forEach(level => {
      svg.append('rect')
        .attr('x', 0)
        .attr('y', y(level.max))
        .attr('width', width)
        .attr('height', y(level.min) - y(level.max))
        .attr('fill', level.color)
        .attr('opacity', 0.1);

      // Add confidence level labels
      svg.append('text')
        .attr('x', width + 5)
        .attr('y', y(level.min - (level.min - level.max) / 2))
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('fill', level.color)
        .text(level.label);
    });

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      );

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Residue Position');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('pLDDT Score');

    // Add the line
    const path = svg.append('path')
      .datum(plddt)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add hover effects
    const focus = svg.append('g')
      .style('display', 'none');

    focus.append('circle')
      .attr('r', 4)
      .attr('fill', '#2563eb');

    focus.append('text')
      .attr('x', 9)
      .attr('dy', '.35em')
      .attr('font-size', '12px');

    const overlay = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    overlay
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', (event) => {
        const mouseX = d3.pointer(event)[0];
        const xInverse = x.invert(mouseX);
        const index = Math.round(xInverse);
        if (index >= 0 && index < plddt.length) {
          const score = plddt[index];
          focus.attr('transform', `translate(${x(index)},${y(score)})`);
          focus.select('text')
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .text(`Position: ${index + 1}, Score: ${score.toFixed(1)}`);
        }
      });
  }, [plddt]);

  // Render PAE matrix visualization
  useEffect(() => {
    if (!paeRef.current || !pae || !pae.length) return;

    // Clear previous visualization
    d3.select(paeRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 100, bottom: 30, left: 50 };
    const width = paeRef.current.clientWidth - margin.left - margin.right;
    const height = width; // Make it square

    const svg = d3.select(paeRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create color scale
    const maxError = d3.max(pae.flat()) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxError])
      .interpolator(d3.interpolateViridis);

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, pae.length])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, pae.length])
      .range([height, 0]);

    // Create cells
    const cellWidth = width / pae.length;
    const cellHeight = height / pae.length;

    // Add cells with transitions
    pae.forEach((row, i) => {
      row.forEach((value, j) => {
        svg.append('rect')
          .attr('x', x(j))
          .attr('y', y(i + 1))
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('fill', colorScale(value))
          .on('mouseover', (event) => {
            const tooltip = d3.select(paeRef.current)
              .append('div')
              .attr('class', 'absolute bg-white p-2 border border-gray-200 rounded shadow-lg text-sm pointer-events-none')
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');

            tooltip.html(`
              <div>Residue i: ${i + 1}</div>
              <div>Residue j: ${j + 1}</div>
              <div>Error: ${value.toFixed(2)}</div>
            `);
          })
          .on('mouseout', () => {
            d3.select(paeRef.current)
              .selectAll('div.absolute')
              .remove();
          });
      });
    });

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Residue i');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Residue j');

    // Add colorbar
    const colorbarWidth = 20;
    const colorbar = svg.append('g')
      .attr('transform', `translate(${width + 20},0)`);

    const colorbarScale = d3.scaleLinear()
      .domain([maxError, 0])
      .range([0, height]);

    const colorbarAxis = d3.axisRight(colorbarScale)
      .ticks(5);

    // Create gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'pae-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', height)
      .attr('x2', 0)
      .attr('y2', 0);

    const stops = d3.range(0, 1.1, 0.1);
    stops.forEach(stop => {
      gradient.append('stop')
        .attr('offset', stop)
        .attr('stop-color', colorScale(stop * maxError));
    });

    // Add colorbar rectangle
    colorbar.append('rect')
      .attr('width', colorbarWidth)
      .attr('height', height)
      .style('fill', 'url(#pae-gradient)');

    // Add colorbar axis
    colorbar.append('g')
      .attr('transform', `translate(${colorbarWidth},0)`)
      .call(colorbarAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 45)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Predicted Aligned Error');

  }, [pae]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="font-semibold mb-2">pLDDT Score</div>
        <div className="text-sm text-gray-600 mb-4">
          Predicted Local Distance Difference Test (pLDDT) scores indicate the confidence in local structure prediction.
          Higher scores (blue) indicate higher confidence.
        </div>
        <div 
          ref={plddtRef}
          className="w-full h-[200px]"
        />
      </Card>

      {pae && (
        <Card className="p-4">
          <div className="font-semibold mb-2">Predicted Aligned Error (PAE)</div>
          <div className="text-sm text-gray-600 mb-4">
            PAE matrix shows the expected error in position between pairs of residues.
            Lower values (darker blue) indicate higher confidence in the relative positions.
          </div>
          <div 
            ref={paeRef}
            className="w-full aspect-square"
          />
        </Card>
      )}
    </div>
  );
}; 