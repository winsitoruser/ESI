#!/usr/bin/env bash
# Humanify VPS health check — frontend pages + API endpoints
set -euo pipefail
BASE="${1:-http://127.0.0.1:3020}"
PM2_NAME="${HUMANIFY_PM2_NAME:-humanify}"
FAIL=0

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    echo "  ✓ $name ($code)"
  else
    echo "  ✗ $name (expected $expect, got $code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Humanify Health Check — $BASE"
echo ""
echo "Frontend:"
check "Landing"        "$BASE/humanify/welcome"
check "Login"          "$BASE/humanify/login"
check "Dashboard"      "$BASE/humanify" "307"  # redirect to login if no session
check "Employee portal" "$BASE/employee" "307"

echo ""
echo "API (public):"
check "Auth CSRF"      "$BASE/api/auth/csrf"
check "Auth providers" "$BASE/api/auth/providers"

echo ""
echo "Services:"
if command -v pm2 >/dev/null; then
  pm2 jlist 2>/dev/null | grep -q "\"name\":\"${PM2_NAME}\".*\"status\":\"online\"" && echo "  ✓ PM2 ${PM2_NAME} online" || { echo "  ✗ PM2 ${PM2_NAME} not online"; FAIL=$((FAIL+1)); }
fi
systemctl is-active --quiet nginx && echo "  ✓ nginx active" || { echo "  ✗ nginx down"; FAIL=$((FAIL+1)); }
systemctl is-active --quiet postgresql && echo "  ✓ postgresql active" || { echo "  ✗ postgresql down"; FAIL=$((FAIL+1)); }

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "✅ All checks passed"
  exit 0
else
  echo "❌ $FAIL check(s) failed"
  exit 1
fi
