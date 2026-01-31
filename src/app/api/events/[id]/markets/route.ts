/**
 * API: GET /api/events/[id]/markets
 * 获取事件详情及其下属市场（含 Smart Money 统计）
 *
 * 查询参数：
 * - smart_money: "true" | "false" (默认 false) - 是否包含 Smart Money 统计
 * - holders: "true" | "false" (默认 false) - 是否包含持仓者列表
 */
import { NextResponse } from "next/server";
import {
  getEventById, getMarketsByEventId,
  getEventDetailWithSmartMoney, getMarketsWithSmartMoneyByEventId, getSmartMoneyHoldersByMarket
} from "@/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeSmartMoney = searchParams.get("smart_money") === "true";
  const includeHolders = searchParams.get("holders") === "true";

  // Smart Money 模式
  if (includeSmartMoney) {
    const event = await getEventDetailWithSmartMoney(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const markets = await getMarketsWithSmartMoneyByEventId(id);

    // 如果需要持仓者列表
    if (includeHolders) {
      const marketsWithHolders = await Promise.all(
        markets.map(async (market) => ({
          ...market,
          smartMoneyHolders: await getSmartMoneyHoldersByMarket(market.id),
        }))
      );
      return NextResponse.json({ event, markets: marketsWithHolders });
    }

    return NextResponse.json({ event, markets });
  }

  // 默认模式
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const markets = await getMarketsByEventId(id);
  return NextResponse.json({ event, markets });
}
