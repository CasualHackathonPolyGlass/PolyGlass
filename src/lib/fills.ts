/**
 * 模块：Fills 标准化层
 * 将 trade 转换为会计友好的 fill 记录
 *
 * 归类规则（基于 resolver）：
 * - direction=BUY: maker 提供 outcome tokens, taker 提供 USDC
 * - direction=SELL: taker 提供 outcome tokens, maker 提供 USDC
 *
 * 精度：
 * - USDC: 6 位小数 (10^6)
 * - Outcome Token: 6 位小数（Polymarket CTF 实际也是 10^6）
 */
import type { TradeRow } from "@/types/trade";
import type { Fill } from "@/types/fills";

const USDC_DECIMALS = 1e6;
const TOKEN_DECIMALS = 1e6;

/**
 * 将一条 trade 标准化为一或两条 fill
 * maker 和 taker 各产生一条（方向相反）
 */
export function normalizeTradeToFills(trade: TradeRow): Fill[] {
  if (!trade.market_id || !trade.outcome) return [];

  const makerAmount = Number(trade.maker_amount);
  const takerAmount = Number(trade.taker_amount);
  const outcomeSide = trade.outcome as "YES" | "NO";
  const fills: Fill[] = [];

  if (trade.direction === "BUY") {
    // maker 提供 outcome tokens, taker 提供 USDC
    // maker = 卖方, taker = 买方
    const shares = makerAmount / TOKEN_DECIMALS;
    const cash = takerAmount / USDC_DECIMALS;

    // Maker: 卖出 shares, 收入 USDC
    fills.push({
      address: trade.maker.toLowerCase(),
      marketId: trade.market_id,
      outcomeSide,
      sharesDelta: -shares,
      cashDeltaUSDC: cash,
      price: trade.price ?? cash / shares,
      timestamp: trade.block_number,
      txHash: trade.tx_hash,
      logIndex: trade.log_index,
      role: "maker",
    });

    // Taker: 买入 shares, 支出 USDC
    fills.push({
      address: trade.taker.toLowerCase(),
      marketId: trade.market_id,
      outcomeSide,
      sharesDelta: shares,
      cashDeltaUSDC: -cash,
      price: trade.price ?? cash / shares,
      timestamp: trade.block_number,
      txHash: trade.tx_hash,
      logIndex: trade.log_index,
      role: "taker",
    });
  } else {
    // direction === "SELL"
    // taker 提供 outcome tokens, maker 提供 USDC
    // taker = 卖方, maker = 买方
    const shares = takerAmount / TOKEN_DECIMALS;
    const cash = makerAmount / USDC_DECIMALS;

    // Maker: 买入 shares, 支出 USDC
    fills.push({
      address: trade.maker.toLowerCase(),
      marketId: trade.market_id,
      outcomeSide,
      sharesDelta: shares,
      cashDeltaUSDC: -cash,
      price: trade.price ?? cash / shares,
      timestamp: trade.block_number,
      txHash: trade.tx_hash,
      logIndex: trade.log_index,
      role: "maker",
    });

    // Taker: 卖出 shares, 收入 USDC
    fills.push({
      address: trade.taker.toLowerCase(),
      marketId: trade.market_id,
      outcomeSide,
      sharesDelta: -shares,
      cashDeltaUSDC: cash,
      price: trade.price ?? cash / shares,
      timestamp: trade.block_number,
      txHash: trade.tx_hash,
      logIndex: trade.log_index,
      role: "taker",
    });
  }

  return fills;
}

/**
 * 批量将 trades 转为 fills
 */
export function normalizeAllTrades(trades: TradeRow[]): Fill[] {
  return trades.flatMap(normalizeTradeToFills);
}
