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

  constructor() {
    // Could be local installation or remote API
    this.baseUrl = import.meta.env.VITE_FOLDSEEK_API_URL;
  }

  async searchStructure(pdbData: string): Promise<StructureSearchResult> {
    // Implementation needed
  }

  async clusterSequences(sequences: string[]): Promise<any> {
    // MMseqs2 implementation needed
  }
} 