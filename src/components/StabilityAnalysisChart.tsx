import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ProteinAnalysis } from '../services/deepseek';

interface StabilityAnalysisChartProps {
  analysis: ProteinAnalysis;
  width?: number;
  height?: number;
  colors?: {
    bar: string;
    grid: string;
    tooltip: string;
    threshold: string;
  };
}

export const StabilityAnalysisChart: React.FC<StabilityAnalysisChartProps> = ({
  analysis,
  width = 800,
  height = 400,
  colors = {
    bar: '#8884d8',
    grid: '#f5f5f5',
    tooltip: '#fff',
    threshold: '#ff0000',
  },
}) => {
  // Transform predictions data for the chart
  const chartData = analysis.structure.predictions
    .filter(pred => pred.type === 'stability')
    .map(pred => ({
      name: pred.type,
      score: pred.score,
      details: pred.details,
    }));

  // Calculate stability metrics
  const stabilityScore = analysis.structure.stability;
  const isStable = stabilityScore > 0.5; // Threshold can be adjusted

  return (
    <div className="stability-analysis-chart">
      <div style={{ marginBottom: '20px' }}>
        <h3>Protein Stability Analysis</h3>
        <div style={{ 
          fontSize: '0.9em',
          color: isStable ? '#4caf50' : '#f44336',
          marginTop: '10px',
        }}>
          Overall Stability Score: {stabilityScore.toFixed(2)}
          <span style={{ marginLeft: '10px' }}>
            ({isStable ? 'Stable' : 'Potentially Unstable'})
          </span>
        </div>
      </div>

      <ResponsiveContainer width={width} height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="name" />
          <YAxis
            domain={[0, 1]}
            label={{
              value: 'Stability Score',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: colors.tooltip }}
            formatter={(value: number) => [value.toFixed(3), 'Score']}
          />
          <Legend />
          <ReferenceLine
            y={0.5}
            stroke={colors.threshold}
            strokeDasharray="3 3"
            label={{
              value: 'Stability Threshold',
              position: 'right',
            }}
          />
          <Bar
            dataKey="score"
            fill={colors.bar}
            name="Stability Score"
            label={{
              position: 'top',
              formatter: (value: number) => value.toFixed(2),
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Additional Details */}
      <div className="stability-details" style={{ marginTop: '20px' }}>
        <h4>Stability Factors:</h4>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '10px',
          marginTop: '10px',
        }}>
          {chartData.map(item => 
            item.details && Object.entries(item.details).map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{key}</div>
                <div>{typeof value === 'number' ? value.toFixed(3) : value}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      {!isStable && (
        <div className="stability-recommendations" style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3e0',
          borderRadius: '4px',
        }}>
          <h4>Recommendations:</h4>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Consider optimizing the protein sequence</li>
            <li>Review potential destabilizing mutations</li>
            <li>Check environmental conditions for stability</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StabilityAnalysisChart; 