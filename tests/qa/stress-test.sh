#!/bin/bash
# ============================================================
# BEDAGANG ERP — STRESS TEST & PERFORMANCE SUITE
# ============================================================
# Tests: Authentication, Products, POS, HRIS, CRM/SFA
# ============================================================

BASE_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0
TIMING_FILE="/tmp/bedagang_timing_$$.csv"
REPORT_FILE="/tmp/bedagang_report_$$.md"

echo "endpoint,concurrency,total_time_ms,avg_time_ms,success_rate" > "$TIMING_FILE"

echo "🔧 BEDAGANG ERP STRESS TEST SUITE"
echo "======================================"
echo "Target: $BASE_URL"
echo ""

# ============================================================
# STEP 0: AUTHENTICATE & GET SESSION
# ============================================================
echo "📡 Step 0: Authentication..."

# Get CSRF token
CSRF_RESP=$(curl -s "$BASE_URL/api/auth/csrf" 2>/dev/null)
CSRF=$(echo "$CSRF_RESP" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF" ]; then
    echo "❌ FAIL: Cannot get CSRF token"
    exit 1
fi
echo "   ✓ CSRF token obtained"

# Login via credentials callback - follow redirects to get session cookie
curl -s -L \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -c /tmp/bedagang_session.txt \
    -d "csrfToken=${CSRF}&email=superadmin@bedagang.com&password=superadmin123&callbackUrl=${BASE_URL}/hq/dashboard" \
    -o /dev/null -w "%{http_code}" 2>/dev/null

# Check if we have session cookies
SESSION_COOKIE=$(cat /tmp/bedagang_session.txt 2>/dev/null | grep -c "next-auth")
if [ "$SESSION_COOKIE" -eq 0 ]; then
    echo "⚠️  Session cookie not found after login, using CSRF-only approach"
fi

# Try to fetch session
SESSION_CHECK=$(curl -s -b /tmp/bedagang_session.txt "$BASE_URL/api/auth/session" 2>/dev/null)
if echo "$SESSION_CHECK" | grep -q '"user"'; then
    echo "   ✓ Session established: superadmin@bedagang.com"
else
    echo "   ⚠️  Session may be limited - proceeding with available auth"
fi
echo ""

# Helper function to call API with auth
call_api() {
    local method="$1"
    local url="$2"
    local data="$3"
    shift 3
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -b /tmp/bedagang_session.txt \
            -d "$data" \
            -w "\n%{http_code}" 2>/dev/null
    else
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -b /tmp/bedagang_session.txt \
            -w "\n%{http_code}" 2>/dev/null
    fi
}

# ============================================================
# STEP 1: STRESS TEST — AUTH (100 concurrent login attempts)
# ============================================================
echo "📡 Step 1: Stress Test — Auth (100 concurrent logins)"
echo "------------------------------------------------------"

START_TIME=$(date +%s%N)
SUCCESS_COUNT=0
FAIL_COUNT=0
TIMES=""

for i in $(seq 1 100); do
    {
        T0=$(date +%s%N)
        # Attempt login with valid and invalid credentials mixed
        if [ $((i % 5)) -eq 0 ]; then
            # Invalid login
            RES=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
                -H "Content-Type: application/x-www-form-urlencoded" \
                -d "csrfToken=${CSRF}&email=invalid@test.com&password=wrongpass&callbackUrl=${BASE_URL}/hq/dashboard" \
                -o /dev/null -w "%{http_code}" 2>/dev/null)
        else
            # Valid login attempt
            RES=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
                -H "Content-Type: application/x-www-form-urlencoded" \
                -d "csrfToken=${CSRF}&email=superadmin@bedagang.com&password=superadmin123&callbackUrl=${BASE_URL}/hq/dashboard" \
                -o /dev/null -w "%{http_code}" 2>/dev/null)
        fi
        T1=$(date +%s%N)
        ELAPSED=$(( (T1 - T0) / 1000000 ))
        echo "$ELAPSED $RES" >> /tmp/bedagang_auth_results_$$.txt
    } &
done
wait

# Parse results
TOTAL_TIME=0
COUNT=0
while read -r line; do
    T=$(echo "$line" | cut -d' ' -f1)
    S=$(echo "$line" | cut -d' ' -f2)
    TOTAL_TIME=$((TOTAL_TIME + T))
    COUNT=$((COUNT + 1))
    if [ "$S" = "302" ] || [ "$S" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done < /tmp/bedagang_auth_results_$$.txt

END_TIME=$(date +%s%N)
WALL_CLOCK=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_TIME=$((COUNT > 0 ? TOTAL_TIME / COUNT : 0))
SUCCESS_RATE=$((COUNT > 0 ? (SUCCESS_COUNT * 100 / COUNT) : 0))

echo "   Total requests: $COUNT"
echo "   Wall clock: ${WALL_CLOCK}ms"
echo "   Avg response: ${AVG_TIME}ms"
echo "   Successful: $SUCCESS_COUNT"
echo "   Failed: $FAIL_COUNT"
echo "   Success rate: ${SUCCESS_RATE}%"

if [ "$SUCCESS_RATE" -ge 90 ]; then
    echo "   ✅ PASS: Auth stress test (${SUCCESS_RATE}% success rate)"
    PASS=$((PASS + 1))
else
    echo "   ❌ FAIL: Auth stress test (${SUCCESS_RATE}% < 90% threshold)"
    FAIL=$((FAIL + 1))
fi
echo "auth_100,100,${WALL_CLOCK},${AVG_TIME},${SUCCESS_RATE}%" >> "$TIMING_FILE"
rm -f /tmp/bedagang_auth_results_$$.txt
echo ""

# ============================================================
# STEP 2: STRESS TEST — Products (bulk read)
# ============================================================
echo "📡 Step 2: Stress Test — Products (100 concurrent reads)"
echo "---------------------------------------------------------"

START_TIME=$(date +%s%N)
SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_TIME=0
COUNT=0

for i in $(seq 1 100); do
    {
        T0=$(date +%s%N)
        RES=$(curl -s "$BASE_URL/api/hq/inventory/products?page=1&limit=20" \
            -b /tmp/bedagang_session.txt \
            -o /dev/null -w "%{http_code}" 2>/dev/null)
        T1=$(date +%s%N)
        ELAPSED=$(( (T1 - T0) / 1000000 ))
        echo "$ELAPSED $RES" >> /tmp/bedagang_products_results_$$.txt
    } &
done
wait

while read -r line; do
    T=$(echo "$line" | cut -d' ' -f1)
    S=$(echo "$line" | cut -d' ' -f2)
    TOTAL_TIME=$((TOTAL_TIME + T))
    COUNT=$((COUNT + 1))
    if [ "$S" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done < /tmp/bedagang_products_results_$$.txt

END_TIME=$(date +%s%N)
WALL_CLOCK=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_TIME=$((COUNT > 0 ? TOTAL_TIME / COUNT : 0))
SUCCESS_RATE=$((COUNT > 0 ? (SUCCESS_COUNT * 100 / COUNT) : 0))

echo "   Total requests: $COUNT"
echo "   Wall clock: ${WALL_CLOCK}ms"
echo "   Avg response: ${AVG_TIME}ms"
echo "   Successful: $SUCCESS_COUNT"
echo "   Failed: $FAIL_COUNT"
echo "   Success rate: ${SUCCESS_RATE}%"

if [ "$SUCCESS_RATE" -ge 90 ] && [ "$AVG_TIME" -le 500 ]; then
    echo "   ✅ PASS: Products bulk read (avg ${AVG_TIME}ms, ${SUCCESS_RATE}%)"
    PASS=$((PASS + 1))
else
    echo "   ❌ FAIL: Products bulk read (avg ${AVG_TIME}ms, ${SUCCESS_RATE}%)"
    FAIL=$((FAIL + 1))
fi
echo "products_bulk_100,100,${WALL_CLOCK},${AVG_TIME},${SUCCESS_RATE}%" >> "$TIMING_FILE"
rm -f /tmp/bedagang_products_results_$$.txt
echo ""

# ============================================================
# STEP 3: STRESS TEST — HRIS APIs
# ============================================================
echo "📡 Step 3: CRUD Test — HRIS Endpoints"
echo "--------------------------------------"

# 3a: GET Employees list
echo "   Testing GET /api/hq/hris/employees..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/hris/employees?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET employees: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET employees: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 3b: GET Attendance
echo "   Testing GET /api/hq/hris/attendance..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/hris/attendance?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET attendance: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET attendance: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 3c: GET Leave
echo "   Testing GET /api/hq/hris/leave..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/hris/leave?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET leave: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET leave: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 3d: GET Payroll
echo "   Testing GET /api/hq/hris/payroll..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/hris/payroll?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET payroll: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET payroll: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 3e: GET Employee Profile
echo "   Testing GET /api/hq/hris/employee-profile..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/hris/employee-profile?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET employee-profile: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET employee-profile: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

echo ""

# ============================================================
# STEP 4: CRUD TEST — CRM / SFA / Marketing
# ============================================================
echo "📡 Step 4: CRUD Test — CRM/SFA/Marketing"
echo "------------------------------------------"

# 4a: SFA CRM
echo "   Testing GET /api/hq/sfa/crm..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/sfa/crm?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET sfa/crm: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET sfa/crm: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 4b: SFA Sales Management
echo "   Testing GET /api/hq/sfa/sales-management..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/sfa/sales-management?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET sfa/sales-management: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET sfa/sales-management: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

# 4c: Marketing
echo "   Testing GET /api/hq/marketing..."
T0=$(date +%s%N)
RESP=$(call_api "GET" "$BASE_URL/api/hq/marketing?limit=5")
T1=$(date +%s%N)
HTTP_CODE=$(echo "$RESP" | tail -1)
ELAPSED=$(( (T1 - T0) / 1000000 ))
if [ "$HTTP_CODE" = "200" ]; then
    echo "     ✓ GET marketing: ${ELAPSED}ms"
    PASS=$((PASS + 1))
else
    echo "     ❌ GET marketing: HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
fi

echo ""

# ============================================================
# STEP 5: PERFORMANCE — Response Times
# ============================================================
echo "📡 Step 5: Performance — Response Times Benchmark"
echo "--------------------------------------------------"

ENDPOINTS=(
    "GET:api/health"
    "GET:api/hq/dashboard"
    "GET:api/hq/hris/employees?limit=5"
    "GET:api/hq/hris/attendance?limit=5"
    "GET:api/hq/hris/leave?limit=5"
    "GET:api/hq/hris/payroll?limit=5"
    "GET:api/hq/sfa/crm?limit=5"
    "GET:api/hq/sfa/sales-management?limit=5"
    "GET:api/hq/marketing?limit=5"
    "GET:api/hq/inventory/products?limit=5"
    "GET:api/hq/finance/transactions?limit=5"
    "GET:api/hq/branches?limit=5"
    "GET:api/hq/reports/sales?limit=5"
    "GET:api/hq/settings"
    "GET:api/hq/users?limit=5"
)

SLOW=()
FAST=()

for EP in "${ENDPOINTS[@]}"; do
    METHOD=$(echo "$EP" | cut -d: -f1)
    PATHURL=$(echo "$EP" | cut -d: -f2-)
    URL="$BASE_URL/$PATHURL"
    
    T0=$(date +%s%N)
    RESP=$(call_api "$METHOD" "$URL" "")
    T1=$(date +%s%N)
    HTTP_CODE=$(echo "$RESP" | tail -1)
    ELAPSED=$(( (T1 - T0) / 1000000 ))
    
    # Get response body size
    BODY=$(echo "$RESP" | sed '$d')
    SIZE=${#BODY}
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        if [ "$ELAPSED" -le 200 ]; then
            echo "   ✓ $PATHURL — ${ELAPSED}ms (${SIZE}B)"
            FAST+=("$PATHURL:${ELAPSED}ms")
        elif [ "$ELAPSED" -le 500 ]; then
            echo "   ⚠️ $PATHURL — ${ELAPSED}ms (${SIZE}B) — SLOW"
            SLOW+=("$PATHURL:${ELAPSED}ms")
        else
            echo "   🔴 $PATHURL — ${ELAPSED}ms (${SIZE}B) — CRITICAL"
            SLOW+=("$PATHURL:${ELAPSED}ms")
            FAIL=$((FAIL + 1))
        fi
    else
        echo "   ❌ $PATHURL — HTTP $HTTP_CODE"
        FAIL=$((FAIL + 1))
    fi
    echo "${PATHURL},1,${ELAPSED},${ELAPSED},${HTTP_CODE}" >> "$TIMING_FILE"
done

echo ""
if [ ${#SLOW[@]} -eq 0 ]; then
    echo "   ✅ All endpoints respond within 200ms"
    PASS=$((PASS + 1))
else
    echo "   ⚠️  ${#SLOW[@]} slow endpoint(s):"
    for S in "${SLOW[@]}"; do
        echo "     - $S"
    done
fi

# ============================================================
# STEP 6: MEMORY CHECK
# ============================================================
echo ""
echo "📡 Step 6: Memory & Process Health"
echo "--------------------------------------"

# Check Next.js process memory
NEXT_MEM=$(ps aux | grep "[n]ext-server" | awk '{print $6}')
if [ -n "$NEXT_MEM" ]; then
    NEXT_MEM_MB=$((NEXT_MEM / 1024))
    echo "   Next.js RSS: ${NEXT_MEM_MB}MB"
    if [ "$NEXT_MEM_MB" -lt 500 ]; then
        echo "   ✅ Memory usage healthy"
    elif [ "$NEXT_MEM_MB" -lt 1000 ]; then
        echo "   ⚠️  Memory usage moderate"
    else
        echo "   🔴 Memory usage high (>1GB)"
    fi
else
    echo "   ⚠️  Next.js process not found"
fi

# Check system memory
TOTAL_MEM=$(vm_stat 2>/dev/null | head -5 || sysctl hw.memsize 2>/dev/null || echo "N/A")
echo "   System memory: $TOTAL_MEM"

echo ""

# ============================================================
# SUMMARY
# ============================================================
echo "======================================"
echo "📊 STRESS TEST SUMMARY"
echo "======================================"
echo "Passed: $PASS"
echo "Failed: $FAIL"
TOTAL=$((PASS + FAIL))
echo "Total checks: $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "✅ ALL STRESS TESTS PASSED"
else
    echo "⚠️  ${FAIL} test(s) failed — see details above"
fi
echo ""

# Generate report
cat > "$REPORT_FILE" <<REPORTEOF
# BEDAGANG ERP — STRESS TEST REPORT

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Target:** $BASE_URL  
**Status:** $([ "$FAIL" -eq 0 ] && echo "✅ ALL PASSED" || echo "⚠️ ${FAIL} FAILURES")

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Checks | $TOTAL |
| Passed | $PASS |
| Failed | $FAIL |
| Pass Rate | $((${PASS} * 100 / ${TOTAL}))% |

## Performance Metrics

| Endpoint | Avg Response | Status |
|----------|-------------|--------|
REPORTEOF

while IFS=, read -r EP CONC TOTAL_T AVG_T SUCCESS; do
    if [ "$EP" != "endpoint" ]; then
        STATUS="✅ PASS"
        if [ "$AVG_T" -gt 500 ] 2>/dev/null; then
            STATUS="🔴 FAIL"
        elif [ "$AVG_T" -gt 200 ] 2>/dev/null; then
            STATUS="⚠️ SLOW"
        fi
        echo "| $EP | ${AVG_T}ms | $STATUS |" >> "$REPORT_FILE"
    fi
done < "$TIMING_FILE"

cat >> "$REPORT_FILE" <<REPORTEOF

## Slow Endpoints (>200ms)
REPORTEOF

for S in "${SLOW[@]}"; do
    echo "- $S" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" <<REPORTEOF

## Memory Metrics
- Next.js RSS: ${NEXT_MEM_MB}MB
- System: $TOTAL_MEM

## Stress Test Details
- **Auth:** 100 concurrent login attempts
- **Products:** 100 concurrent reads
- **CRUD:** HRIS (Employees, Attendance, Leave, Payroll)
- **CRUD:** CRM/SFA/Marketing
- **Performance:** 15 HQ endpoints benchmarked

---
*Generated by Bedagang QA-3 Stress Test Suite*
REPORTEOF

echo "📄 Report saved to: $REPORT_FILE"
cp "$REPORT_FILE" "/Users/winnerharry/Bedagang ERP/bedagang---PoS/STRESS-TEST-REPORT.md"
echo "📄 Copied to project root: STRESS-TEST-REPORT.md"
rm -f "$TIMING_FILE"
echo ""
echo "Done."
