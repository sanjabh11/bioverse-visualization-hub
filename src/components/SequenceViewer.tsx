import React, { useEffect, useRef } from 'react';
import { Card } from './ui/card';

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
    }
  }
}

export const SequenceViewer: React.FC<SequenceViewerProps> = ({
  sequence,
  features,
  accession
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load ProtVista scripts
    const loadProtVistaScripts = async () => {
      const scripts = [
        'https://cdn.jsdelivr.net/npm/protvista-manager@3.8.22/dist/protvista-manager.js',
        'https://cdn.jsdelivr.net/npm/protvista-sequence@3.8.22/dist/protvista-sequence.js',
        'https://cdn.jsdelivr.net/npm/protvista-navigation@3.8.22/dist/protvista-navigation.js',
        'https://cdn.jsdelivr.net/npm/protvista-track@3.8.22/dist/protvista-track.js'
      ];

      for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          document.head.appendChild(script);
        }
      }
    };

    loadProtVistaScripts();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !sequence) return;

    // Format features for ProtVista
    const formattedFeatures = features.map((feature, index) => ({
      accession: `feature-${index}`,
      type: feature.type,
      category: feature.type,
      description: feature.description,
      start: feature.location.start,
      end: feature.location.end,
      color: '#00a6d6'
    }));

    // Wait for custom elements to be defined
    const initProtVista = async () => {
      try {
        await customElements.whenDefined('protvista-sequence');
        await customElements.whenDefined('protvista-navigation');
        await customElements.whenDefined('protvista-track');

        const manager = containerRef.current?.querySelector('protvista-manager');
        if (manager) {
          manager.setAttribute('attributes', JSON.stringify(formattedFeatures));
        }
      } catch (error) {
        console.error('Error initializing ProtVista:', error);
      }
    };

    // Initialize after a short delay to ensure components are loaded
    setTimeout(initProtVista, 1000);
  }, [sequence, features, accession]);

  return (
    <Card className="p-4">
      <div className="font-semibold mb-2">Sequence Visualization</div>
      <div 
        ref={containerRef} 
        className="w-full min-h-[200px] bg-gray-50 rounded"
        data-testid="sequence-viewer"
      >
        <protvista-manager attributes="features">
          <protvista-navigation length={sequence.length} />
          <protvista-sequence 
            sequence={sequence} 
            length={sequence.length} 
            displaystart="1" 
            displayend={sequence.length.toString()}
          />
          <protvista-track 
            length={sequence.length} 
            displaystart="1" 
            displayend={sequence.length.toString()}
            layout="non-overlapping" 
            height="200"
          />
        </protvista-manager>
      </div>
    </Card>
  );
}; 