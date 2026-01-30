#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Fetching Polymarket Data ==="
pnpm fetch
