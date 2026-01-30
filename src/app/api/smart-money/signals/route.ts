/**
 * GET /api/smart-money/signals
 * 获取跟单信号列表
 *
 * 查询参数：
 * - window: 1h | 6h | 24h | 7d (默认 24h)
 * - limit: number (默认 50)
 */
import { NextResponse } from "next/server";
import { getRecentSignals } from "@/db/analytics";

/** 时间窗口到小时数的映射 */
const WINDOW_HOURS_MAP: Record<string, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "1d": 24,
  "7d": 168,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = searchParams.get("window") || "24h";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const windowHours = WINDOW_HOURS_MAP[window] || 24;

    const signals = getRecentSignals(windowHours);
    const data = signals.slice(0, limit);

    return NextResponse.json({
      data,
      total: data.length,
      window,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
