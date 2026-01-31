/**
 * 模块A：TokenMap 构建
 * 将 Gamma 市场数据转换为 Market[]、Event[]、MarketEvent[] 和 TokenMap
 *
 * 关键映射：
 *   clobTokenIds[0] = NO token
 *   clobTokenIds[1] = YES token
 */
import { createLogger } from "@/lib/logger";
import type {
  GammaMarketResponse,
  Market,
  Event,
  MarketEvent,
  TokenMap,
  MarketData,
} from "@/types/market";

const logger = createLogger("tokenMap");

// 从共享模块导入（客户端/服务端通用）
export { normalizeCategory } from "@/lib/category";
import { normalizeCategory } from "@/lib/category";

/** 从 slug 推断分类 */
const SLUG_CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/^nba-/, "Sports"],
  [/^nfl-/, "Sports"],
  [/^mlb-/, "Sports"],
  [/^nhl-/, "Sports"],
  [/^soccer-/, "Sports"],
  [/^tennis-/, "Sports"],
  [/^mma-/, "Sports"],
  [/^boxing-/, "Sports"],
  [/^esports-/, "Sports"],
  [/bitcoin|btc|ethereum|eth|crypto|solana|sol/, "Crypto"],
  [/trump|biden|election|congress|senate|president/, "Politics"],
  [/fed-|interest-rate|inflation/, "Economy"],
];

/**
 * 从 slug 推断分类
 */
function inferCategoryFromSlug(slug: string): string | null {
  const lower = slug.toLowerCase();
  for (const [pattern, category] of SLUG_CATEGORY_PATTERNS) {
    if (pattern.test(lower)) {
      return category;
    }
  }
  return null;
}

/**
 * 从 Gamma 市场数据提取标签
 * 优先级: market.category > events[0].category > slug 推断 > "General"
 */
function extractTags(market: GammaMarketResponse): string[] {
  // 1. 直接从 market.category 获取
  if (market.category) {
    return [normalizeCategory(market.category)];
  }

  // 2. 从 events[0].category 获取
  const eventCategory = market.events?.[0]?.category;
  if (eventCategory) {
    return [normalizeCategory(eventCategory)];
  }

  // 3. 从 slug 推断
  const inferredCategory = inferCategoryFromSlug(market.slug);
  if (inferredCategory) {
    return [inferredCategory];
  }

  // 4. 默认
  return ["General"];
}

/**
 * 解析 clobTokenIds（可能是字符串或数组）
 */
function parseClobTokenIds(raw: string | string[] | undefined): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  // Gamma API 返回 JSON 字符串格式
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed;
    }
  } catch {
    // 解析失败
  }
  return null;
}

/**
 * 解析 outcomePrices（可能是字符串或数组）
 * 返回 [yesPrice, noPrice]
 */
function parseOutcomePrices(raw: string | string[] | undefined): [number, number] {
  if (!raw) return [0.5, 0.5];
  let prices: string[];
  if (Array.isArray(raw)) {
    prices = raw;
  } else {
    try {
      prices = JSON.parse(raw);
    } catch {
      return [0.5, 0.5];
    }
  }
  // outcomes: ["Yes", "No"], outcomePrices: [yesPrice, noPrice]
  const yesPrice = parseFloat(prices[0]) || 0.5;
  const noPrice = parseFloat(prices[1]) || 0.5;
  return [yesPrice, noPrice];
}

/**
 * 解析 outcomes（可能是字符串或数组）
 * 返回 [outcome0, outcome1]，默认 ["No", "Yes"]
 */
function parseOutcomes(raw: string | string[] | undefined): [string, string] {
  if (!raw) return ["No", "Yes"];
  let outcomes: string[];
  if (Array.isArray(raw)) {
    outcomes = raw;
  } else {
    try {
      outcomes = JSON.parse(raw);
    } catch {
      return ["No", "Yes"];
    }
  }
  if (outcomes.length >= 2) {
    return [outcomes[0], outcomes[1]];
  }
  return ["No", "Yes"];
}

/**
 * 从 Gamma 原始数据构建 MarketData（含事件数据）
 */
export function buildMarketData(gammaMarkets: GammaMarketResponse[]): MarketData {
  const markets: Market[] = [];
  const tokenMap: TokenMap = {};
  const eventsMap = new Map<string, Event>();
  const marketEvents: MarketEvent[] = [];

  for (const m of gammaMarkets) {
    const tokenIds = parseClobTokenIds(m.clobTokenIds);
    if (!tokenIds || tokenIds.length < 2) {
      logger.warn(`Skipping market ${m.id}: missing clobTokenIds`);
      continue;
    }

    const [priceYes, priceNo] = parseOutcomePrices(m.outcomePrices);
    const outcomes = parseOutcomes(m.outcomes);

    markets.push({
      marketId: m.id,
      title: m.question,
      slug: m.slug,
      conditionId: m.conditionId,
      tokenYes: tokenIds[1],
      tokenNo: tokenIds[0],
      priceYes,
      priceNo,
      volume: m.volumeNum ?? (parseFloat(m.volume || "0") || 0),
      liquidity: m.liquidityNum ?? (parseFloat(m.liquidity || "0") || 0),
      tags: extractTags(m),
      endDate: m.endDate,
      image: m.image,
      outcomes,
      active: m.active,
    });

    // clobTokenIds[0] = NO, clobTokenIds[1] = YES
    tokenMap[tokenIds[0]] = { marketId: m.id, outcome: "NO" };
    tokenMap[tokenIds[1]] = { marketId: m.id, outcome: "YES" };

    // 提取事件数据
    if (m.events && Array.isArray(m.events)) {
      for (const e of m.events) {
        if (!eventsMap.has(e.id)) {
          eventsMap.set(e.id, {
            id: e.id,
            title: e.title,
            slug: e.slug,
            description: e.description,
            category: e.category,
            endDate: e.endDate,
            active: e.active ?? true,
          });
        }
        marketEvents.push({ marketId: m.id, eventId: e.id });
      }
    }
  }

  const events = Array.from(eventsMap.values());
  logger.info(
    `Built ${markets.length} markets, ${events.length} events, ` +
    `${marketEvents.length} relations, ${Object.keys(tokenMap).length} token mappings`
  );

  return { markets, events, marketEvents, tokenMap };
}
