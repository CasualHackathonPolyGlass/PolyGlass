/**
 * GET /api/smart-money/:address
 * 获取单个 Trader 详情
 *
 * 返回：trader 统计 + 仓位列表 + 近期信号
 */
import { NextResponse } from "next/server";
import { getTraderByAddress, getFillsByAddress, getSignalsByAddress } from "@/db/analytics";
import { replayPositions } from "@/lib/position";
import { getTagsForAddresses } from "@/db/tags";

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const lowerAddress = address.toLowerCase();

    // 查询 trader 统计
    const trader = getTraderByAddress(lowerAddress);
    if (!trader) {
      return NextResponse.json({ data: null });
    }

    // 获取仓位
    const fills = getFillsByAddress(lowerAddress);
    const allPositions = replayPositions(fills);
    const positions = allPositions.filter((p) => p.address === lowerAddress);

    // 获取近期信号
    const recentSignals = getSignalsByAddress(lowerAddress);

    // 用户自定义标签
    const userTags = getTagsForAddresses([lowerAddress]);
    const mergedTags = [
      ...trader.tags,
      ...(userTags[lowerAddress] || []),
    ];

    return NextResponse.json({
      data: {
        ...trader,
        tags: mergedTags,
        positions,
        recentSignals,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
