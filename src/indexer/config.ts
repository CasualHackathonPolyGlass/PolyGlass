/**
 * 模块B：常量配置
 * 合约地址、事件签名等
 */
import { ethers } from "ethers";

/** Polymarket CTF Exchange 合约地址 */
export const EXCHANGE_ADDRESSES = [
  "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E", // Current
  "0xC5d563A36AE78145C45a50134d48A1215220f80a", // Legacy
];

/** OrderFilled 事件签名 */
export const ORDER_FILLED_TOPIC = ethers.id(
  "OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)"
);

/** 扫描参数 */
export const SCAN_WINDOW = 10; // Alchemy 免费版限制 10 blocks
export const MIN_LOGS = 100;
export const MAX_RETRIES = 3;

/** 3 天约 130,000 个区块 (2秒/块) */
export const BLOCKS_3_DAYS = 130_000;

/** 并行请求数 */
export const PARALLEL_REQUESTS = 5;
