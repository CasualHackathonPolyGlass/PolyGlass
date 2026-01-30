#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Polymarket Dashboard Demo ==="

# 检查 .env.local
if [ ! -f ".env.local" ]; then
  echo "ERROR: .env.local not found"
  echo "Please copy .env.example to .env.local and configure RPC_URL"
  exit 1
fi

# 安装依赖
echo "[1/3] Installing dependencies..."
pnpm install --silent

# 拉取数据
echo "[2/3] Fetching data..."
pnpm fetch

# 启动服务
echo "[3/3] Starting dev server..."
echo ""
echo "Open http://localhost:3000/dashboard in your browser"
echo ""
pnpm dev
