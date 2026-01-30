/**
 * Trader 统计聚合模块
 * 从 PositionState 和 Fill 聚合每个 address 的交易统计
 */
import type { Fill, PositionState, TraderStats } from "@/types/fills";

/**
 * 判断市场是否已关闭（已平仓）
 */
export function isMarketClosed(position: PositionState): boolean {
  return position.positionShares === 0 && position.totalBuyShares > 0;
}

/**
 * 判断仓位是否盈利
 */
export function isWinningPosition(position: PositionState): boolean {
  return position.realizedPnL > 0;
}

/**
 * 计算单个 Trader 的统计数据
 */
export function calculateTraderStats(
  address: string,
  positions: PositionState[],
  fills: Fill[]
): TraderStats {
  // 基础统计
  const tradesCount = fills.length;
  const markets = new Set(positions.map((p) => `${p.marketId}:${p.outcomeSide}`));
  const marketsCount = markets.size;

  // 成交量（买入金额总和）
  const volumeUSDC = fills
    .filter((f) => f.sharesDelta > 0)
    .reduce((sum, f) => sum + Math.abs(f.cashDeltaUSDC), 0);

  // 已实现盈亏汇总
  const realizedPnL = positions.reduce((sum, p) => sum + p.realizedPnL, 0);

  // 总买入成本
  const totalBuyCost = positions.reduce((sum, p) => sum + p.totalBuyCost, 0);

  // ROI 计算
  const roi = totalBuyCost > 0 ? (realizedPnL / totalBuyCost) * 100 : 0;

  // 已平仓市场统计
  const closedPositions = positions.filter(isMarketClosed);
  const closedMarketsCount = closedPositions.length;

  // 盈利市场统计
  const winningPositions = closedPositions.filter(isWinningPosition);
  const winMarketsCount = winningPositions.length;

  // 胜率
  const winRate = closedMarketsCount > 0
    ? (winMarketsCount / closedMarketsCount) * 100
    : 0;

  return {
    address: address.toLowerCase(),
    tradesCount,
    marketsCount,
    volumeUSDC,
    realizedPnL,
    totalBuyCost,
    roi,
    closedMarketsCount,
    winMarketsCount,
    winRate,
  };
}

/**
 * 批量构建所有 Trader 统计
 */
export function buildTraderStats(
  positions: PositionState[],
  fills: Fill[]
): TraderStats[] {
  // 按地址分组 positions
  const positionsByAddress = new Map<string, PositionState[]>();
  for (const pos of positions) {
    const addr = pos.address.toLowerCase();
    const list = positionsByAddress.get(addr) || [];
    list.push(pos);
    positionsByAddress.set(addr, list);
  }

  // 按地址分组 fills
  const fillsByAddress = new Map<string, Fill[]>();
  for (const fill of fills) {
    const addr = fill.address.toLowerCase();
    const list = fillsByAddress.get(addr) || [];
    list.push(fill);
    fillsByAddress.set(addr, list);
  }

  // 合并所有地址
  const allAddresses = new Set([
    ...positionsByAddress.keys(),
    ...fillsByAddress.keys(),
  ]);

  // 计算每个地址的统计
  const stats: TraderStats[] = [];
  for (const address of allAddresses) {
    const addrPositions = positionsByAddress.get(address) || [];
    const addrFills = fillsByAddress.get(address) || [];

    if (addrFills.length > 0) {
      stats.push(calculateTraderStats(address, addrPositions, addrFills));
    }
  }

  return stats;
}

/**
 * 按指定字段排序 Trader 统计
 */
export function sortTraderStats(
  stats: TraderStats[],
  sortBy: keyof TraderStats = "realizedPnL",
  order: "asc" | "desc" = "desc"
): TraderStats[] {
  return [...stats].sort((a, b) => {
    const aVal = a[sortBy] as number;
    const bVal = b[sortBy] as number;
    return order === "desc" ? bVal - aVal : aVal - bVal;
  });
}
