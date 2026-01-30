/**
 * API: GET /api/trades
 * 获取交易列表（分页）
 */
import { NextRequest, NextResponse } from "next/server";
import { getTrades, getTradeCount } from "@/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const trades = getTrades(limit, offset);
  const total = getTradeCount();

  return NextResponse.json({
    data: trades.map((t) => ({
      txHash: t.tx_hash,
      blockNumber: t.block_number,
      maker: t.maker,
      taker: t.taker,
      tokenId: t.token_id,
      marketId: t.market_id,
      marketTitle: t.market_title || null,
      outcome: t.outcome,
      direction: t.direction,
      price: t.price,
    })),
    pagination: { limit, offset, total },
  });
}
