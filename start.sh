#!/usr/bin/env bash
# Templo Bahá'í — one-shot local start.
# Installs dependencies (first run only), runs the Prisma migration, and starts both servers.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# --- Bun (backend) -----------------------------------------------------------
if ! command -v bun >/dev/null 2>&1; then
  echo "→ Bun not found. Installing Bun (one-time)…"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

# --- Backend: deps + migration ----------------------------------------------
cd "$PROJECT_DIR/backend"
[ -f .env ] || cp .env.example .env

echo "→ Installing backend dependencies…"
bun install --silent

echo "→ Generating Prisma client + applying migration…"
bunx prisma migrate dev --name init --skip-seed >/dev/null 2>&1 || bunx prisma migrate dev --name init --skip-seed

# --- Frontend: deps ----------------------------------------------------------
cd "$PROJECT_DIR/frontend"
[ -f .env ] || cp .env.example .env

echo "→ Installing frontend dependencies…"
npm install --silent --no-audit --no-fund

# --- Start both servers, then open the browser -----------------------------
echo
echo "→ Starting backend  (http://localhost:3000)"
echo "→ Starting frontend (http://localhost:8000)"
echo "    admin password: admin123 (change in backend/.env)"
echo "    press Ctrl+C to stop"
echo

# Start backend in background; tear down on exit.
cd "$PROJECT_DIR/backend"
bun run dev &
BACKEND_PID=$!
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT INT TERM

# Wait a moment for the backend to be reachable, then open the browser.
sleep 2
( sleep 3 && open "http://localhost:8000" ) &

cd "$PROJECT_DIR/frontend"
npm run dev
