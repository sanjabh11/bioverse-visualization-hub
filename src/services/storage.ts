import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { GEODataset } from './ncbiApi';
import type { ProteinAnalysis } from './deepseek';

interface ProteinDB extends DBSchema {
  'geo-cache': {
    key: string;
    value: {
      data: GEODataset;
      timestamp: number;
      expiry: number;
    };
  };
  'protein-analysis': {
    key: string;
    value: {
      data: ProteinAnalysis;
      timestamp: number;
      expiry: number;
    };
  };
}

class StorageService {
  private db: IDBPDatabase<ProteinDB> | null = null;
  private readonly DB_NAME = 'protein-analysis-db';
  private readonly DB_VERSION = 1;
  private readonly CACHE_TTL = Number(import.meta.env.VITE_API_CACHE_TTL) || 3600000; // 1 hour default

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<ProteinDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('geo-cache')) {
          db.createObjectStore('geo-cache');
        }
        if (!db.objectStoreNames.contains('protein-analysis')) {
          db.createObjectStore('protein-analysis');
        }
      },
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  async setGeoCache(key: string, data: GEODataset): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();
    await this.db.put('geo-cache', {
      data,
      timestamp,
      expiry: timestamp + this.CACHE_TTL,
    }, key);
  }

  async getGeoCache(key: string): Promise<GEODataset | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const cached = await this.db.get('geo-cache', key);
    if (!cached || cached.expiry < Date.now()) {
      // Remove expired cache
      if (cached) {
        await this.db.delete('geo-cache', key);
      }
      return null;
    }

    return cached.data;
  }

  async setProteinAnalysis(key: string, data: ProteinAnalysis): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();
    await this.db.put('protein-analysis', {
      data,
      timestamp,
      expiry: timestamp + this.CACHE_TTL,
    }, key);
  }

  async getProteinAnalysis(key: string): Promise<ProteinAnalysis | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const cached = await this.db.get('protein-analysis', key);
    if (!cached || cached.expiry < Date.now()) {
      if (cached) {
        await this.db.delete('protein-analysis', key);
      }
      return null;
    }

    return cached.data;
  }

  async clearExpiredCache(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    // Clear expired GEO cache
    const geoCursor = await this.db.transaction('geo-cache').store.openCursor();
    while (geoCursor) {
      if (geoCursor.value.expiry < now) {
        await this.db.delete('geo-cache', geoCursor.key);
      }
      await geoCursor.continue();
    }

    // Clear expired protein analysis cache
    const proteinCursor = await this.db.transaction('protein-analysis').store.openCursor();
    while (proteinCursor) {
      if (proteinCursor.value.expiry < now) {
        await this.db.delete('protein-analysis', proteinCursor.key);
      }
      await proteinCursor.continue();
    }
  }
}

export const storage = new StorageService(); 