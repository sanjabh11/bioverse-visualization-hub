import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';

interface ExperimentDetails {
  accession: string;
  name: string;
  description: string;
  organism: string;
  experimenttype: string;
  samples: Array<{
    id: string;
    name: string;
    value: number;
    condition: string;
  }>;
}

export const ArrayExpressViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [studies, setStudies] = useState<ExperimentDetails[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<ExperimentDetails | null>(null);

  const handleSearch = async () => {
    if (!query) {
      toast.error('Please enter a search term');
      return;
    }

    setIsLoading(true);
    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${SERVER_URL}/api/arrayexpress/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch studies: ${response.status}`);
      }

      const data = await response.json();
      setStudies(data.experiments.experiment);
      toast.success(`Found ${data.experiments.experiment.length} studies`);
    } catch (error) {
      console.error('Error fetching studies:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch studies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudyClick = async (study: ExperimentDetails) => {
    setIsLoading(true);
    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${SERVER_URL}/api/arrayexpress/experiment/${study.accession}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to fetch study details: ${response.status}`);
      }

      const data = await response.json();
      setSelectedStudy(data);
      toast.success('Study details loaded successfully');
    } catch (error) {
      console.error('Error fetching study details:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch study details');
      setSelectedStudy(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="Search ArrayExpress studies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-bio-secondary hover:bg-bio-secondary/90"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {studies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Accession</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Organism</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Samples</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studies.map((study) => (
                <TableRow
                  key={study.accession}
                  onClick={() => handleStudyClick(study)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell>{study.accession}</TableCell>
                  <TableCell>{study.name}</TableCell>
                  <TableCell>{study.description}</TableCell>
                  <TableCell>{study.organism}</TableCell>
                  <TableCell>{study.experimenttype}</TableCell>
                  <TableCell>{study.samples?.length || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedStudy && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Study Details: {selectedStudy.accession}</h3>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Name:</span> {selectedStudy.name}</p>
              <p><span className="font-medium">Description:</span> {selectedStudy.description}</p>
              <p><span className="font-medium">Organism:</span> {selectedStudy.organism}</p>
              <p><span className="font-medium">Type:</span> {selectedStudy.experimenttype}</p>
              <p><span className="font-medium">Samples:</span> {selectedStudy.samples?.length || 0}</p>
            </div>
          </div>

          {selectedStudy.samples?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Samples</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Condition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudy.samples.map((sample) => (
                    <TableRow key={sample.id}>
                      <TableCell>{sample.id}</TableCell>
                      <TableCell>{sample.name}</TableCell>
                      <TableCell>{sample.value}</TableCell>
                      <TableCell>{sample.condition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
