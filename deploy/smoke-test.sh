#!/usr/bin/env bash
# ===========================================
# Bedagang ERP — Staging Smoke Test
# ===========================================
# Usage: bash deploy/smoke-test.sh [base_url]
# Default: http://localhost:3001
# ===========================================
set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0
TIMEOUT=10

red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }
green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

assert_status() {
    local path="$1"
    local expected="$2"
    local label="${3:-$path}"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${BASE_URL}${path}" 2>/dev/null || echo "000")
    if [ "$status" = "$expected" ]; then
        green "$label → $status (expected $expected)"
        PASS=$((PASS + 1))
    else
        red "$label → $status (expected $expected)"
        FAIL=$((FAIL + 1))
    fi
}

assert_redirect() {
    local path="$1"
    local expected_code="$2"
    local expected_location_pattern="$3"
    local label="${4:-$path}"
    local result
    result=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" --max-time "$TIMEOUT" "${BASE_URL}${path}" 2>/dev/null || echo "000|")
    local code="${result%%|*}"
    local location="${result#*|}"
    if [ "$code" = "$expected_code" ] && echo "$location" | grep -qE "$expected_location_pattern"; then
        green "$label → $code redirects to $location"
        PASS=$((PASS + 1))
    else
        red "$label → $code (expected $expected_code redirect matching $expected_location_pattern), got: $location"
        FAIL=$((FAIL + 1))
    fi
}

assert_health_json() {
    local path="$1"
    local label="${2:-$path}"
    local body
    body=$(curl -s --max-time "$TIMEOUT" "${BASE_URL}${path}" 2>/dev/null || echo "")
    if echo "$body" | grep -q '"status":"healthy"'; then
        local db_status
        db_status=$(echo "$body" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
        green "$label → healthy (db: $db_status)"
        PASS=$((PASS + 1))
    else
        red "$label → unhealthy or unreachable"
        FAIL=$((FAIL + 1))
    fi
}

bold "======================================"
bold "  Bedagang ERP — Staging Smoke Test"
bold "  Target: $BASE_URL"
bold "======================================"
echo ""

# ─── Connectivity ─────────────────────────
bold "[1/4] Server Reachability"
assert_status "/api/health" "200" "Health endpoint reachable"

# ─── API Health ────────────────────────────
bold "[2/4] API Health Check"
assert_health_json "/api/health" "Full health payload"

# ─── Auth Routes ───────────────────────────
bold "[3/4] Auth Routes"
assert_status   "/auth/login"    "200" "Login page"
assert_status   "/auth/register" "200" "Register page"

# ─── Routing & Redirects ───────────────────
bold "[4/4] Route Redirects (unauthenticated)"
assert_redirect "/"              "307" "auth/login" "Root redirects to login"
assert_redirect "/dashboard"     "307" "auth/login" "Dashboard redirects to login"
assert_redirect "/hq/dashboard"  "307" "auth/login" "HQ dashboard redirects to login"
assert_redirect "/pos"           "307" "auth/login" "POS redirects to login"
assert_redirect "/hq/branches"   "307" "auth/login" "HQ branches redirects to login"

echo ""
bold "======================================"
if [ "$FAIL" -eq 0 ]; then
    bold "  ✓ ALL $PASS TESTS PASSED"
else
    bold "  ⚠ $PASS passed | $FAIL failed"
fi
bold "======================================"
exit "$FAIL"
