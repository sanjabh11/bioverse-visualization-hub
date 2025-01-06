import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SequenceCanvas } from "@/components/SequenceCanvas";
import { ExpressionPlot } from "@/components/ExpressionPlot";
import { CONFIG } from "@/config/api";
import { useState } from "react";
import { ProteinViewer } from "@/components/ProteinViewer";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sequence, setSequence] = useState("");
  const [geoId, setGeoId] = useState("");
  const [prediction, setPrediction] = useState<string | undefined>();

  const predictStructure = async (sequence: string) => {
    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      
      // First check if the server is available
      const healthCheck = await fetch(`${SERVER_URL}/health`).catch(() => null);
      if (!healthCheck?.ok) {
        throw new Error('Proxy server is not available. Please ensure the server is running.');
      }

      console.log('Making prediction request to proxy server');
      console.log('Sequence:', sequence);
      
      const response = await fetch(`${SERVER_URL}/api/protein/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          sequence,
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      let errorData;
      if (!response.ok) {
        try {
          errorData = await response.json();
          console.error('API Error:', {
            status: response.status,
            error: errorData
          });
        } catch (e) {
          const textError = await response.text();
          console.error('API Error (text):', textError);
          errorData = { message: textError };
        }
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Prediction response:', data);
      
      // Extract the predicted structure from the chat completion response
      const prediction = data.choices?.[0]?.message?.content;
      if (!prediction) {
        throw new Error('No prediction received from the API');
      }

      return {
        prediction,
        raw_response: data
      };
    } catch (error) {
      console.error('Structure prediction failed:', error);
      throw error;
    }
  };

  const fetchGeoData = async (geoId: string) => {
    try {
      const response = await fetch(
        `${CONFIG.apiEndpoints.ncbi}/geo/query/acc.cgi?acc=${geoId}&api_key=${CONFIG.ncbiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GEO data fetch failed:', error);
      throw error;
    }
  };

  const handleSequenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sequence.trim()) {
      toast.error("Please enter a protein sequence");
      return;
    }

    setIsLoading(true);
    setPrediction(undefined);
    toast.info("Starting structure prediction...");

    try {
      const result = await predictStructure(sequence);
      console.log('Structure prediction result:', result);
      setPrediction(result.prediction);
      toast.success("Structure prediction completed successfully!");
    } catch (error: any) {
      console.error('Prediction error:', error);
      toast.error(error.message || "Failed to predict structure. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeoSubmit = async () => {
    if (!geoId) {
      toast.error("Please enter a GEO accession ID");
      return;
    }

    setIsLoading(true);
    
    try {
      const data = await fetchGeoData(geoId);
      console.log('GEO data result:', data);
      toast.success("Expression data fetched successfully!");
    } catch (error: any) {
      console.error('GEO error:', error);
      toast.error(error.message || "Failed to fetch expression data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bio-light to-white">
      {/* Header */}
      <header className="bg-bio-primary text-white py-6">
        <div className="container">
          <h1 className="text-4xl font-bold animate-fade-up">Bioinformatics Web Platform</h1>
          <p className="mt-2 text-bio-light opacity-90">Advanced protein structure and sequence analysis</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Structure Prediction Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-bio-primary">Structure Prediction</h2>
          <form onSubmit={handleSequenceSubmit} className="space-y-4">
            <Textarea 
              placeholder="Enter protein sequence..."
              className="font-mono"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
            />
            <Button 
              type="submit" 
              className="bg-bio-accent hover:bg-bio-accent/90"
              disabled={isLoading}
            >
              {isLoading ? "Predicting..." : "Predict Structure"}
            </Button>
          </form>
          <ProteinViewer structure={prediction} isLoading={isLoading} />
        </section>

        {/* Expression Data Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-bio-primary">Expression Data</h2>
          <div className="flex gap-4 mb-4">
            <Input 
              placeholder="Enter GEO accession..." 
              value={geoId}
              onChange={(e) => setGeoId(e.target.value)}
            />
            <Button 
              className="bg-bio-secondary hover:bg-bio-secondary/90"
              onClick={handleGeoSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Fetch Data"}
            </Button>
          </div>
          <ExpressionPlot />
        </section>

        {/* Sequence Analysis Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-bio-primary">Sequence Analysis</h2>
          <SequenceCanvas />
        </section>
      </main>
    </div>
  );
};

export default Index;