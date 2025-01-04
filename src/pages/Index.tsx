import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SequenceCanvas } from "@/components/SequenceCanvas";
import { ExpressionPlot } from "@/components/ExpressionPlot";

const Index = () => {
  const handleSequenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Analysis started! This may take a few minutes.");
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
            />
            <Button type="submit" className="bg-bio-accent hover:bg-bio-accent/90">
              Predict Structure
            </Button>
          </form>
          <div className="w-full h-[400px] bg-gray-50 rounded-lg border border-gray-200">
            {/* MolStar viewer will be integrated here */}
          </div>
        </section>

        {/* Sequence Analysis Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-bio-primary">Sequence Analysis</h2>
          <SequenceCanvas />
        </section>

        {/* Expression Data Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-bio-primary">Expression Data</h2>
          <div className="flex gap-4 mb-4">
            <Input placeholder="Enter GEO accession..." />
            <Button className="bg-bio-secondary hover:bg-bio-secondary/90">
              Fetch Data
            </Button>
          </div>
          <ExpressionPlot />
        </section>
      </main>
    </div>
  );
};

export default Index;