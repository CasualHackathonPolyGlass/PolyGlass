/**
 * Position Replay 模块
 * 重建每个 (address, marketId, outcomeSide) 的仓位状态
 *
 * 算法：
 * - BUY (sharesDelta > 0): avgCost 加权平均更新
 * - SELL (sharesDelta < 0): realizedPnL += proceeds - avgCost * soldShares
 */
import type { Fill, PositionState } from "@/types/fills";

/**
 * 生成仓位唯一键
 */
export function positionKey(
  address: string,
  marketId: string,
  outcomeSide: "YES" | "NO"
): string {
  return `${address.toLowerCase()}:${marketId}:${outcomeSide}`;
}

/**
 * 创建空仓位
 */
export function createEmptyPosition(
  address: string,
  marketId: string,
  outcomeSide: "YES" | "NO"
): PositionState {
  return {
    address: address.toLowerCase(),
    marketId,
    outcomeSide,
    positionShares: 0,
    avgCost: 0,
    realizedPnL: 0,
    totalBuyCost: 0,
    totalBuyShares: 0,
    totalSellProceeds: 0,
    totalSellShares: 0,
  };
}

/**
 * 应用单笔 Fill 到仓位
 * @returns 更新后的仓位（不修改原对象）
 */
export function applyFillToPosition(
  position: PositionState,
  fill: Fill
): PositionState {
  const newPosition = { ...position };
  const shares = Math.abs(fill.sharesDelta);
  const cash = Math.abs(fill.cashDeltaUSDC);

  if (fill.sharesDelta > 0) {
    // BUY: 更新加权平均成本
    const totalCost = newPosition.avgCost * newPosition.positionShares + cash;
    const totalShares = newPosition.positionShares + shares;

    newPosition.avgCost = totalShares > 0 ? totalCost / totalShares : 0;
    newPosition.positionShares = totalShares;
    newPosition.totalBuyCost += cash;
    newPosition.totalBuyShares += shares;
  } else if (fill.sharesDelta < 0) {
    // SELL: 计算已实现盈亏
    const soldShares = Math.min(shares, newPosition.positionShares);
    const costBasis = newPosition.avgCost * soldShares;
    const proceeds = cash;

    newPosition.realizedPnL += proceeds - costBasis;
    newPosition.positionShares = Math.max(0, newPosition.positionShares - shares);
    newPosition.totalSellProceeds += cash;
    newPosition.totalSellShares += shares;

    // 如果完全平仓，重置 avgCost
    if (newPosition.positionShares === 0) {
      newPosition.avgCost = 0;
    }
  }

  return newPosition;
}

/**
 * 批量重建所有仓位
 * @param fills 按时间排序的 Fill 数组
 * @returns 所有仓位最终状态
 */
export function replayPositions(fills: Fill[]): PositionState[] {
  // 按时间戳排序
  const sortedFills = [...fills].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.logIndex - b.logIndex;
  });

  // 仓位映射
  const positions = new Map<string, PositionState>();

  for (const fill of sortedFills) {
    const key = positionKey(fill.address, fill.marketId, fill.outcomeSide);

    let position = positions.get(key);
    if (!position) {
      position = createEmptyPosition(fill.address, fill.marketId, fill.outcomeSide);
    }

    position = applyFillToPosition(position, fill);
    positions.set(key, position);
  }

  return Array.from(positions.values());
}

/**
 * 获取指定地址的所有仓位
 */
export function getPositionsForAddress(
  positions: PositionState[],
  address: string
): PositionState[] {
  const lowerAddress = address.toLowerCase();
  return positions.filter((p) => p.address === lowerAddress);
}

/**
 * 获取指定市场的所有仓位
 */
export function getPositionsForMarket(
  positions: PositionState[],
  marketId: string
): PositionState[] {
  return positions.filter((p) => p.marketId === marketId);
}
