/**
 * 盘口类型识别模块
 * 用于体育类市场的盘口分组聚合
 */
import type { Market } from "@/types/market";

/** 盘口类型 */
export type BetType = "moneyline" | "spread" | "total" | "set_winner" | "other";

/** 盘口分组 */
export interface BetTypeGroup {
  type: BetType;
  label: string;
  markets: Market[];
}

/** 盘口类型显示标签 */
const BET_TYPE_LABELS: Record<BetType, string> = {
  moneyline: "Match Winner",
  spread: "Handicap/Spread",
  total: "Over/Under",
  set_winner: "Set Winner",
  other: "Other Markets",
};

/** 盘口类型排序优先级 */
const BET_TYPE_ORDER: BetType[] = ["moneyline", "spread", "total", "set_winner", "other"];

/**
 * 通过 title 和 outcomes 推断盘口类型
 */
export function inferBetType(market: Market): BetType {
  const title = market.title.toLowerCase();
  const outcomes = market.outcomes ?? ["No", "Yes"];

  // O/U 盘口: title 包含 over/under、o/u、total + 数字，或 outcomes 是 Over/Under
  if (
    /over.?under|o\/u\s*\d|\btotal\s+(games|sets|kills|points)/i.test(title) ||
    (outcomes[0]?.toLowerCase() === "over" && outcomes[1]?.toLowerCase() === "under")
  ) {
    return "total";
  }

  // Handicap/Spread 盘口: title 包含 handicap、spread，或带括号的 +/- 数字
  if (/handicap|spread|\([+-]\d+\.?\d*\)/i.test(title)) {
    return "spread";
  }

  // Set/Game Winner: title 包含 "set X winner" 或 "game X winner"
  if (/(?:set|game)\s*\d+\s*winner/i.test(title)) {
    return "set_winner";
  }

  // 默认为 Moneyline（主胜负盘）
  return "moneyline";
}

/**
 * 判断是否为体育类市场
 */
export function isSportsMarket(market: Market): boolean {
  return market.tags?.includes("Sports") ?? false;
}

/**
 * 判断事件是否为体育类（检查任一子市场）
 */
export function isSportsEvent(markets: Market[]): boolean {
  return markets.some(isSportsMarket);
}

/**
 * 将市场按盘口类型分组
 */
export function groupMarketsByBetType(markets: Market[]): BetTypeGroup[] {
  const groups = new Map<BetType, Market[]>();

  for (const market of markets) {
    const type = inferBetType(market);
    const list = groups.get(type) || [];
    list.push(market);
    groups.set(type, list);
  }

  // 按优先级排序返回
  return BET_TYPE_ORDER
    .filter((type) => groups.has(type))
    .map((type) => ({
      type,
      label: BET_TYPE_LABELS[type],
      markets: groups.get(type)!,
    }));
}
