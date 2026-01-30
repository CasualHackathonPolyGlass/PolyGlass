/**
 * 模块C：交易数据校验
 */
import type { DecodedTrade } from "@/types/trade";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * 校验解码后的交易是否合法
 */
export function validateTrade(trade: DecodedTrade): boolean {
  return (
    ADDRESS_REGEX.test(trade.maker) &&
    ADDRESS_REGEX.test(trade.taker) &&
    trade.makerAssetId.length > 0 &&
    trade.takerAssetId.length > 0 &&
    trade.makerAmount > 0n &&
    trade.takerAmount > 0n
  );
}
