import { z } from 'zod';

export interface StructureSearchResult {
  query_id: string;
  hits: Array<{
    target_id: string;
    alignment_score: number;
    rmsd: number;
    sequence_identity: number;
    alignment_length: number;
  }>;
}

export class StructureSearchService {
  private readonly baseUrl: string;
  private readonly mmseqsUrl: string;

  constructor() {
    // Using public APIs for web deployment
    this.baseUrl = 'https://search.foldseek.com/api';
    this.mmseqsUrl = 'https://search.mmseqs.com/api';
  }

  async searchStructure(pdbData: string): Promise<StructureSearchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: pdbData,
          database: 'afdb50', // Can be configured based on needs
        }),
      });

      if (!response.ok) {
        throw new Error(`Structure search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.formatSearchResults(data);
    } catch (error) {
      console.error('Structure search error:', error);
      throw error;
    }
  }

  async clusterSequences(sequences: string[]): Promise<any> {
    try {
      const response = await fetch(`${this.mmseqsUrl}/cluster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequences,
          mode: 'cluster',
          coverage: 0.8,
          seqIdThr: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sequence clustering failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Sequence clustering error:', error);
      throw error;
    }
  }

  private formatSearchResults(data: any): StructureSearchResult {
    return {
      query_id: data.query_id || 'unknown',
      hits: data.hits.map((hit: any) => ({
        target_id: hit.target_id,
        alignment_score: hit.alignment_score || 0,
        rmsd: hit.rmsd || 0,
        sequence_identity: hit.sequence_identity || 0,
        alignment_length: hit.alignment_length || 0,
      })),
    };
  }
} 