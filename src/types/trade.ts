/**
 * 交易相关类型定义
 */

/** RPC 返回的原始日志 */
export interface RawLog {
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    topics: string[];
    data: string;
  }
  
  /** 解码后的交易 */
  export interface DecodedTrade {
    txHash: string;
    logIndex: number;
    blockNumber: number;
    maker: string;
    taker: string;
    makerAssetId: string;
    takerAssetId: string;
    makerAmount: bigint;
    takerAmount: bigint;
    fee: bigint;
    originFrom?: string;  // 真实 EOA（交易发起者）
  }
  
  /** 归类后的交易（含市场和价格信息） */
  export interface ResolvedTrade extends DecodedTrade {
    tokenId: string;
    marketId: string;
    outcome: "YES" | "NO";
    direction: "BUY" | "SELL";
    price: number;
  }
  
  /** 数据库读取的交易行 */
  export interface TradeRow {
    id: number;
    tx_hash: string;
    log_index: number;
    block_number: number;
    maker: string;
    taker: string;
    maker_asset_id: string;
    taker_asset_id: string;
    maker_amount: string;
    taker_amount: string;
    fee: string;
    token_id: string | null;
    market_id: string | null;
    outcome: string | null;
    direction: string;
    price: number | null;
    origin_from: string | null;  // 真实 EOA
    origin_type: string | null;  // 'EOA' | 'CONTRACT' | 'PROXY'
    origin_is_relayer: number | null;  // 0/1 boolean
    market_title?: string;
  }
  
  /** 解码批处理结果 */
  export interface DecodeResult {
    trades: DecodedTrade[];
    errors: Array<{ index: number; error: string }>;
  }
  
  /** 归类批处理结果 */
  export interface ResolveResult {
    resolved: ResolvedTrade[];
    unresolved: DecodedTrade[];
  }
  