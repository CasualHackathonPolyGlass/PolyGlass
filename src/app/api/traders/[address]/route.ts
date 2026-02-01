/**
 * GET /api/traders/[address]
 * 获取任意钱包地址的 Polymarket 交易员画像
 * 代理请求 Polymarket Data API + Gamma API
 */
import { NextResponse } from "next/server";
import {
  getTraderProfileSummary,
  getTraderProfileStats,
  getTraderPositions,
} from "@/lib/polymarket-api";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { address } = await params;

  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ data: null, error: "Invalid address" }, { status: 400 });
  }

  const normalized = address.toLowerCase();

  try {
    const [summary, stats, positions] = await Promise.all([
      getTraderProfileSummary(normalized),
      getTraderProfileStats(normalized),
      getTraderPositions(normalized),
    ]);

    return NextResponse.json({
      data: { summary, stats, positions },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
