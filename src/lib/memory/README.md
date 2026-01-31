# Valyu Memory System with Weaviate

This directory contains the intelligent memory storage system that enables semantic search and retrieval of previously fetched Valyu search results using Weaviate vector database and OpenAI embeddings.

## 🧠 Overview

The memory system provides:
- **Semantic Storage**: Automatically stores Valyu search results with OpenAI embeddings
- **Hybrid Search**: Combines semantic similarity and keyword matching
- **Intelligent Caching**: Reduces API calls by reusing relevant previous results
- **Time-based Filtering**: Search within specific time windows
- **Automatic Cleanup**: Removes old entries to manage storage

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Valyu API     │    │   Memory System  │    │   Weaviate DB   │
│                 │    │                  │    │                 │
│ Fresh Results   │───▶│ Store + Embed    │───▶│ Vector Storage  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Query    │───▶│ Hybrid Search    │◀───│ Semantic +      │
│                 │    │                  │    │ Keyword Search  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Files

- **`weaviate-memory.ts`** - Core memory service implementation
- **`README.md`** - This documentation
 - Tools: import `memorySearchTool` and `memoryIngestTool` from `src/lib/tools/memory.ts`

## 🚀 Quick Start

### 1. Setup Weaviate

#### Option A: Local Development (Docker)
```bash
# Start Weaviate locally
docker run -d \
  --name weaviate \
  -p 8080:8080 \
  -e QUERY_DEFAULTS_LIMIT=25 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  -e PERSISTENCE_DATA_PATH='/var/lib/weaviate' \
  -e DEFAULT_VECTORIZER_MODULE='none' \
  -e CLUSTER_HOSTNAME='node1' \
  semitechnologies/weaviate:1.22.4
```

#### Option B: Weaviate Cloud Services (WCS)
1. Sign up at [Weaviate Cloud](https://console.weaviate.cloud/)
2. Create a cluster
3. Get your cluster URL and API key

### 2. Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
VALYU_API_KEY=your_valyu_api_key

# Weaviate Configuration
WEAVIATE_URL=http://localhost:8080  # or your WCS URL
WEAVIATE_API_KEY=your_weaviate_key  # only for WCS

# Optional: auto-ingest Valyu results into memory
MEMORY_ENABLED=true
```

### 3. Basic Usage

```typescript
import { memoryService } from '@/lib/memory/weaviate-memory';

// Initialize (happens automatically)
await memoryService.initialize();

// Store search results
const results = [/* Valyu search results */];
await memoryService.storeSearchResults(results, "AI in healthcare");

// Search memory
const memoryResults = await memoryService.hybridSearch("machine learning healthcare", {
  limit: 10,
  threshold: 0.75,
  timeWindow: 24, // last 24 hours
});
```

## 🛠️ Core Components

### WeaviateMemoryService

The main service class that handles all memory operations.

#### Key Methods

##### `storeSearchResults(results, queryContext)`
Stores Valyu search results with embeddings.
- Generates embeddings using OpenAI `text-embedding-3-small`
- Stores in Weaviate with metadata
- Returns array of stored IDs

##### `semanticSearch(query, options)`
Performs vector similarity search.
- Uses OpenAI embeddings for query
- Configurable similarity threshold
- Time window filtering

##### `keywordSearch(query, options)`
Performs BM25 keyword search.
- Searches content, title, and query context
- Good for exact term matching
- Complements semantic search

##### `hybridSearch(query, options)`
Combines semantic and keyword search.
- Runs both searches in parallel
- Deduplicates and ranks results
- Boosts items found in both searches

##### `cleanup(maxAgeHours)`
Removes old memory entries.
- Configurable age threshold
- Returns count of deleted entries
- Helps manage storage costs

##### `getStats()`
Returns memory system statistics.
- Total entries
- Recent activity
- Timestamp ranges
- System health info

## 🔧 Configuration Options

### SearchOptions Interface
```typescript
interface SearchOptions {
  limit?: number;        // Max results (default: 10)
  threshold?: number;    // Similarity threshold 0-1 (default: 0.7)
  includeKeyword?: boolean; // Include keyword search (default: true)
  timeWindow?: number;   // Hours to search back (default: unlimited)
}
```

### Memory Snippet Structure
```typescript
interface MemorySnippet {
  id: string;              // Unique identifier
  content: string;         // Main text content
  title: string;           // Document title
  url: string;             // Source URL
  source: string;          // Source identifier
  relevance_score: number; // Original Valyu score
  timestamp: number;       // Storage time (Unix)
  query_context: string;   // Original search query
  metadata: object;        // Additional metadata
  embedding?: number[];    // OpenAI embedding vector
}
```

## 🎯 Search Strategies

### 1. Memory-First Strategy
```typescript
// Check memory first, fallback to API
const results = await valyuDeepSearchWithMemoryTool.execute({
  query: "AI developments",
  useMemory: true,
  memoryThreshold: 0.75,
  forceRefresh: false,
});
```

### 2. Fresh Data Strategy
```typescript
// Always get fresh data, store in memory
const results = await valyuDeepSearchWithMemoryTool.execute({
  query: "latest news",
  forceRefresh: true,
  useMemory: true, // Still store results
});
```

### 3. Memory-Only Strategy
```typescript
// Search only stored results
const results = await memorySearchTool.execute({
  query: "previous research",
  searchType: "hybrid",
  timeWindow: 48, // last 48 hours
});
```

## 📊 Performance Considerations

### Embedding Costs
- OpenAI `text-embedding-3-small`: ~$0.00002 per 1K tokens
- Average snippet: ~200 tokens = $0.000004 per snippet
- 1000 snippets ≈ $0.004 in embedding costs

### Search Performance
- **Semantic Search**: ~50-200ms (depends on collection size)
- **Keyword Search**: ~10-50ms (faster than semantic)
- **Hybrid Search**: ~100-300ms (runs both in parallel)

### Storage Optimization
- Automatic cleanup of old entries
- Configurable retention periods
- Deduplication by URL
- Compressed vector storage in Weaviate

## 🔍 Advanced Features

### Time-based Filtering
```typescript
// Search only recent results
const recentResults = await memoryService.hybridSearch(query, {
  timeWindow: 6, // last 6 hours only
});
```

### Threshold Tuning
```typescript
// High precision (fewer, more relevant results)
const preciseResults = await memoryService.semanticSearch(query, {
  threshold: 0.85, // very similar only
});

// High recall (more results, potentially less relevant)
const broadResults = await memoryService.semanticSearch(query, {
  threshold: 0.6, // more permissive
});
```

### Custom Metadata Filtering
The system stores rich metadata that can be used for filtering:
- `from_memory`: Boolean indicating memory vs fresh results
- `original_query`: The query that originally retrieved this result
- `stored_at`: ISO timestamp when stored
- `search_type`: Type of search performed

## 🚨 Error Handling

The memory system includes comprehensive error handling:

### Graceful Degradation
- If Weaviate is unavailable, falls back to API-only mode
- If embeddings fail, stores without vectors (keyword search only)
- If memory search fails, continues with fresh API calls

### Error Recovery
```typescript
try {
  const results = await memoryService.hybridSearch(query);
} catch (error) {
  console.error('Memory search failed:', error);
  // Fallback to direct API call
  const freshResults = await valyuApi.search(query);
}
```

## 🧪 Testing & Development

### Health Check
```typescript
// Test system health
const health = await memoryManagementTool.execute({
  action: "health"
});
```

### Statistics Monitoring
```typescript
// Get usage statistics
const stats = await memoryManagementTool.execute({
  action: "stats"
});
```

### Manual Cleanup
```typescript
// Clean up old entries
const cleanup = await memoryManagementTool.execute({
  action: "cleanup",
  maxAgeHours: 48, // keep last 48 hours
});
```

## 🔒 Security Considerations

### API Keys
- Store Weaviate and OpenAI keys securely
- Use environment variables, never hardcode
- Rotate keys regularly

### Data Privacy
- Memory stores search results temporarily
- Consider data retention policies
- Implement cleanup schedules
- Be aware of sensitive information in search results

### Access Control
- Weaviate supports authentication and authorization
- Consider multi-tenancy for production deployments
- Monitor access patterns

## 📈 Scaling Considerations

### Horizontal Scaling
- Weaviate supports clustering for high availability
- Consider read replicas for heavy search workloads
- Use load balancing for multiple application instances

### Vertical Scaling
- More RAM improves vector search performance
- SSD storage recommended for better I/O
- CPU cores help with embedding generation

### Cost Optimization
- Regular cleanup reduces storage costs
- Batch embedding generation is more efficient
- Consider embedding model trade-offs (speed vs accuracy)

## 🤝 Integration Examples

### With AI SDK Tools
```typescript
import { valyuDeepSearchTool, valyuWebSearchTool } from '@/lib/tools';

const result = await generateText({
  model: openai('gpt-4'),
  tools: {
    valyuDeepSearch: valyuDeepSearchTool,
    valyuWebSearch: valyuWebSearchTool,
  },
  prompt: 'Research AI in healthcare',
});
```

### Direct Memory Usage
```typescript
import { memoryService } from '@/lib/memory/weaviate-memory';

// Store custom results
await memoryService.storeSearchResults(customResults, "custom query");

// Search with specific parameters
const results = await memoryService.hybridSearch("query", {
  limit: 5,
  threshold: 0.8,
  timeWindow: 12,
});
```

### Using Tools with AI SDK
```typescript
import { memorySearchTool, memoryIngestTool } from '@/lib/tools/memory';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: { memorySearch: memorySearchTool, memoryIngest: memoryIngestTool },
  prompt: 'Find prior context about AI in healthcare',
});
```

## 📚 Related Documentation

- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Valyu API Documentation](https://docs.valyu.ai)
- [AI SDK Core Documentation](https://sdk.vercel.ai/docs)
