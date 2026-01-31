/**
 * Deposit 扫描模块
 * 监听 USDC Transfer 事件到 Polymarket vault
 */
import { getLogs } from "@/indexer/rpc";
import { ethers } from "ethers";
import type { Deposit } from "@/types/deposit";

/** Polygon USDC 地址（USDC.e bridged） */
export const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

/** Polygon 原生 USDC 地址 */
export const USDC_NATIVE_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

/**
 * Polymarket 已知的 Vault/Router 地址
 * 用于识别入金/出金行为
 */
export const POLYMARKET_VAULTS = [
  "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E", // CTF Exchange
  "0xC5d563A36AE78145C45a50134d48A1215220f80a", // Legacy Exchange
  "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045", // Conditional Tokens
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e (如果有直接转入)
];

/** 规范化的 vault 地址集合（小写） */
const VAULT_SET = new Set(POLYMARKET_VAULTS.map((v) => v.toLowerCase()));

/** ERC20 Transfer 事件签名 */
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

/**
 * 扫描 USDC Transfer 事件
 * @param fromBlock 起始区块
 * @param toBlock 结束区块
 * @returns Deposit 记录数组
 */
export async function scanDeposits(
  fromBlock: number,
  toBlock: number
): Promise<Deposit[]> {
  // 同时扫描 USDC.e 和原生 USDC
  const logs = await getLogs({
    fromBlock,
    toBlock,
    address: [USDC_ADDRESS, USDC_NATIVE_ADDRESS],
    topics: [TRANSFER_TOPIC],
  });

  const deposits: Deposit[] = [];

  for (const log of logs) {
    // 解析 Transfer 事件
    // topics[1] = from (indexed)
    // topics[2] = to (indexed)
    // data = amount
    if (!log.topics[1] || !log.topics[2]) continue;

    const from = ethers.getAddress("0x" + log.topics[1].slice(26));
    const to = ethers.getAddress("0x" + log.topics[2].slice(26));
    const amount = BigInt(log.data);
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    // 检查是否是 deposit（to 在 vault 列表中）
    if (VAULT_SET.has(toLower)) {
      deposits.push({
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        fromAddress: from,
        toAddress: to,
        amount: amount.toString(),
        amountUSDC: Number(amount) / 1e6,
        tokenAddress: log.topics[0] === TRANSFER_TOPIC ? USDC_ADDRESS : USDC_NATIVE_ADDRESS,
        direction: "IN",
      });
    }

    // 检查是否是 withdrawal（from 在 vault 列表中）
    if (VAULT_SET.has(fromLower)) {
      deposits.push({
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        fromAddress: from,
        toAddress: to,
        amount: amount.toString(),
        amountUSDC: Number(amount) / 1e6,
        tokenAddress: log.topics[0] === TRANSFER_TOPIC ? USDC_ADDRESS : USDC_NATIVE_ADDRESS,
        direction: "OUT",
      });
    }
  }

  return deposits;
}

/**
 * 分批扫描 deposits（带进度回调）
 */
export async function scanDepositsBatch(
  fromBlock: number,
  toBlock: number,
  batchSize: number = 10000,
  onProgress?: (scanned: number, total: number) => void
): Promise<Deposit[]> {
  const allDeposits: Deposit[] = [];
  const totalBlocks = toBlock - fromBlock;
  let scanned = 0;

  for (let start = fromBlock; start <= toBlock; start += batchSize) {
    const end = Math.min(start + batchSize - 1, toBlock);
    const deposits = await scanDeposits(start, end);
    allDeposits.push(...deposits);

    scanned = end - fromBlock;
    if (onProgress) {
      onProgress(scanned, totalBlocks);
    }
  }

  return allDeposits;
}
