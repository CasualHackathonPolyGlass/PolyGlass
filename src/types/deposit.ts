/**
 * Deposit 存款类型定义
 * 用于识别用户入金行为
 */

/** 存款记录 */
export interface Deposit {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountUSDC: number;
  tokenAddress: string;
  direction: "IN" | "OUT";
}

/** 数据库行格式 */
export interface DepositRow {
  id: number;
  tx_hash: string;
  log_index: number;
  block_number: number;
  from_address: string;
  to_address: string;
  amount: string;
  amount_usdc: number;
  token_address: string;
  direction: string;
  created_at: string;
}

/** 存款聚合统计 */
export interface DepositSummary {
  address: string;
  hasDeposit: boolean;
  totalDepositUSDC: number;
  totalWithdrawUSDC: number;
  netDepositUSDC: number;
  firstDepositBlock: number | null;
}
