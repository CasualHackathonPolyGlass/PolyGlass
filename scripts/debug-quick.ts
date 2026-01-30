/**
 * 快速调试：读取已有数据，分析 assetId vs tokenMap 的不匹配
 */
import { readFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const dbPath = join(process.cwd(), "data", "app.db");
const cachePath = join(process.cwd(), "data", "markets-cache.json");

// 读取 tokenMap cache
const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
const gammaMarkets = cache.data || cache;

console.log("=== 快速调试 ===\n");

// 1. 检查数据库中的交易
const db = new Database(dbPath, { readonly: true });

const trades = db.prepare("SELECT * FROM trades LIMIT 10").all() as Array<Record<string, unknown>>;
console.log("数据库交易数:", db.prepare("SELECT COUNT(*) as c FROM trades").get());
console.log("交易表结构:", Object.keys(trades[0] || {}));
console.log("\n前3条交易:");
for (const t of trades.slice(0, 3)) {
  console.log(JSON.stringify(t, null, 2));
}

// 2. 检查是否有 unresolved trades 表
try {
  const rawTradesCount = db.prepare("SELECT COUNT(*) as c FROM trades WHERE market_id IS NULL OR market_id = ''").get();
  console.log("\n未归属市场的交易:", rawTradesCount);
} catch (e) {
  console.log("\n无法查询未归属交易:", e);
}

// 3. 从 gammaMarkets 提取 tokenIds
console.log("\n=== Gamma 数据分析 ===");
console.log("gamma 数据类型:", typeof gammaMarkets);
if (Array.isArray(gammaMarkets)) {
  console.log("gamma 市场数:", gammaMarkets.length);
  const sample = gammaMarkets[0];
  console.log("样例市场:", JSON.stringify(sample, null, 2).slice(0, 500));

  // 分析 clobTokenIds 格式
  let withTokenIds = 0;
  let withoutTokenIds = 0;
  const tokenIdSet = new Set<string>();

  for (const m of gammaMarkets) {
    let ids: string[] | null = null;
    if (Array.isArray(m.clobTokenIds)) {
      ids = m.clobTokenIds;
    } else if (typeof m.clobTokenIds === "string") {
      try {
        ids = JSON.parse(m.clobTokenIds);
      } catch {}
    }

    if (ids && ids.length >= 2) {
      withTokenIds++;
      ids.forEach((id: string) => tokenIdSet.add(id));
    } else {
      withoutTokenIds++;
    }
  }

  console.log("\n有 clobTokenIds 的市场:", withTokenIds);
  console.log("无 clobTokenIds 的市场:", withoutTokenIds);
  console.log("唯一 tokenId 总数:", tokenIdSet.size);

  // 打印几个样例 tokenId
  const tokenSamples = Array.from(tokenIdSet).slice(0, 3);
  console.log("\ntokenId 样例:");
  for (const id of tokenSamples) {
    console.log(" ", id, "(长度:", id.length + ")");
  }
}

db.close();
