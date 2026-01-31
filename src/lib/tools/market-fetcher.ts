/**
 * Unified Market Data Fetcher
 * Abstracts market data fetching across different prediction market platforms
 */

import { buildLLMPayloadFromSlug } from './polymarket';
import { buildLLMPayloadFromKalshiTicker } from './kalshi';
import { parseMarketUrl, MarketPlatform } from './market-url-parser';

// Re-export common types (these are identical across both implementations)
export type { MarketPlatform };

export interface MarketFetchOptions {
  historyInterval?: string;
  withBooks?: boolean;
  withTrades?: boolean;
  maxCandidates?: number;
}

export interface MarketSummary {
  question: string;
  close_time?: string | number;
  resolution_source?: string;
  volume?: number;
  liquidity?: number;
  token_map: { [outcome: string]: string };
  ticker?: string;
  event_ticker?: string;
  category?: string;
  rules?: string;
  condition_id?: string; // Polymarket-specific
}

export interface MarketStateNowEntry {
  token_id: string;
  outcome?: string;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  top_bid_size?: number | null;
  top_ask_size?: number | null;
}

export interface MarketPayload {
  platform: MarketPlatform;
  market_facts: MarketSummary;
  market_state_now: MarketStateNowEntry[];
  history: { token_id: string; points: { t: number; p: number }[] }[];
  order_books?: any[];
  recent_trades?: any[];
  event_summary?: {
    is_multi_candidate: boolean;
    total_markets: number;
    active_markets: number;
    top_candidates: Array<{
      name: string;
      question: string;
      implied_probability: number;
      volume: number;
      liquidity: number;
      active: boolean;
      market: any;
    }>;
  };
}

/**
 * Fetch market data from any supported platform using URL
 * This is the main entry point for getting market data
 */
export async function fetchMarketDataFromUrl(
  url: string,
  options: MarketFetchOptions = {}
): Promise<MarketPayload> {
  // Parse the URL to determine platform and identifier
  const parsed = parseMarketUrl(url);

  if (!parsed.valid) {
    throw new Error(parsed.error || 'Invalid market URL');
  }

  console.log(`📊 Fetching ${parsed.platform} market data for: ${parsed.identifier}`);

  // Fetch data based on platform
  if (parsed.platform === 'polymarket') {
    const data = await buildLLMPayloadFromSlug(parsed.identifier, options);
    return {
      platform: 'polymarket',
      ...data,
    };
  }

  if (parsed.platform === 'kalshi') {
    const data = await buildLLMPayloadFromKalshiTicker(parsed.identifier, options);
    return {
      platform: 'kalshi',
      ...data,
    };
  }

  throw new Error(`Unsupported platform: ${parsed.platform}`);
}

/**
 * Fetch market data using direct identifier (bypasses URL parsing)
 * Useful when you already know the platform and identifier
 */
export async function fetchMarketDataByIdentifier(
  platform: MarketPlatform,
  identifier: string,
  options: MarketFetchOptions = {}
): Promise<MarketPayload> {
  console.log(`📊 Fetching ${platform} market data for: ${identifier}`);

  if (platform === 'polymarket') {
    const data = await buildLLMPayloadFromSlug(identifier, options);
    return {
      platform: 'polymarket',
      ...data,
    };
  }

  if (platform === 'kalshi') {
    const data = await buildLLMPayloadFromKalshiTicker(identifier, options);
    return {
      platform: 'kalshi',
      ...data,
    };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Get platform-specific market URL
 */
export function buildMarketUrl(platform: MarketPlatform, identifier: string): string {
  if (platform === 'polymarket') {
    return `https://polymarket.com/event/${identifier}`;
  }

  if (platform === 'kalshi') {
    // For Kalshi, we can't reconstruct the full URL without the series and category
    // Just return the ticker page format
    return `https://kalshi.com/markets/${identifier.toLowerCase()}`;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}