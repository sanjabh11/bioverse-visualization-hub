import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ExpressionData } from '../services/ncbiApi';

interface ExpressionPlotProps {
  data?: ExpressionData;
  width?: number;
  height?: number;
  colors?: {
    line: string;
    grid: string;
    tooltip: string;
  };
  isLoading?: boolean;
}

export const ExpressionPlot: React.FC<ExpressionPlotProps> = ({
  data,
  width = 800,
  height = 400,
  colors = {
    line: '#8884d8',
    grid: '#f5f5f5',
    tooltip: '#fff',
  },
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div 
        className="expression-plot-loading" 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <div>Loading expression data...</div>
      </div>
    );
  }

  if (!data?.expression_values?.length) {
    return (
      <div 
        className="expression-plot-error" 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          padding: '20px',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '1.1em', color: '#f57c00' }}>
          No expression data available
        </div>
        <div style={{ fontSize: '0.9em', color: '#666' }}>
          Please ensure you have selected a valid gene and dataset
        </div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.expression_values.map((value, index) => ({
    name: value.sample_id,
    value: value.value,
    condition: value.condition || 'Unknown',
  }));

  // Calculate statistics
  const values = chartData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  );

  return (
    <div className="expression-plot">
      <div style={{ marginBottom: '20px' }}>
        <h3>Expression Profile: {data.gene_id}</h3>
        <div style={{ fontSize: '0.9em', color: '#666' }}>
          Dataset: {data.dataset_id}
        </div>
        <div style={{ fontSize: '0.9em', color: '#666' }}>
          Mean: {mean.toFixed(2)} ± {std.toFixed(2)} SD
        </div>
      </div>

      <ResponsiveContainer width={width} height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis
            label={{
              value: 'Expression Level',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: colors.tooltip }}
            formatter={(value: number) => [value.toFixed(2), 'Expression']}
            labelFormatter={(label: string) => `Sample: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            activeDot={{ r: 8 }}
            name="Expression Level"
          />

          {/* Add mean line */}
          <Line
            type="monotone"
            data={[
              { name: chartData[0].name, value: mean },
              { name: chartData[chartData.length - 1].name, value: mean },
            ]}
            stroke="#ff7300"
            strokeDasharray="5 5"
            name="Mean"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Conditions Legend */}
      <div className="conditions-legend" style={{ marginTop: '20px' }}>
        <h4>Conditions:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Array.from(new Set(chartData.map(d => d.condition))).map(condition => (
            <div
              key={condition}
              style={{
                padding: '4px 8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                fontSize: '0.9em',
              }}
            >
              {condition}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpressionPlot;