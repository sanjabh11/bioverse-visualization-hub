import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface UniProtEntry {
  accession: string;
  id: string;
  proteinName: string;
  organism: string;
  sequence: string;
  length: number;
  features: Array<{
    type: string;
    location: {
      start: number;
      end: number;
    };
    description: string;
  }>;
}

export const UniProtViewer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [accession, setAccession] = useState('');
  const [protein, setProtein] = useState<UniProtEntry | null>(null);

  const fetchProtein = async () => {
    if (!accession) {
      toast.error('Please enter a UniProt accession ID');
      return;
    }

    setIsLoading(true);
    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${SERVER_URL}/api/uniprot/${accession}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch protein: ${response.status}`);
      }

      const data = await response.json();
      setProtein(data);
      toast.success('Protein data loaded successfully');
    } catch (error) {
      console.error('Error fetching protein:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch protein');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="Enter UniProt accession (e.g., P53)"
          value={accession}
          onChange={(e) => setAccession(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={fetchProtein}
          disabled={isLoading}
          className="bg-bio-secondary hover:bg-bio-secondary/90"
        >
          {isLoading ? 'Loading...' : 'Fetch Protein'}
        </Button>
      </div>

      {protein && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-semibold mb-4">{protein.proteinName}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Accession</p>
                <p>{protein.accession}</p>
              </div>
              <div>
                <p className="font-medium">Entry Name</p>
                <p>{protein.id}</p>
              </div>
              <div>
                <p className="font-medium">Organism</p>
                <p>{protein.organism}</p>
              </div>
              <div>
                <p className="font-medium">Length</p>
                <p>{protein.length} amino acids</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-medium mb-2">Sequence</p>
              <div className="font-mono text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                {protein.sequence.match(/.{1,60}/g)?.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>

            {protein.features?.length > 0 && (
              <div className="mt-4">
                <p className="font-medium mb-2">Features</p>
                <div className="space-y-2">
                  {protein.features.map((feature, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium text-sm">{feature.type}</p>
                      <p className="text-xs text-gray-600">
                        Position: {feature.location.start}-{feature.location.end}
                      </p>
                      {feature.description && (
                        <p className="text-xs mt-1">{feature.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 