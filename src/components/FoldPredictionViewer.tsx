import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ProteinAnalysis } from '../services/deepseek';

interface FoldPredictionViewerProps {
  analysis: ProteinAnalysis;
  width?: number;
  height?: number;
  colors?: {
    confidence: string[];
    background: string;
    text: string;
    axis: string;
  };
}

export const FoldPredictionViewer: React.FC<FoldPredictionViewerProps> = ({
  analysis,
  width = 1200,
  height = 600,
  colors = {
    confidence: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    background: '#ffffff',
    text: '#333333',
    axis: '#666666',
  },
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !analysis.structure.folds.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Find the sequence length from fold data
    const maxEnd = Math.max(...analysis.structure.folds.map(f => Number(f.end)));

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, maxEnd])
      .range([0, innerWidth]);

    const confidenceScale = d3.scaleQuantize()
      .domain([0, 1])
      .range(colors.confidence);

    // Draw fold regions
    const foldHeight = innerHeight * 0.6;
    const foldGroup = g.append('g');

    analysis.structure.folds.forEach(fold => {
      // Draw fold region
      foldGroup.append('rect')
        .attr('x', xScale(fold.start))
        .attr('y', (innerHeight - foldHeight) / 2)
        .attr('width', xScale(fold.end) - xScale(fold.start))
        .attr('height', foldHeight)
        .attr('fill', confidenceScale(fold.confidence))
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('rx', 4);

      // Add fold type label if there's enough space
      const width = xScale(fold.end) - xScale(fold.start);
      if (width > 60) {
        foldGroup.append('text')
          .attr('x', xScale(fold.start) + width / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('fill', colors.text)
          .text(fold.type);
      }
    });

    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d => `${d}`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .style('color', colors.axis);

    // Add x-axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5)
      .attr('text-anchor', 'middle')
      .style('fill', colors.text)
      .text('Residue Position');

    // Add confidence scale legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - margin.right},10)`);

    const confidenceLegendScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, legendWidth]);

    const confidenceLegendAxis = d3.axisBottom(confidenceLegendScale)
      .ticks(5)
      .tickFormat(d => `${d * 100}%`);

    // Draw confidence gradient
    const gradientData = d3.range(0, 1, 0.01);
    legend.selectAll('rect')
      .data(gradientData)
      .enter()
      .append('rect')
      .attr('x', d => confidenceLegendScale(d))
      .attr('width', legendWidth / gradientData.length + 1)
      .attr('height', legendHeight)
      .attr('fill', d => confidenceScale(d));

    // Add confidence scale axis
    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(confidenceLegendAxis)
      .style('color', colors.axis);

    // Add legend title
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('fill', colors.text)
      .text('Confidence');

  }, [analysis, width, height, colors]);

  return (
    <div className="fold-prediction-viewer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: colors.background }}
      />
      <div className="fold-types" style={{ marginTop: '10px' }}>
        <h4>Fold Types:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Array.from(new Set(analysis.structure.folds.map(f => f.type))).map(type => (
            <div
              key={type}
              style={{
                padding: '4px 8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                fontSize: '0.9em',
              }}
            >
              {type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FoldPredictionViewer;
