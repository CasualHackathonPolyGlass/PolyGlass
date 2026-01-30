/**
 * API: GET/POST /api/tags
 * 标签 CRUD
 */
import { NextRequest, NextResponse } from "next/server";
import { addTag, getTags } from "@/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || undefined;
  return NextResponse.json({ data: getTags(address) });
}

export async function POST(request: NextRequest) {
  const { address, tag } = await request.json();

  if (!address || !tag) {
    return NextResponse.json({ error: "Missing address or tag" }, { status: 400 });
  }

  try {
    addTag(address, tag);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }
}
