import { openDB, IDBPDatabase } from 'idb';

interface StoredStructure {
  id: string;
  data: string;
  timestamp: number;
  metadata?: {
    title?: string;
    source?: string;
    pLDDT?: number[];
    pae?: number[][];
  };
}

interface StoredSearchResult {
  query: string;
  results: any;
  timestamp: number;
}

class StorageService {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'bioverse-hub';
  private readonly DB_VERSION = 1;
  private readonly STRUCTURE_STORE = 'structures';
  private readonly SEARCH_STORE = 'search-results';
  private readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  async initialize() {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('structures')) {
            db.createObjectStore('structures', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('search-results')) {
            db.createObjectStore('search-results', { keyPath: 'query' });
          }
        },
      });
      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  async storeStructure(id: string, data: string, metadata?: StoredStructure['metadata']) {
    if (!this.db) await this.initialize();

    const structure: StoredStructure = {
      id,
      data,
      timestamp: Date.now(),
      metadata,
    };

    try {
      await this.db!.put(this.STRUCTURE_STORE, structure);
      console.log(`Structure ${id} stored successfully`);
    } catch (error) {
      console.error(`Failed to store structure ${id}:`, error);
      throw error;
    }
  }

  async getStructure(id: string): Promise<StoredStructure | null> {
    if (!this.db) await this.initialize();

    try {
      const structure = await this.db!.get(this.STRUCTURE_STORE, id);
      if (!structure) return null;

      // Check if structure is too old
      if (Date.now() - structure.timestamp > this.MAX_AGE) {
        await this.deleteStructure(id);
        return null;
      }

      return structure;
    } catch (error) {
      console.error(`Failed to retrieve structure ${id}:`, error);
      return null;
    }
  }

  async storeSearchResult(query: string, results: any) {
    if (!this.db) await this.initialize();

    const searchResult: StoredSearchResult = {
      query,
      results,
      timestamp: Date.now(),
    };

    try {
      await this.db!.put(this.SEARCH_STORE, searchResult);
      console.log(`Search results for "${query}" stored successfully`);
    } catch (error) {
      console.error(`Failed to store search results for "${query}":`, error);
      throw error;
    }
  }

  async getSearchResult(query: string): Promise<any | null> {
    if (!this.db) await this.initialize();

    try {
      const result = await this.db!.get(this.SEARCH_STORE, query);
      if (!result) return null;

      // Check if result is too old
      if (Date.now() - result.timestamp > this.MAX_AGE) {
        await this.deleteSearchResult(query);
        return null;
      }

      return result.results;
    } catch (error) {
      console.error(`Failed to retrieve search results for "${query}":`, error);
      return null;
    }
  }

  async deleteStructure(id: string) {
    if (!this.db) await this.initialize();

    try {
      await this.db!.delete(this.STRUCTURE_STORE, id);
      console.log(`Structure ${id} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete structure ${id}:`, error);
      throw error;
    }
  }

  async deleteSearchResult(query: string) {
    if (!this.db) await this.initialize();

    try {
      await this.db!.delete(this.SEARCH_STORE, query);
      console.log(`Search results for "${query}" deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete search results for "${query}":`, error);
      throw error;
    }
  }

  async clearOldData() {
    if (!this.db) await this.initialize();

    const now = Date.now();

    try {
      // Clear old structures
      const structureCursor = await this.db!.transaction(this.STRUCTURE_STORE).store.openCursor();
      while (structureCursor) {
        if (now - structureCursor.value.timestamp > this.MAX_AGE) {
          await this.deleteStructure(structureCursor.value.id);
        }
        await structureCursor.continue();
      }

      // Clear old search results
      const searchCursor = await this.db!.transaction(this.SEARCH_STORE).store.openCursor();
      while (searchCursor) {
        if (now - searchCursor.value.timestamp > this.MAX_AGE) {
          await this.deleteSearchResult(searchCursor.value.query);
        }
        await searchCursor.continue();
      }

      console.log('Old data cleared successfully');
    } catch (error) {
      console.error('Failed to clear old data:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService(); 