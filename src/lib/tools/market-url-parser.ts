/**
 * Market URL Parser
 * Detects and parses market URLs from different prediction market platforms
 */

export type MarketPlatform = 'polymarket' | 'kalshi';

export interface ParsedMarketUrl {
  platform: MarketPlatform;
  identifier: string; // Polymarket slug or Kalshi ticker
  url: string;
  valid: boolean;
  error?: string;
}

/**
 * Polymarket URL patterns:
 * - https://polymarket.com/event/{slug}
 * - https://polymarket.com/markets/{slug} (legacy)
 */
const POLYMARKET_PATTERNS = [
  /^https?:\/\/(?:www\.)?polymarket\.com\/event\/([a-z0-9-]+)/i,
  /^https?:\/\/(?:www\.)?polymarket\.com\/markets\/([a-z0-9-]+)/i,
];

/**
 * Kalshi URL patterns:
 * - https://kalshi.com/markets/{series_ticker}/{category}/{market_ticker}
 * - https://kalshi.com/markets/{series_ticker}
 *
 * Examples:
 * - https://kalshi.com/markets/kxtime/times-person-of-the-year/KXTIME-25
 * - https://kalshi.com/markets/kxgovshut/government-shutdown/kxgovshut-25oct01
 * - https://kalshi.com/markets/kxfeddecision/fed-meeting
 */
const KALSHI_PATTERNS = [
  // Full path with market ticker
  /^https?:\/\/(?:www\.)?kalshi\.com\/markets\/[a-z0-9-]+\/[a-z0-9-]+\/([A-Z0-9-]+)/i,
  // Series + category only (no specific market ticker - we'll need to fetch latest)
  /^https?:\/\/(?:www\.)?kalshi\.com\/markets\/([a-z0-9-]+)(?:\/[a-z0-9-]+)?/i,
];

/**
 * Parse a Polymarket URL and extract the slug
 */
function parsePolymarketUrl(url: string): ParsedMarketUrl {
  for (const pattern of POLYMARKET_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        platform: 'polymarket',
        identifier: match[1],
        url,
        valid: true,
      };
    }
  }

  return {
    platform: 'polymarket',
    identifier: '',
    url,
    valid: false,
    error: 'Invalid Polymarket URL format. Expected: https://polymarket.com/event/{slug}',
  };
}

/**
 * Parse a Kalshi URL and extract the market ticker
 *
 * Kalshi tickers are always uppercase alphanumeric with hyphens
 * Examples: KXTIME-25, KXGOVSHUT-25oct01, KXHIGHDEN-25OCT01-T83
 */
function parseKalshiUrl(url: string): ParsedMarketUrl {
  // Try full path pattern first (most specific)
  const fullPathMatch = url.match(KALSHI_PATTERNS[0]);
  if (fullPathMatch && fullPathMatch[1]) {
    const ticker = fullPathMatch[1].toUpperCase();
    return {
      platform: 'kalshi',
      identifier: ticker,
      url,
      valid: true,
    };
  }

  // Try series pattern (less specific - may require additional API call)
  const seriesMatch = url.match(KALSHI_PATTERNS[1]);
  if (seriesMatch && seriesMatch[1]) {
    const seriesTicker = seriesMatch[1].toUpperCase();
    return {
      platform: 'kalshi',
      identifier: seriesTicker,
      url,
      valid: true,
      error: 'Series URL provided - system will attempt to find the most relevant market',
    };
  }

  return {
    platform: 'kalshi',
    identifier: '',
    url,
    valid: false,
    error: 'Invalid Kalshi URL format. Expected: https://kalshi.com/markets/{series}/{category}/{ticker}',
  };
}

/**
 * Detect the platform from a URL
 */
export function detectPlatform(url: string): MarketPlatform | null {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes('polymarket.com')) {
    return 'polymarket';
  }

  if (normalizedUrl.includes('kalshi.com')) {
    return 'kalshi';
  }

  return null;
}

/**
 * Parse a market URL from any supported platform
 */
export function parseMarketUrl(url: string): ParsedMarketUrl {
  if (!url || typeof url !== 'string') {
    return {
      platform: 'polymarket',
      identifier: '',
      url: '',
      valid: false,
      error: 'URL must be a non-empty string',
    };
  }

  const platform = detectPlatform(url);

  if (!platform) {
    return {
      platform: 'polymarket',
      identifier: '',
      url,
      valid: false,
      error: 'Unsupported platform. Only Polymarket and Kalshi URLs are supported.',
    };
  }

  if (platform === 'polymarket') {
    return parsePolymarketUrl(url);
  }

  if (platform === 'kalshi') {
    return parseKalshiUrl(url);
  }

  return {
    platform: 'polymarket',
    identifier: '',
    url,
    valid: false,
    error: 'Unknown error parsing market URL',
  };
}

/**
 * Validate a market URL (convenience function)
 */
export function isValidMarketUrl(url: string): boolean {
  const parsed = parseMarketUrl(url);
  return parsed.valid;
}

/**
 * Extract identifier from URL (slug for Polymarket, ticker for Kalshi)
 */
export function extractIdentifier(url: string): string | null {
  const parsed = parseMarketUrl(url);
  return parsed.valid ? parsed.identifier : null;
}

/**
 * Get user-friendly platform name
 */
export function getPlatformName(platform: MarketPlatform): string {
  const names: Record<MarketPlatform, string> = {
    polymarket: 'Polymarket',
    kalshi: 'Kalshi',
  };
  return names[platform];
}