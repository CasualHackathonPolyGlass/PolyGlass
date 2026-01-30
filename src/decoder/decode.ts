/**
 * 模块C：OrderFilled 事件解码器
 * 将 RawLog 解码为结构化 DecodedTrade
 */
import { ethers } from "ethers";
import { createLogger } from "@/lib/logger";
import { ORDER_FILLED_ABI } from "./abi";
import { validateTrade } from "./validate";
import type { RawLog, DecodedTrade, DecodeResult } from "@/types/trade";

const logger = createLogger("decoder");
const iface = new ethers.Interface(ORDER_FILLED_ABI);

/**
 * 解码单条 OrderFilled 日志
 */
export function decodeOrderFilled(log: RawLog): DecodedTrade {
  const parsed = iface.parseLog({
    topics: log.topics,
    data: log.data,
  });

  if (!parsed) {
    throw new Error("Failed to decode log");
  }

  return {
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    maker: parsed.args.maker,
    taker: parsed.args.taker,
    makerAssetId: parsed.args.makerAssetId.toString(),
    takerAssetId: parsed.args.takerAssetId.toString(),
    makerAmount: parsed.args.makerAmountFilled,
    takerAmount: parsed.args.takerAmountFilled,
    fee: parsed.args.fee,
  };
}

/**
 * 批量解码日志
 */
export function decodeLogs(logs: RawLog[]): DecodeResult {
  const trades: DecodedTrade[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < logs.length; i++) {
    try {
      const trade = decodeOrderFilled(logs[i]);
      if (validateTrade(trade)) {
        trades.push(trade);
      } else {
        errors.push({ index: i, error: "Validation failed" });
      }
    } catch (err) {
      errors.push({ index: i, error: String(err) });
    }
  }

  logger.info(`Decoded ${trades.length}/${logs.length} logs (${errors.length} errors)`);
  return { trades, errors };
}
