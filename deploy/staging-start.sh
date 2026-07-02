#!/usr/bin/env bash
# ===========================================
# Bedagang ERP — Staging Start Script
# ===========================================
# Usage: bash deploy/staging-start.sh
# Starts a staging dev server on port 3001
# and runs health verification.
# ===========================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "======================================"
echo "  Bedagang ERP — Staging Start"
echo "======================================"

# ─── 1. Check prerequisites ──────────────
echo "[1/4] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "ERROR: npm not found"; exit 1; }
echo "  ✓ node $(node --version)"
echo "  ✓ npm $(npm --version)"

# ─── 2. Check .env ────────────────────────
echo "[2/4] Checking environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "  ✓ Created .env from .env.example"
        echo "  ⚠ Edit .env with your secrets before running!"
    else
        echo "  ✗ No .env or .env.example found"
        exit 1
    fi
else
    echo "  ✓ .env exists"
fi

# ─── 3. Install & Build ───────────────────
echo "[3/4] Installing dependencies..."
if [ ! -d node_modules ]; then
    npm install
    echo "  ✓ Dependencies installed"
else
    echo "  ✓ node_modules exists (skip install)"
fi

echo "  Building for staging..."
npm run build
echo "  ✓ Build complete"

# ─── 4. Start server ──────────────────────
echo "[4/4] Starting staging server on port 3001..."
echo ""
echo "  To run: npm run dev --port=3001"
echo "  Health: http://localhost:3001/api/health"
echo ""

# Kill any existing process on port 3001
if lsof -i :3001 -t >/dev/null 2>&1; then
    echo "  ⚠ Port 3001 already in use — killing existing process..."
    kill $(lsof -i :3001 -t) 2>/dev/null || true
    sleep 2
fi

# Start server in background
npx next dev --port=3001 &
SERVER_PID=$!
echo "  ✓ Server starting (PID: $SERVER_PID)"

# Wait for server to be ready
echo "  Waiting for server readiness..."
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "" http://localhost:3001/api/health 2>/dev/null; then
        echo "  ✓ Server is ready!"
        break
    fi
    sleep 2
done

# ─── Health check ─────────────────────────
echo ""
echo "Running health check..."
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "  Response: $HEALTH"

if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo ""
    echo "======================================"
    echo "  ✓ Staging server is HEALTHY"
    echo "======================================"
    echo "  URL:      http://localhost:3001"
    echo "  Health:   http://localhost:3001/api/health"
    echo "  Login:    http://localhost:3001/auth/login"
    echo "  Dashboard: http://localhost:3001/hq/dashboard"
    echo "======================================"
else
    echo ""
    echo "  ✗ Health check FAILED"
    exit 1
fi
