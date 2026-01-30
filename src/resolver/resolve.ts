/**
 * 模块D：Market Resolver
 * 为每笔交易计算 tokenId、marketId、outcome、direction、price
 *
 * 归类规则：
 * - makerAssetId in tokenMap → tokenId = makerAssetId, direction = BUY
 * - takerAssetId in tokenMap → tokenId = takerAssetId, direction = SELL
 *
 * 价格计算：
 * - price = collateral / outcome
 * - BUY:  price = takerAmount / makerAmount
 * - SELL: price = makerAmount / takerAmount
 */
import { createLogger } from "@/lib/logger";
import type { DecodedTrade, ResolvedTrade, ResolveResult } from "@/types/trade";
import type { TokenMap } from "@/types/market";

const logger = createLogger("resolver");

/**
 * 归类单笔交易
 */
export function resolveTrade(
  trade: DecodedTrade,
  tokenMap: TokenMap
): ResolvedTrade | null {
  // 1. 判定 tokenId
  let tokenId: string;
  let isMakerOutcome: boolean;

  if (trade.makerAssetId in tokenMap) {
    tokenId = trade.makerAssetId;
    isMakerOutcome = true;
  } else if (trade.takerAssetId in tokenMap) {
    tokenId = trade.takerAssetId;
    isMakerOutcome = false;
  } else {
    return null; // 无法归类
  }

  // 2. 查询 market 信息
  const mapping = tokenMap[tokenId];

  // 3. 判定 direction
  // maker 提供 outcome → taker 买入 → BUY
  // taker 提供 outcome → taker 卖出 → SELL
  const direction = isMakerOutcome ? "BUY" : "SELL";

  // 4. 计算 price
  let price: number;
  if (direction === "BUY") {
    // collateral = takerAmount, outcome = makerAmount
    price = Number(trade.takerAmount) / Number(trade.makerAmount);
  } else {
    // collateral = makerAmount, outcome = takerAmount
    price = Number(trade.makerAmount) / Number(trade.takerAmount);
  }

  // 5. 价格校验与修正
  if (!isFinite(price) || price < 0 || price > 1) {
    logger.warn(`Price anomaly: ${price} for tx ${trade.txHash}`);
    price = Math.max(0, Math.min(1, price)); // clamp
  }

  return {
    ...trade,
    tokenId,
    marketId: mapping.marketId,
    outcome: mapping.outcome,
    direction,
    price,
  };
}

/**
 * 批量归类交易
 */
export function resolveTrades(
  trades: DecodedTrade[],
  tokenMap: TokenMap
): ResolveResult {
  const resolved: ResolvedTrade[] = [];
  const unresolved: DecodedTrade[] = [];

  for (const trade of trades) {
    const result = resolveTrade(trade, tokenMap);
    if (result) {
      resolved.push(result);
    } else {
      unresolved.push(trade);
    }
  }

  const hitRate = ((resolved.length / trades.length) * 100).toFixed(1);
  logger.info(`Resolved: ${resolved.length}/${trades.length} (${hitRate}%)`);
  logger.info(`Unresolved: ${unresolved.length}/${trades.length}`);

  return { resolved, unresolved };
}
