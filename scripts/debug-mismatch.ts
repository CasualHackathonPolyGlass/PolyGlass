/**
 * 调试脚本：分析 trade assetId 和 tokenMap 的不匹配问题
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// 加载环境变量
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

import { fetchMarketsWithFallback } from "../src/markets";
import { scanUntilEnough } from "../src/indexer";
import { decodeLogs } from "../src/decoder";

async function main() {
  console.log("=== 调试 Trade → Market 匹配问题 ===\n");

  // 1. 获取 tokenMap
  console.log("1. 获取市场数据...");
  const { markets, tokenMap } = await fetchMarketsWithFallback();
  const tokenKeys = Object.keys(tokenMap);
  console.log("   市场数:", markets.length);
  console.log("   tokenMap 键数:", tokenKeys.length);

  // 打印几个 tokenMap 键的样例
  console.log("\n   tokenMap 键样例（前5个）:");
  for (let i = 0; i < 5 && i < tokenKeys.length; i++) {
    console.log("   [" + i + "] " + tokenKeys[i] + " (长度: " + tokenKeys[i].length + ")");
  }

  // 2. 扫描链上日志
  console.log("\n2. 扫描链上日志...");
  const logs = await scanUntilEnough();
  console.log("   获取日志数:", logs.length);

  // 3. 解码交易
  console.log("\n3. 解码交易...");
  const { trades, errors } = decodeLogs(logs);
  console.log("   解码成功:", trades.length, "错误:", errors.length);

  if (trades.length === 0) {
    console.log("\n没有交易数据，无法调试");
    return;
  }

  // 4. 分析 assetId 格式
  console.log("\n4. 分析交易 assetId 格式...");
  const makerAssetIds = new Set<string>();
  const takerAssetIds = new Set<string>();

  for (const t of trades) {
    makerAssetIds.add(t.makerAssetId);
    takerAssetIds.add(t.takerAssetId);
  }

  console.log("   唯一 makerAssetId 数:", makerAssetIds.size);
  console.log("   唯一 takerAssetId 数:", takerAssetIds.size);

  // 打印几个 assetId 样例
  const makerSamples = Array.from(makerAssetIds).slice(0, 5);
  const takerSamples = Array.from(takerAssetIds).slice(0, 5);

  console.log("\n   makerAssetId 样例:");
  for (const id of makerSamples) {
    console.log("   -", id, "(长度:", id.length + ")");
  }

  console.log("\n   takerAssetId 样例:");
  for (const id of takerSamples) {
    console.log("   -", id, "(长度:", id.length + ")");
  }

  // 5. 检查是否有任何匹配
  console.log("\n5. 检查匹配...");
  let makerMatches = 0;
  let takerMatches = 0;

  for (const id of makerAssetIds) {
    if (tokenMap[id]) makerMatches++;
  }
  for (const id of takerAssetIds) {
    if (tokenMap[id]) takerMatches++;
  }

  console.log("   makerAssetId 匹配:", makerMatches + "/" + makerAssetIds.size);
  console.log("   takerAssetId 匹配:", takerMatches + "/" + takerAssetIds.size);

  // 6. 如果没有匹配，尝试分析原因
  if (makerMatches === 0 && takerMatches === 0) {
    console.log("\n6. 分析不匹配原因...");

    // 检查格式差异
    const sampleMaker = makerSamples[0];
    const sampleToken = tokenKeys[0];

    console.log("\n   比较格式:");
    console.log("   makerAssetId:", JSON.stringify(sampleMaker));
    console.log("   tokenMap key:", JSON.stringify(sampleToken));

    // 检查是否是大小写问题
    if (sampleMaker && sampleToken) {
      const lowerMaker = sampleMaker.toLowerCase();
      const lowerToken = sampleToken.toLowerCase();
      console.log("\n   小写比较:");
      console.log("   makerAssetId.toLowerCase():", JSON.stringify(lowerMaker));
      console.log("   tokenMap key.toLowerCase():", JSON.stringify(lowerToken));
    }

    // 检查 assetId 是否是数字型的
    if (sampleMaker && !isNaN(Number(sampleMaker))) {
      console.log("\n   注意: makerAssetId 看起来是纯数字");
    }

    // 检查 tokenMap key 的格式
    console.log("\n   检查 tokenMap key 格式:");
    console.log("   是否包含 '0x' 前缀:", sampleToken?.startsWith("0x"));
    console.log("   是否全数字:", /^\d+$/.test(sampleToken || ""));
  }
}

main().catch(console.error);
