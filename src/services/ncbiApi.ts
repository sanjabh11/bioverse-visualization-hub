import { z } from 'zod';

// Type definitions
export interface NCBIResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Zod schemas for different NCBI responses
const GEODatasetSchema = z.object({
  accession: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  samples: z.array(z.object({
    accession: z.string(),
    title: z.string(),
  })).optional(),
});

const ProteinSchema = z.object({
  accession: z.string(),
  sequence: z.string(),
  length: z.number(),
  organism: z.string(),
  features: z.array(z.object({
    type: z.string(),
    location: z.string(),
    description: z.string().optional(),
  })).optional(),
});

const BlastResultSchema = z.object({
  query: z.string(),
  hits: z.array(z.object({
    id: z.string(),
    score: z.number(),
    evalue: z.number(),
    identity: z.number(),
    alignments: z.array(z.object({
      query_start: z.number(),
      query_end: z.number(),
      subject_start: z.number(),
      subject_end: z.number(),
      query_seq: z.string(),
      subject_seq: z.string(),
      midline: z.string(),
    })),
  })),
});

const ExpressionDataSchema = z.object({
  dataset_id: z.string(),
  gene_id: z.string(),
  expression_values: z.array(z.object({
    sample_id: z.string(),
    value: z.number(),
    condition: z.string().optional(),
  })),
});

export type GEODataset = z.infer<typeof GEODatasetSchema>;
export type Protein = z.infer<typeof ProteinSchema>;
export type BlastResult = z.infer<typeof BlastResultSchema>;
export type ExpressionData = z.infer<typeof ExpressionDataSchema>;

class NCBIApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'NCBIApiError';
  }
}

export class NCBIApiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.apiKey = import.meta.env.VITE_NCBI_API_KEY;
    this.baseUrl = import.meta.env.VITE_GEO_API_URL;
    this.timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
    this.retries = Number(import.meta.env.VITE_API_RETRIES) || 3;

    if (!this.apiKey) {
      throw new Error('NCBI API key is not configured');
    }
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<NCBIResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'api-key': this.apiKey,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NCBIApiError(
          `NCBI API error: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      if (error instanceof NCBIApiError) {
        throw error;
      }

      if (retryCount < this.retries) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw new NCBIApiError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  async getGeoDataset(accession: string): Promise<NCBIResponse<GEODataset>> {
    const url = new URL(`${this.baseUrl}/query/acc.cgi`);
    url.searchParams.append('acc', accession);
    url.searchParams.append('format', 'json');

    const response = await this.fetchWithRetry<GEODataset>(url.toString());
    try {
      GEODatasetSchema.parse(response.data);
      return response;
    } catch (error) {
      throw new NCBIApiError('Invalid GEO dataset response format');
    }
  }

  async getProteinInfo(proteinId: string): Promise<NCBIResponse<Protein>> {
    const url = new URL(`${this.baseUrl}/protein/${proteinId}`);
    url.searchParams.append('format', 'json');

    const response = await this.fetchWithRetry<Protein>(url.toString());
    try {
      ProteinSchema.parse(response.data);
      return response;
    } catch (error) {
      throw new NCBIApiError('Invalid protein info response format');
    }
  }

  async runBlastSearch(
    sequence: string,
    options: {
      database?: string;
      evalue?: number;
      max_hits?: number;
    } = {}
  ): Promise<NCBIResponse<BlastResult>> {
    const url = new URL(`${this.baseUrl}/blast/blastp`);
    
    const response = await this.fetchWithRetry<BlastResult>(
      url.toString(),
      {
        method: 'POST',
        body: JSON.stringify({
          sequence,
          database: options.database ?? 'nr',
          evalue: options.evalue ?? 1e-5,
          max_hits: options.max_hits ?? 100,
        }),
      }
    );

    try {
      BlastResultSchema.parse(response.data);
      return response;
    } catch (error) {
      throw new NCBIApiError('Invalid BLAST response format');
    }
  }

  async getExpressionData(
    geneId: string,
    datasetId: string
  ): Promise<NCBIResponse<ExpressionData>> {
    const url = new URL(`${this.baseUrl}/geo/profiles`);
    url.searchParams.append('gene', geneId);
    url.searchParams.append('dataset', datasetId);
    url.searchParams.append('format', 'json');

    const response = await this.fetchWithRetry<ExpressionData>(url.toString());
    try {
      ExpressionDataSchema.parse(response.data);
      return response;
    } catch (error) {
      throw new NCBIApiError('Invalid expression data response format');
    }
  }
}

export const ncbiApi = new NCBIApiService(); 