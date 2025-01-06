import { z } from 'zod';

// Type definitions for Deepseek API responses
export interface DeepseekResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Zod schema for protein analysis
const ProteinAnalysisSchema = z.object({
  structure: z.object({
    stability: z.number(),
    folds: z.array(z.object({
      confidence: z.number(),
      type: z.string(),
      start: z.number(),
      end: z.number(),
    })),
    predictions: z.array(z.object({
      type: z.string(),
      score: z.number(),
      details: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  metadata: z.object({
    timestamp: z.string(),
    model_version: z.string(),
  }),
});

export type ProteinAnalysis = z.infer<typeof ProteinAnalysisSchema>;

class DeepseekApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'DeepseekApiError';
  }
}

export class DeepseekApiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    this.baseUrl = import.meta.env.VITE_DEEPSEEK_API_URL;
    this.timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
    this.retries = Number(import.meta.env.VITE_API_RETRIES) || 3;

    if (!this.apiKey) {
      throw new Error('Deepseek API key is not configured');
    }
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<DeepseekResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new DeepseekApiError(
          `Deepseek API error: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      if (error instanceof DeepseekApiError) {
        throw error;
      }

      if (retryCount < this.retries) {
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw new DeepseekApiError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  async analyzeProteinStructure(
    structureData: string,
    options: {
      predictFolds?: boolean;
      analyzeStability?: boolean;
    } = {}
  ): Promise<DeepseekResponse<ProteinAnalysis>> {
    const url = `${this.baseUrl}/analyze-structure`;
    
    const response = await this.fetchWithRetry<ProteinAnalysis>(
      url,
      {
        method: 'POST',
        body: JSON.stringify({
          structure: structureData,
          options: {
            predictFolds: options.predictFolds ?? true,
            analyzeStability: options.analyzeStability ?? true,
          },
        }),
      }
    );

    try {
      // Validate response data
      ProteinAnalysisSchema.parse(response.data);
      return response;
    } catch (error) {
      throw new DeepseekApiError('Invalid protein analysis response format');
    }
  }
}

export const deepseekApi = new DeepseekApiService(); 