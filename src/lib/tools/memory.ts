import { z } from 'zod';
import { tool } from 'ai';
import { memoryService } from '@/lib/memory/weaviate-memory';
import type { ValyuSearchResult } from './valyu_search';

// Search stored memory (hybrid: semantic + keyword)
export const memorySearchTool = tool({
  description:
    'Search previously stored results in Weaviate memory using hybrid (semantic + keyword) matching.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Search query to run against memory.'),
    limit: z.number().int().min(1).max(50).optional().default(10),
    threshold: z.number().min(0).max(1).optional().default(0.7),
    includeKeyword: z.boolean().optional().default(true),
    timeWindow: z.number().int().min(1).optional().describe('Hours to look back.'),
  }),
  execute: async ({ query, limit, threshold, includeKeyword, timeWindow }) => {
    try {
      const results = await memoryService.hybridSearch(query, {
        limit,
        threshold,
        includeKeyword,
        timeWindow,
      });

      return {
        success: true,
        query,
        results,
        count: results.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[memorySearchTool] Error:', message);
      return { success: false, query, results: [], error: message };
    }
  },
});

// Ingest Valyu results into memory with embeddings
export const memoryIngestTool = tool({
  description:
    'Store Valyu search results into Weaviate memory with embeddings for later retrieval.',
  inputSchema: z.object({
    queryContext: z
      .string()
      .min(1)
      .describe('The original query or context associated with these results.'),
    results: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevance_score: z.number(),
          source: z.string(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .min(1),
  }),
  execute: async ({ queryContext, results }) => {
    try {
      const storedIds = await memoryService.storeSearchResults(
        results as ValyuSearchResult[],
        queryContext
      );
      return { success: true, storedCount: storedIds.length, ids: storedIds };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[memoryIngestTool] Error:', message);
      return { success: false, storedCount: 0, ids: [], error: message };
    }
  },
});

// Optional helper to proactively initialize Weaviate even when
// MEMORY_ENABLED is false (auto-ingest off). Safe to call multiple times.
export async function initializeMemory(): Promise<boolean> {
  try {
    await memoryService.initialize();
    return true;
  } catch (e) {
    console.error('[initializeMemory] Failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
