import { z } from 'zod';

// GEO Data Types
export const GEOSampleSchema = z.object({
  id: z.string(),
  accession: z.string(),
  title: z.string(),
  value: z.number(),
  condition: z.string()
});

export const GEODatasetSchema = z.object({
  dataset_id: z.string(),
  gene_id: z.string(),
  samples: z.array(GEOSampleSchema)
});

export type GEOSample = z.infer<typeof GEOSampleSchema>;
export type GEODataset = z.infer<typeof GEODatasetSchema>;

// Expression Data Type used by ExpressionPlot
export interface ExpressionData {
  dataset_id: string;
  gene_id: string;
  expression_values: Array<{
    sample_id: string;
    value: number;
    condition?: string;
  }>;
}

class NCBIApiService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor() {
    this.apiKey = import.meta.env.VITE_NCBI_API_KEY;
    this.baseUrl = import.meta.env.VITE_GEO_API_URL;
    this.timeout = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');
    this.retries = parseInt(import.meta.env.VITE_API_RETRIES || '3');
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = this.retries): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying request to ${url}, ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  async searchGeoDatasets(query: string): Promise<Array<{ accession: string; title: string }>> {
    const url = `${this.baseUrl}/esearch.fcgi?db=gds&term=${encodeURIComponent(query)}&retmode=json&api_key=${this.apiKey}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!data.esearchresult?.idlist?.length) {
      return [];
    }

    // Get details for each dataset
    const idList = data.esearchresult.idlist;
    const summaryUrl = `${this.baseUrl}/esummary.fcgi?db=gds&id=${idList.join(',')}&retmode=json&api_key=${this.apiKey}`;
    const summaryResponse = await this.fetchWithRetry(summaryUrl);
    const summaryData = await summaryResponse.json();

    return Object.values(summaryData.result || {})
      .filter((result): result is { accession: string; title: string } => 
        typeof result === 'object' && 
        result !== null && 
        'accession' in result && 
        'title' in result
      )
      .map(result => ({
        accession: result.accession,
        title: result.title
      }));
  }

  async getGeoDataset(accession: string): Promise<GEODataset> {
    // First get the dataset metadata
    const searchUrl = `${this.baseUrl}/esearch.fcgi?db=gds&term=${accession}[Accession]&retmode=json&api_key=${this.apiKey}`;
    const searchResponse = await this.fetchWithRetry(searchUrl);
    const searchData = await searchResponse.json();

    const geoId = searchData.esearchresult?.idlist?.[0];
    if (!geoId) {
      throw new Error(`Dataset not found: ${accession}`);
    }

    // Get detailed dataset information
    const summaryUrl = `${this.baseUrl}/esummary.fcgi?db=gds&id=${geoId}&retmode=json&api_key=${this.apiKey}`;
    const summaryResponse = await this.fetchWithRetry(summaryUrl);
    const summaryData = await summaryResponse.json();

    const dataset = summaryData.result?.[geoId];
    if (!dataset) {
      throw new Error('Dataset details not found');
    }

    // Get the actual expression data
    const dataUrl = `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${accession}&targ=self&form=text&view=quick`;
    const dataResponse = await this.fetchWithRetry(dataUrl);
    const dataText = await dataResponse.text();

    // Parse the tab-delimited data
    const lines = dataText.split('\n');
    const samples = dataset.samples.map(sample => ({
      id: sample.accession,
      accession: sample.accession,
      title: sample.title,
      value: 0, // Will be updated with real data
      condition: sample.title
    }));

    // Find and parse expression values
    let currentSample: GEOSample | null = null;
    for (const line of lines) {
      if (line.startsWith('!Sample_title')) {
        const title = line.split('=')[1]?.trim();
        currentSample = samples.find(s => s.title === title) || null;
      } else if (line.startsWith('!Sample_value') && currentSample) {
        const value = parseFloat(line.split('=')[1]);
        if (!isNaN(value)) {
          currentSample.value = value;
        }
      }
    }

    // Normalize values
    const values = samples.map(s => s.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    const normalizedSamples = samples.map(sample => ({
      ...sample,
      value: range === 0 ? 0 : ((sample.value - min) / range) * 100
    }));

    const result = {
      dataset_id: accession,
      gene_id: dataset.title,
      samples: normalizedSamples
    };

    // Validate the result
    return GEODatasetSchema.parse(result);
  }

  async downloadGeoDataset(accession: string): Promise<Blob> {
    const url = `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${accession}&targ=self&form=text&view=full`;
    const response = await this.fetchWithRetry(url);
    return response.blob();
  }
}

export const ncbiApi = new NCBIApiService(); 