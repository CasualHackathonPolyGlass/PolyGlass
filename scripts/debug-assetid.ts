/**
 * 调试：直接检查最近获取的日志解码后的 assetId 格式
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }
}
loadEnv();

import { getLatestBlock, getLogs } from "../src/indexer/rpc";
import { EXCHANGE_ADDRESSES, ORDER_FILLED_TOPIC } from "../src/indexer/config";
import { decodeLogs } from "../src/decoder";

async function main() {
  // 只取最新10个block的日志
  const latest = await getLatestBlock();
  const logs = await getLogs({
    fromBlock: latest - 9,
    toBlock: latest,
    address: EXCHANGE_ADDRESSES,
    topics: [ORDER_FILLED_TOPIC],
  });

  console.log("最新10个block的日志数:", logs.length);

  if (logs.length === 0) {
    console.log("没有日志，尝试更大范围...");
    return;
  }

  const { trades } = decodeLogs(logs.slice(0, 5));

  // 读取 tokenMap
  const cache = JSON.parse(readFileSync(join(process.cwd(), "data", "markets-cache.json"), "utf-8"));
  const tokenMap = cache.tokenMap;
  const tokenKeys = Object.keys(tokenMap);

  console.log("\ntokenMap 键数:", tokenKeys.length);
  console.log("tokenMap 键样例:", tokenKeys[0]);
  console.log("tokenMap 键长度:", tokenKeys[0]?.length);

  for (const t of trades) {
    console.log("\n--- Trade ---");
    console.log("makerAssetId:", t.makerAssetId);
    console.log("makerAssetId 长度:", t.makerAssetId.length);
    console.log("takerAssetId:", t.takerAssetId);
    console.log("takerAssetId 长度:", t.takerAssetId.length);
    console.log("makerAssetId in tokenMap:", t.makerAssetId in tokenMap);
    console.log("takerAssetId in tokenMap:", t.takerAssetId in tokenMap);
    console.log("tokenMap[makerAssetId]:", tokenMap[t.makerAssetId]);
    console.log("tokenMap[takerAssetId]:", tokenMap[t.takerAssetId]);
  }
}

main().catch(console.error);
