#!/usr/bin/env bash
# Run both the server (Express, :4100) and the client (Vite, :5173) together.
# Ctrl+C stops both.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"

if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "==> Installing server dependencies..."
  (cd "$SERVER_DIR" && npm install)
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
  echo "==> Installing client dependencies..."
  (cd "$CLIENT_DIR" && npm install)
fi

PIDS=()

cleanup() {
  echo ""
  echo "==> Stopping server and client..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> Starting server (http://localhost:4100, docs at /api-docs)..."
(cd "$SERVER_DIR" && npm run dev) &
PIDS+=("$!")

echo "==> Starting client (http://localhost:5173)..."
(cd "$CLIENT_DIR" && npm run dev) &
PIDS+=("$!")

echo ""
echo "Both running. Demo accounts: admin/123456 (quản lý), employee1/123456 (nhân viên)."
echo "Press Ctrl+C to stop both."

wait
