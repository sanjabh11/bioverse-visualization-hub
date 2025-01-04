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

  const predictStructure = async (sequence: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.deepseekKey}`,
        'Accept': 'application/json'
      };

      // First, make a preflight request to check API availability
      const preflightResponse = await fetch(CONFIG.apiEndpoints.deepseek + '/protein/predict', {
        method: 'OPTIONS',
        headers
      });

      if (!preflightResponse.ok) {
        console.warn('Preflight request failed:', preflightResponse.status);
      }

      // Make the actual prediction request
      const response = await fetch(`${CONFIG.apiEndpoints.deepseek}/protein/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          sequence,
          model: 'deepseek-3',
          streamResults: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Prediction response:', data);
      return data;
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
    toast.info("Starting structure prediction...");

    try {
      const result = await predictStructure(sequence);
      console.log('Structure prediction result:', result);
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
          <ProteinViewer />
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