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
      endDate: m.endDate,
      image: m.image,
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
