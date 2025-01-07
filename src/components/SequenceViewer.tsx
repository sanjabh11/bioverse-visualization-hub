import React, { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import * as d3 from 'd3';

interface SequenceViewerProps {
  sequence: string;
  features: Array<{
    type: string;
    location: {
      start: number;
      end: number;
    };
    description: string;
  }>;
  accession: string;
}

// Add type for sequence character
type SequenceChar = string;

export const SequenceViewer: React.FC<SequenceViewerProps> = ({
  sequence,
  features,
  accession
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !sequence) return;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip div
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'absolute hidden bg-white p-2 border border-gray-200 rounded shadow-lg text-sm')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, sequence.length])
      .range([0, width]);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('fill', 'black')
      .text('Sequence Position');

    // Draw sequence blocks
    const sequenceGroup = svg.append('g')
      .attr('transform', `translate(0,0)`);

    // Split sequence into lines of 60 characters
    const sequenceLines = (sequence.match(/.{1,60}/g) || []) as string[];
    const lineHeight = 20;
    const charWidth = width / 60;

    sequenceLines.forEach((line: string, lineIndex) => {
      // Add line number
      sequenceGroup.append('text')
        .attr('x', -30)
        .attr('y', lineIndex * lineHeight + 15)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('fill', '#4b5563')
        .text((lineIndex * 60 + 1).toString());

      // Add sequence characters
      sequenceGroup.selectAll<SVGTextElement, SequenceChar>(`.line-${lineIndex}`)
        .data(line.split('') as SequenceChar[])
        .enter()
        .append('text')
        .attr('x', (_, i) => i * charWidth)
        .attr('y', lineIndex * lineHeight + 15)
        .attr('font-family', 'monospace')
        .attr('font-size', '12px')
        .attr('fill', '#1f2937')
        .text(d => d);
    });

    // Calculate feature track positions
    const featureStartY = (sequenceLines.length + 1) * lineHeight;
    const featureHeight = 15;
    const featureGap = 5;
    const featureColors = d3.scaleOrdinal(d3.schemeCategory10);

    // Group features by type
    const featuresByType = features.reduce((acc, feature) => {
      if (!acc[feature.type]) {
        acc[feature.type] = [];
      }
      acc[feature.type].push(feature);
      return acc;
    }, {} as Record<string, typeof features>);

    // Draw feature tracks
    Object.entries(featuresByType).forEach(([type, typeFeatures], typeIndex) => {
      const featureGroup = svg.append('g')
        .attr('transform', `translate(0,${featureStartY + typeIndex * (featureHeight + featureGap)})`);

      // Add type label
      featureGroup.append('text')
        .attr('x', -30)
        .attr('y', featureHeight / 2)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('fill', '#4b5563')
        .text(type);

      // Draw features
      typeFeatures.forEach(feature => {
        const featureWidth = (feature.location.end - feature.location.start) * charWidth;
        const featureX = feature.location.start * charWidth;

        const featureRect = featureGroup.append('rect')
          .attr('x', featureX)
          .attr('y', 0)
          .attr('width', featureWidth)
          .attr('height', featureHeight)
          .attr('fill', featureColors(type))
          .attr('rx', 2)
          .attr('ry', 2)
          .attr('opacity', 0.7);

        featureRect
          .on('mouseover', (event: MouseEvent) => {
            tooltip
              .style('display', 'block')
              .html(`
                <div class="font-medium">${type}</div>
                <div class="text-gray-600">${feature.description}</div>
                <div class="text-gray-500">Position: ${feature.location.start}-${feature.location.end}</div>
              `);
            
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
              const mouseX = event.clientX - containerRect.left;
              const mouseY = event.clientY - containerRect.top;
              tooltip
                .style('left', `${mouseX + 10}px`)
                .style('top', `${mouseY - 10}px`);
            }
          })
          .on('mousemove', (event: MouseEvent) => {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
              const mouseX = event.clientX - containerRect.left;
              const mouseY = event.clientY - containerRect.top;
              tooltip
                .style('left', `${mouseX + 10}px`)
                .style('top', `${mouseY - 10}px`);
            }
          })
          .on('mouseout', () => {
            tooltip.style('display', 'none');
          });
      });
    });

  }, [sequence, features, accession]);

  return (
    <Card className="p-4">
      <div className="font-semibold mb-2">Sequence Visualization</div>
      <div 
        ref={containerRef} 
        className="w-full min-h-[400px] bg-gray-50 rounded overflow-hidden relative"
        data-testid="sequence-viewer"
      />
    </Card>
  );
}; 