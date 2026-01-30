/**
 * 模块C：OrderFilled 事件 ABI 定义
 */
export const ORDER_FILLED_ABI = [
    "event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)",
  ];
  