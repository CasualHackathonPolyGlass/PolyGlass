/**
 * Origin 地址类型定义
 * 用于区分 EOA/合约/Proxy Wallet
 */

/** 地址类型 */
export type OriginType = "EOA" | "CONTRACT" | "PROXY";

/** 地址元信息（数据库存储） */
export interface OriginMetadata {
  address: string;
  isContract: boolean;
  isRelayer: boolean;
  isProxyWallet: boolean | null;
  tradesCount24h: number;
  medianTimeGapSec: number | null;
  updatedAt: string;
}

/** 数据库行格式 */
export interface OriginMetadataRow {
  address: string;
  is_contract: number;
  is_relayer: number;
  is_proxy_wallet: number | null;
  trades_count_24h: number;
  median_time_gap_sec: number | null;
  updated_at: string;
}

/** Relayer 检测配置 */
export interface RelayerConfig {
  tradesCount24hThreshold: number;
  medianTimeGapSecThreshold: number;
  txCountThreshold: number;
}

/** 检测结果 */
export interface OriginDetectionResult {
  originType: OriginType;
  isRelayer: boolean;
  isProxyWallet: boolean | null;
}

/** 交易行为统计 */
export interface TradeBehavior {
  tradesCount24h: number;
  medianTimeGapSec: number | null;
  totalTradesCount: number;
}
