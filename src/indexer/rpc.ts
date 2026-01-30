/**
 * 模块B：RPC 客户端封装
 * JSON-RPC 调用 + 指数退避重试
 */
import { createLogger } from "@/lib/logger";
import { MAX_RETRIES } from "./config";
import type { RawLog } from "@/types/trade";

const logger = createLogger("rpc");

function getRpcUrl(): string {
  const url = process.env.RPC_URL;
  if (!url) throw new Error("RPC_URL environment variable is required");
  return url;
}

/**
 * 通用 JSON-RPC 调用
 */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }
  return json.result;
}

/**
 * 带指数退避的 RPC 调用
 */
export async function rpcCallWithRetry(
  method: string,
  params: unknown[],
  retries = MAX_RETRIES
): Promise<unknown> {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      return await rpcCall(method, params);
    } catch (err) {
      if (i === retries - 1) throw err;
      logger.warn(`RPC retry ${i + 1}/${retries}: ${err}`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("Unreachable");
}

/**
 * 获取最新区块号
 */
export async function getLatestBlock(): Promise<number> {
  const res = await rpcCallWithRetry("eth_blockNumber", []);
  return parseInt(res as string, 16);
}

/**
 * 获取事件日志
 */
export async function getLogs(params: {
  fromBlock: number;
  toBlock: number;
  address: string[];
  topics: string[];
}): Promise<RawLog[]> {
  const res = (await rpcCallWithRetry("eth_getLogs", [
    {
      fromBlock: "0x" + params.fromBlock.toString(16),
      toBlock: "0x" + params.toBlock.toString(16),
      address: params.address,
      topics: params.topics,
    },
  ])) as Array<{
    blockNumber: string;
    transactionHash: string;
    logIndex: string;
    topics: string[];
    data: string;
  }>;

  return res.map((log) => ({
    blockNumber: parseInt(log.blockNumber, 16),
    transactionHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    topics: log.topics,
    data: log.data,
  }));
}
