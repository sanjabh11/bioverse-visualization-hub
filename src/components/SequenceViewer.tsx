import React, { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import ProtvistaManager from 'protvista-manager';
import ProtvistaSequence from 'protvista-sequence';
import ProtvistaNavigation from 'protvista-navigation';
import ProtvistaTrack from 'protvista-track';

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

export const SequenceViewer: React.FC<SequenceViewerProps> = ({
  sequence,
  features,
  accession
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

    const manager = containerRef.current?.querySelector('protvista-manager');
    if (manager) {
      manager.setAttribute('attributes', JSON.stringify(formattedFeatures));
    }

    const seqViewer = containerRef.current?.querySelector('protvista-sequence');
    if (seqViewer) {
      seqViewer.setAttribute('sequence', sequence);
      seqViewer.setAttribute('length', sequence.length.toString());
    }
  }, [sequence, features, accession]);

  return (
    <Card className="p-4">
      <div className="font-semibold mb-2">Sequence Visualization</div>
      <div 
        ref={containerRef} 
        className="w-full min-h-[200px] bg-gray-50 rounded"
        data-testid="sequence-viewer"
      >
        <protvista-manager>
          <protvista-navigation length={sequence.length} />
          <protvista-sequence 
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
