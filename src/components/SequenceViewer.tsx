import React, { useEffect } from 'react';
import { Card } from '../components/ui/card';

// Register ProtVista components as custom elements
if (typeof window !== 'undefined') {
  customElements.define('protvista-sequence', class extends HTMLElement {});
  customElements.define('protvista-manager', class extends HTMLElement {});
  customElements.define('protvista-navigation', class extends HTMLElement {});
  customElements.define('protvista-track', class extends HTMLElement {});
  customElements.define('protvista-zoomable', class extends HTMLElement {});
}

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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'protvista-sequence': any;
      'protvista-manager': any;
      'protvista-navigation': any;
      'protvista-track': any;
      'protvista-zoomable': any;
    }
  }
}

export const SequenceViewer: React.FC<SequenceViewerProps> = ({
  sequence,
  features,
  accession
}) => {
  useEffect(() => {
    // Ensure Web Components are loaded
    if (typeof window !== 'undefined' && window.customElements) {
      // Wait for ProtVista components to be defined
      customElements.whenDefined('protvista-sequence').then(() => {
        // Components are ready
      });
    }
  }, []);

  return (
    <Card className="p-4">
      <div className="font-semibold mb-2">Sequence Visualization</div>
      <div 
        className="w-full min-h-[300px] bg-gray-50 rounded"
        data-testid="sequence-viewer"
        style={{ 
          position: 'relative', 
          overflow: 'hidden',
          minWidth: '800px',
          height: '300px'
        }}
      >
        {typeof window !== 'undefined' && (
          <protvista-manager>
          <protvista-navigation length={sequence.length} />
          <protvista-sequence 
            sequence={sequence} 
            displaystart="1" 
            displayend={sequence.length.toString()}
            height="50"
          />
          <protvista-track 
            length={sequence.length}
            displaystart="1"
            displayend={sequence.length.toString()}
            layout="non-overlapping"
            height="150"
            features={JSON.stringify(features.map(f => ({
              ...f,
              start: f.location.start,
              end: f.location.end,
              color: '#FF0000',
              typeCategory: 'miscellaneous'
            })))}
          />
          <protvista-zoomable />
        </protvista-manager>
        )}
      </div>
    </Card>
  );
};
