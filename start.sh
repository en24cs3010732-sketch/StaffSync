#!/usr/bin/env bash
# StaffSync launcher for macOS / Linux.
# Usage:  ./start.sh      (or double-click start.command in Finder)
set -e
cd "$(dirname "$0")"

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'

echo "${BOLD}========================================${RESET}"
echo "${BOLD}   Starting StaffSync HR System${RESET}"
echo "${BOLD}========================================${RESET}"

# ---- 1. Node.js check -------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "${RED}Node.js is not installed.${RESET}"
  echo "Install it with Homebrew:  brew install node"
  echo "or download it from https://nodejs.org (LTS version)."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "${RED}Node $(node -v) is too old. Please install Node 20 or newer.${RESET}"
  exit 1
fi

# ---- 2. Config file ----------------------------------------------------------
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "Created server/.env"
fi

# ---- 3. Install dependencies on first run ---------------------------------------
if [ ! -d server/node_modules ]; then
  echo "${YELLOW}Installing server dependencies (first run only)...${RESET}"
  (cd server && npm install)
fi
if [ ! -d client/node_modules ]; then
  echo "${YELLOW}Installing client dependencies (first run only)...${RESET}"
  (cd client && npm install)
fi

# ---- 4. Port check ---------------------------------------------------------------
PORT=$(grep -E '^PORT=' server/.env | cut -d= -f2 | tr -d '[:space:]')
PORT=${PORT:-5001}
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "${RED}Port $PORT is already in use.${RESET}"
  echo "Free it, or change PORT in server/.env AND the proxy target in client/vite.config.js."
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN | head -3
  exit 1
fi

# ---- 5. Start both, stop both on Ctrl+C -----------------------------------------
cleanup() {
  echo
  echo "Stopping StaffSync..."
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd server && npm start) &
SERVER_PID=$!

# wait (up to ~3 min, first run may download the embedded database) for the API
echo "Waiting for the backend to be ready..."
for i in $(seq 1 180); do
  if curl -s "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "${RED}Backend stopped unexpectedly - see the error above.${RESET}"
    exit 1
  fi
  sleep 1
done

(cd client && npm run dev -- --open) &
CLIENT_PID=$!

echo
echo "${GREEN}StaffSync is running!${RESET}"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:$PORT"
echo "  Login:    admin@staffsync.com / Password123!"
echo "  Press Ctrl+C to stop."
echo

wait
