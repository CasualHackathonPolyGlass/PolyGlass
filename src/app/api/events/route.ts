/**
 * API: GET /api/events
 * 获取事件列表（含统计）
 */
import { NextResponse } from "next/server";
import { getEventsWithStats } from "@/db";

export async function GET() {
  const events = getEventsWithStats();
  return NextResponse.json({ data: events });
}
