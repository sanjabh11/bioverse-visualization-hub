import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { BlastResult } from '../services/ncbiApi';

interface SequenceAlignmentViewerProps {
  alignment: BlastResult;
  width?: number;
  height?: number;
  colorScheme?: {
    match: string;
    mismatch: string;
    gap: string;
    background: string;
  };
}

export const SequenceAlignmentViewer: React.FC<SequenceAlignmentViewerProps> = ({
  alignment,
  width = 800,
  height = 400,
  colorScheme = {
    match: '#91cf60',
    mismatch: '#fc8d59',
    gap: '#ffffff',
    background: '#f7f7f7',
  },
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !alignment.hits.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 20, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process alignment data
    const firstHit = alignment.hits[0];
    const firstAlignment = firstHit.alignments[0];
    const sequenceLength = firstAlignment.query_seq.length;
    const residueWidth = Math.min(20, innerWidth / sequenceLength);
    const residueHeight = 20;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, sequenceLength])
      .range([0, innerWidth]);

    // Draw query sequence
    g.append('text')
      .attr('x', -10)
      .attr('y', residueHeight)
      .attr('text-anchor', 'end')
      .text('Query');

    const queryGroup = g.append('g')
      .attr('transform', `translate(0,0)`);

    queryGroup.selectAll('rect')
      .data(firstAlignment.query_seq.split(''))
      .enter()
      .append('rect')
      .attr('x', (_, i) => i * residueWidth)
      .attr('y', 0)
      .attr('width', residueWidth)
      .attr('height', residueHeight)
      .attr('fill', (d, i) => {
        if (d === '-') return colorScheme.gap;
        return firstAlignment.midline[i] === '|' 
          ? colorScheme.match 
          : colorScheme.mismatch;
      });

    queryGroup.selectAll('text')
      .data(firstAlignment.query_seq.split(''))
      .enter()
      .append('text')
      .attr('x', (_, i) => i * residueWidth + residueWidth / 2)
      .attr('y', residueHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-family', 'monospace')
      .style('font-size', '12px')
      .text(d => d);

    // Draw subject sequence
    g.append('text')
      .attr('x', -10)
      .attr('y', residueHeight * 3)
      .attr('text-anchor', 'end')
      .text('Subject');

    const subjectGroup = g.append('g')
      .attr('transform', `translate(0,${residueHeight * 2})`);

    subjectGroup.selectAll('rect')
      .data(firstAlignment.subject_seq.split(''))
      .enter()
      .append('rect')
      .attr('x', (_, i) => i * residueWidth)
      .attr('y', 0)
      .attr('width', residueWidth)
      .attr('height', residueHeight)
      .attr('fill', (d, i) => {
        if (d === '-') return colorScheme.gap;
        return firstAlignment.midline[i] === '|' 
          ? colorScheme.match 
          : colorScheme.mismatch;
      });

    subjectGroup.selectAll('text')
      .data(firstAlignment.subject_seq.split(''))
      .enter()
      .append('text')
      .attr('x', (_, i) => i * residueWidth + residueWidth / 2)
      .attr('y', residueHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-family', 'monospace')
      .style('font-size', '12px')
      .text(d => d);

    // Draw midline
    const midlineGroup = g.append('g')
      .attr('transform', `translate(0,${residueHeight})`);

    midlineGroup.selectAll('text')
      .data(firstAlignment.midline.split(''))
      .enter()
      .append('text')
      .attr('x', (_, i) => i * residueWidth + residueWidth / 2)
      .attr('y', residueHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-family', 'monospace')
      .style('font-size', '12px')
      .text(d => d);

    // Add position labels
    g.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .text(firstAlignment.query_start);

    g.append('text')
      .attr('x', innerWidth)
      .attr('y', -10)
      .attr('text-anchor', 'end')
      .text(firstAlignment.query_end);

  }, [alignment, width, height, colorScheme]);

  return (
    <div className="sequence-alignment-viewer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: colorScheme.background }}
      />
      <div className="legend" style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <div>
            <span style={{ 
              backgroundColor: colorScheme.match,
              padding: '2px 8px',
              marginRight: '5px' 
            }}></span>
            Match
          </div>
          <div>
            <span style={{ 
              backgroundColor: colorScheme.mismatch,
              padding: '2px 8px',
              marginRight: '5px' 
            }}></span>
            Mismatch
          </div>
          <div>
            <span style={{ 
              backgroundColor: colorScheme.gap,
              border: '1px solid #ccc',
              padding: '2px 8px',
              marginRight: '5px' 
            }}></span>
            Gap
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAlignmentViewer; 