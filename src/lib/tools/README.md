# Valyu AI SDK Tools

This directory contains the complete implementation of Valyu search tools for the Vercel AI SDK.

## 📁 Files Overview

### Core Implementation
- **`valyu_search.ts`** - Main tool implementations with proper TypeScript types
- **`index.ts`** - Central exports and tool set definition

### Examples & Documentation
- **`../examples/valyu-usage.ts`** - Comprehensive usage examples
- **`README.md`** - This documentation file

## 🛠️ Tools Implemented

### 1. `valyuDeepSearchTool`
- **Purpose**: Comprehensive search across academic, web, market, and proprietary data
- **Input Schema**: `{ query: string, searchType: enum }`
- **Search Types**: `"all"`, `"web"`, `"market"`, `"academic"`, `"proprietary"`
- **Use Cases**: Research, market analysis, academic papers

### 2. `valyuWebSearchTool`
- **Purpose**: Dedicated web search for current information
- **Input Schema**: `{ query: string }`
- **Use Cases**: Current events, news, general web content

## ✨ Key Features

### Type Safety
- Full TypeScript support with proper input/output types
- Zod schema validation for all inputs
- Exported types for external use: `ValyuSearchResult`, `ValyuToolResult`

### Error Handling
- Comprehensive error handling for API failures
- Structured error responses with helpful messages
- Graceful handling of missing API keys

### AI SDK Integration
- Follows AI SDK Core best practices
- Supports multi-step tool calling with `stopWhen`
- Compatible with `generateText` and `streamText`
- Proper tool result formatting (returns objects, not JSON strings)

### Performance & Reliability
- Configurable search parameters (max results, price limits, relevance thresholds)
- Logging for debugging and monitoring
- Structured responses for easy parsing

## 🚀 Quick Usage

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { valyuDeepSearchTool, valyuWebSearchTool } from '@/lib/tools';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    valyuDeepSearch: valyuDeepSearchTool,
    valyuWebSearch: valyuWebSearchTool,
  },
  prompt: 'What are the latest AI developments?',
});
```

## 🔧 Configuration

### Environment Variables
```bash
VALYU_API_KEY=your_valyu_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Search Parameters
Both tools use optimized default parameters:
- `maxNumResults: 5` - Balanced between comprehensiveness and performance
- `maxPrice: 50.0` (deep search) / `30.0` (web search) - Cost control
- `relevanceThreshold: 0.5` - Quality filtering

## 📊 Tool Results Structure

```typescript
type ValyuToolResult = {
  success: boolean;
  query: string;
  results: ValyuSearchResult[];
  tx_id?: string;
  error?: string;
};

type ValyuSearchResult = {
  title: string;
  url: string;
  content: string;
  relevance_score: number;
  source: string;
  metadata?: Record<string, any>;
};
```

## 🎯 Best Practices

1. **Choose the right tool**: Use `valyuDeepSearchTool` for comprehensive research, `valyuWebSearchTool` for current web content
2. **Specify search types**: Use appropriate `searchType` for `valyuDeepSearchTool` based on your needs
3. **Handle errors**: Always check `success` field in tool results
4. **Cite sources**: Use the provided URLs for proper attribution
5. **Monitor usage**: Log tool calls for debugging and cost tracking

## 🔍 Advanced Features

### Multi-Step Calling
```typescript
const { text, steps } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    valyuDeepSearch: valyuDeepSearchTool,
    valyuWebSearch: valyuWebSearchTool,
  },
  prompt: 'Complex research query',
  stopWhen: stepCountIs(5),
});
```

### Type-Safe Results
```typescript
import { TypedToolCall, TypedToolResult } from 'ai';

// Types are available from individual tool imports
type ValyuSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
};
```

### Error Recovery
```typescript
onStepFinish({ toolResults }) {
  toolResults.forEach((toolResult) => {
    if ('result' in toolResult && !toolResult.result.success) {
      console.error('Tool error:', toolResult.result.error);
    }
  });
}
```

## 📈 Performance Considerations

- **Caching**: Consider implementing response caching for repeated queries
- **Rate Limiting**: Valyu API has rate limits - implement appropriate backoff
- **Cost Control**: Use `maxPrice` parameter to control API costs
- **Relevance Filtering**: Adjust `relevanceThreshold` based on quality requirements

## 🤝 Contributing

When extending these tools:
1. Maintain type safety with proper TypeScript types
2. Follow the existing error handling patterns
3. Add comprehensive JSDoc comments
4. Update examples and documentation
5. Test with various search scenarios

## 📚 Related Documentation

- [Valyu API Documentation](https://docs.valyu.ai)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai)
- [Main Integration Guide](../../../VALYU_INTEGRATION.md)
- [Usage Examples](../examples/valyu-usage.ts)
