/**
 * API: GET /api/events/[id]/markets
 * 获取事件详情及其下属市场
 */
import { NextResponse } from "next/server";
import { getEventById, getMarketsByEventId } from "@/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEventById(id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const markets = getMarketsByEventId(id);
  return NextResponse.json({ event, markets });
}
