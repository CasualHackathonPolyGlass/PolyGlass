/**
 * Simplified Memory System using in-memory storage with embeddings
 * This provides the same interface as the Weaviate version but uses local storage
 * Perfect for development and small-scale deployments
 */

import { openai } from '@ai-sdk/openai';
import { embed, embedMany, cosineSimilarity } from 'ai';
import { ValyuSearchResult } from '../tools/valyu_search';

// Types for memory storage
export interface MemorySnippet {
  id: string;
  content: string;
  title: string;
  url: string;
  source: string;
  relevance_score: number;
  timestamp: number;
  query_context: string;
  metadata: Record<string, any>;
  embedding: number[];
}

export interface HybridSearchResult extends MemorySnippet {
  similarity_score: number;
  search_type: 'semantic' | 'keyword' | 'hybrid';
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeKeyword?: boolean;
  timeWindow?: number; // hours
}

export interface EmbeddingOptions {
  dimensions?: number;
  maxRetries?: number;
  maxParallelCalls?: number;
  abortSignal?: AbortSignal;
}

export class SimpleMemoryService {
  private memory: Map<string, MemorySnippet> = new Map();
  private isInitialized = false;
  private embeddingOptions: EmbeddingOptions;

  constructor(options: EmbeddingOptions = {}) {
    this.embeddingOptions = {
      maxRetries: 2,
      maxParallelCalls: 3,
      ...options,
    };
  }

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing Simple Memory Service with configuration:', this.embeddingOptions);
    
    // Test embedding generation to ensure it works
    try {
      await this.generateEmbedding('initialization test');
      console.log('Embedding service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw new Error('Memory service initialization failed');
    }
    
    this.isInitialized = true;
  }

  /**
   * Generate embeddings for text using AI SDK
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddingConfig: any = {
        model: openai.textEmbeddingModel('text-embedding-3-small'),
        value: text,
        maxRetries: this.embeddingOptions.maxRetries,
      };

      // Add optional parameters
      if (this.embeddingOptions.abortSignal) {
        embeddingConfig.abortSignal = this.embeddingOptions.abortSignal;
      }

      if (this.embeddingOptions.dimensions) {
        embeddingConfig.providerOptions = {
          openai: {
            dimensions: this.embeddingOptions.dimensions,
          },
        };
      }

      const { embedding, usage } = await embed(embeddingConfig);
      
      if (usage?.tokens) {
        console.log(`Generated embedding using ${usage.tokens} tokens`);
      }
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts using batch processing
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddingConfig: any = {
        model: openai.textEmbeddingModel('text-embedding-3-small'),
        values: texts,
        maxRetries: this.embeddingOptions.maxRetries,
        maxParallelCalls: this.embeddingOptions.maxParallelCalls,
      };

      // Add optional parameters
      if (this.embeddingOptions.abortSignal) {
        embeddingConfig.abortSignal = this.embeddingOptions.abortSignal;
      }

      if (this.embeddingOptions.dimensions) {
        embeddingConfig.providerOptions = {
          openai: {
            dimensions: this.embeddingOptions.dimensions,
          },
        };
      }

      const { embeddings, usage } = await embedMany(embeddingConfig);
      
      if (usage?.tokens) {
        console.log(`Generated ${embeddings.length} embeddings using ${usage.tokens} tokens`);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors using AI SDK
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }

  /**
   * Simple keyword matching score
   */
  private keywordScore(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const queryWord of queryWords) {
      if (textWords.some(textWord => textWord.includes(queryWord) || queryWord.includes(textWord))) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  /**
   * Store Valyu search results in memory with embeddings
   */
  async storeSearchResults(
    results: ValyuSearchResult[],
    queryContext: string
  ): Promise<string[]> {
    await this.initialize();

    const storedIds: string[] = [];
    const timestamp = Date.now();

    try {
      // Batch generate embeddings for better performance
      const texts = results.map(result => `${result.title} ${result.content}`);
      const embeddings = await this.generateEmbeddings(texts);

      // Store all results with their embeddings
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const embedding = embeddings[i];

        if (embedding) {
          const snippet: MemorySnippet = {
            id: `simple_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            content: result.content,
            title: result.title,
            url: result.url,
            source: result.source,
            relevance_score: result.relevance_score,
            timestamp,
            query_context: queryContext,
            metadata: result.metadata || {},
            embedding,
          };

          // Store in memory
          this.memory.set(snippet.id, snippet);
          storedIds.push(snippet.id);
        }
      }

      console.log(`Stored ${storedIds.length} memory snippets using batch embedding`);
    } catch (error) {
      console.error('Failed to store results with batch embedding:', error);
      
      // Fallback to individual embedding generation
      console.log('Falling back to individual embedding generation...');
      for (const result of results) {
        try {
          const embedding = await this.generateEmbedding(
            `${result.title} ${result.content}`
          );

          const snippet: MemorySnippet = {
            id: `simple_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            content: result.content,
            title: result.title,
            url: result.url,
            source: result.source,
            relevance_score: result.relevance_score,
            timestamp,
            query_context: queryContext,
            metadata: result.metadata || {},
            embedding,
          };

          this.memory.set(snippet.id, snippet);
          storedIds.push(snippet.id);
        } catch (error) {
          console.error(`Failed to store result: ${result.title}`, error);
        }
      }
    }

    return storedIds;
  }

  /**
   * Filter results by time window
   */
  private filterByTimeWindow(snippets: MemorySnippet[], timeWindow?: number): MemorySnippet[] {
    if (!timeWindow) return snippets;
    
    const cutoffTime = Date.now() - (timeWindow * 60 * 60 * 1000);
    return snippets.filter(snippet => snippet.timestamp >= cutoffTime);
  }

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      threshold = 0.7,
      timeWindow,
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all snippets and filter by time if needed
      let snippets = Array.from(this.memory.values());
      snippets = this.filterByTimeWindow(snippets, timeWindow);

      // Calculate similarities and filter
      const results: HybridSearchResult[] = snippets
        .map(snippet => {
          const similarity = this.calculateSimilarity(queryEmbedding, snippet.embedding);
          return {
            ...snippet,
            similarity_score: similarity,
            search_type: 'semantic' as const,
          };
        })
        .filter(result => result.similarity_score >= threshold)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Perform keyword search using simple text matching
   */
  async keywordSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      timeWindow,
    } = options;

    try {
      // Get all snippets and filter by time if needed
      let snippets = Array.from(this.memory.values());
      snippets = this.filterByTimeWindow(snippets, timeWindow);

      // Calculate keyword scores
      const results: HybridSearchResult[] = snippets
        .map(snippet => {
          const contentScore = this.keywordScore(query, snippet.content);
          const titleScore = this.keywordScore(query, snippet.title);
          const contextScore = this.keywordScore(query, snippet.query_context);
          
          // Weighted average (title and content are more important)
          const similarity_score = (contentScore * 0.5 + titleScore * 0.3 + contextScore * 0.2);
          
          return {
            ...snippet,
            similarity_score,
            search_type: 'keyword' as const,
          };
        })
        .filter(result => result.similarity_score > 0)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      limit = 10,
      includeKeyword = true,
    } = options;

    try {
      // Perform both searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, { ...options, limit: Math.ceil(limit * 0.7) }),
        includeKeyword 
          ? this.keywordSearch(query, { ...options, limit: Math.ceil(limit * 0.5) })
          : Promise.resolve([]),
      ]);

      // Combine and deduplicate results
      const combinedResults = new Map<string, HybridSearchResult>();

      // Add semantic results
      semanticResults.forEach(result => {
        combinedResults.set(result.id, {
          ...result,
          search_type: 'hybrid' as const,
        });
      });

      // Add keyword results (merge if already exists)
      keywordResults.forEach(result => {
        const existing = combinedResults.get(result.id);
        if (existing) {
          // Boost score for items found in both searches
          existing.similarity_score = Math.max(existing.similarity_score, result.similarity_score) * 1.2;
        } else {
          combinedResults.set(result.id, {
            ...result,
            search_type: 'hybrid' as const,
          });
        }
      });

      // Sort by similarity score and limit results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Clean up old memory entries
   */
  async cleanup(maxAgeHours: number = 24): Promise<number> {
    await this.initialize();

    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const [id, snippet] of this.memory.entries()) {
        if (snippet.timestamp < cutoffTime) {
          this.memory.delete(id);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} old memory entries`);
      return deletedCount;
    } catch (error) {
      console.error('Memory cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    entriesLast24h: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    await this.initialize();

    try {
      const snippets = Array.from(this.memory.values());
      const totalEntries = snippets.length;

      if (totalEntries === 0) {
        return {
          totalEntries: 0,
          entriesLast24h: 0,
          oldestEntry: null,
          newestEntry: null,
        };
      }

      const last24h = Date.now() - (24 * 60 * 60 * 1000);
      const entriesLast24h = snippets.filter(s => s.timestamp >= last24h).length;

      const timestamps = snippets.map(s => s.timestamp);
      const oldestEntry = Math.min(...timestamps);
      const newestEntry = Math.max(...timestamps);

      return {
        totalEntries,
        entriesLast24h,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        totalEntries: 0,
        entriesLast24h: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Clear all memory (useful for testing)
   */
  async clear(): Promise<void> {
    this.memory.clear();
    console.log('Memory cleared');
  }

  /**
   * Get memory size in MB (approximate)
   */
  getMemorySize(): number {
    const jsonString = JSON.stringify(Array.from(this.memory.values()));
    return Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
  }

  /**
   * Get embedding configuration
   */
  getEmbeddingConfig(): EmbeddingOptions {
    return { ...this.embeddingOptions };
  }

  /**
   * Update embedding configuration
   */
  updateEmbeddingConfig(options: Partial<EmbeddingOptions>): void {
    this.embeddingOptions = { ...this.embeddingOptions, ...options };
    console.log('Updated embedding configuration:', this.embeddingOptions);
  }

  /**
   * Benchmark embedding performance
   */
  async benchmarkEmbedding(testTexts: string[] = [
    'This is a test sentence for benchmarking.',
    'Another test sentence with different content.',
    'A third sentence to complete the benchmark test.',
  ]): Promise<{
    singleEmbeddingTime: number;
    batchEmbeddingTime: number;
    tokensUsed: number;
    averageTimePerEmbedding: number;
  }> {
    console.log('Starting embedding benchmark...');
    
    // Test single embedding
    const singleStart = Date.now();
    await this.generateEmbedding(testTexts[0]);
    const singleEmbeddingTime = Date.now() - singleStart;
    
    // Test batch embedding
    const batchStart = Date.now();
    const { embeddings } = await embedMany({
      model: openai.textEmbeddingModel('text-embedding-3-small'),
      values: testTexts,
      maxRetries: this.embeddingOptions.maxRetries,
      maxParallelCalls: this.embeddingOptions.maxParallelCalls,
    });
    const batchEmbeddingTime = Date.now() - batchStart;
    
    const tokensUsed = testTexts.reduce((sum, text) => sum + text.split(' ').length, 0);
    const averageTimePerEmbedding = batchEmbeddingTime / testTexts.length;
    
    const results = {
      singleEmbeddingTime,
      batchEmbeddingTime,
      tokensUsed,
      averageTimePerEmbedding,
    };
    
    console.log('Benchmark results:', results);
    return results;
  }
}

// Singleton instance with default configuration
export const memoryService = new SimpleMemoryService();

// Factory function for custom configurations
export function createMemoryService(options: EmbeddingOptions = {}): SimpleMemoryService {
  return new SimpleMemoryService(options);
}

// Predefined configurations for different use cases
export const memoryConfigurations = {
  // Fast and cost-effective for development
  development: {
    maxParallelCalls: 2,
    maxRetries: 1,
  },
  
  // Balanced for production
  production: {
    maxParallelCalls: 5,
    maxRetries: 3,
  },
  
  // High quality for critical applications
  highQuality: {
    maxParallelCalls: 3,
    maxRetries: 3,
  },
  
  // Reduced dimensions for faster processing
  fastProcessing: {
    dimensions: 512,
    maxParallelCalls: 8,
    maxRetries: 2,
  },
} as const;
