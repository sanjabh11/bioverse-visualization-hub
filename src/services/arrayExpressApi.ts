import { z } from 'zod';

// ArrayExpress Data Types
export const ArrayExpressSampleSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  condition: z.string()
});

export const ArrayExpressExperimentSchema = z.object({
  accession: z.string(),
  title: z.string(),
  description: z.string(),
  organism: z.string(),
  experimentType: z.string(),
  samples: z.array(ArrayExpressSampleSchema)
});

export type ArrayExpressSample = z.infer<typeof ArrayExpressSampleSchema>;
export type ArrayExpressExperiment = z.infer<typeof ArrayExpressExperimentSchema>;

class ArrayExpressApiService {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor() {
    this.baseUrl = 'https://www.ebi.ac.uk/biostudies/api/v1';
    this.timeout = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');
    this.retries = parseInt(import.meta.env.VITE_API_RETRIES || '3');
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = this.retries): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Accept': 'application/json'
        },
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

  async searchExperiments(query: string): Promise<Array<{ accession: string; title: string }>> {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
    const url = `${SERVER_URL}/api/arrayexpress/search?query=${encodeURIComponent(query)}`;
    
    console.log(`[ArrayExpress] Searching with query: ${query}`);
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Failed to fetch experiments');
    }

    return (data.experiments?.experiment || [])
      .filter((exp: any): exp is { accession: string; name: string } => 
        typeof exp === 'object' && 
        exp !== null && 
        'accession' in exp
      )
      .map(exp => ({
        accession: exp.accession,
        title: exp.name || exp.accession,
        description: exp.description || '',
        organism: exp.organism || 'Unknown',
        experimentType: exp.platform || 'Unknown',
        sampleCount: exp.samples || 0
      }));
  }

  async getExperimentDetails(accession: string): Promise<ArrayExpressExperiment> {
    const url = `${this.baseUrl}/studies/${accession}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!data) {
      throw new Error(`Experiment not found: ${accession}`);
    }

    const result = {
      accession: data.accno,
      title: data.title || data.accno,
      description: data.section?.description || '',
      organism: data.section?.organism || 'Unknown',
      experimentType: data.section?.experimenttype || 'Unknown',
      samples: (data.section?.files || [])
        .filter((file: any) => file.type === 'data')
        .map((file: any) => ({
          id: file.path,
          name: file.name || file.path,
          value: 0,
          condition: file.attributes?.condition || 'Unknown'
        }))
    };

    // Validate the result
    return ArrayExpressExperimentSchema.parse(result);
  }

  async getExpressionData(accession: string): Promise<{ [key: string]: number[] }> {
    const url = `${this.baseUrl}/studies/${accession}/raw`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();
    return data;
  }

  async downloadExperiment(accession: string): Promise<Blob> {
    const url = `${this.baseUrl}/studies/${accession}/download`;
    const response = await this.fetchWithRetry(url);
    return response.blob();
  }
}

export const arrayExpressApi = new ArrayExpressApiService(); 