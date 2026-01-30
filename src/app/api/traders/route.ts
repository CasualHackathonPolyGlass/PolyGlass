/**
 * API: GET /api/traders
 * 获取交易者排行（含标签）
 */
import { NextResponse } from "next/server";
import { getTraderStats } from "@/db";

export async function GET() {
  const traders = getTraderStats();
  return NextResponse.json({ data: traders });
}
