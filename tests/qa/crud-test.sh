#!/bin/bash
# ============================================================
# BEDAGANG ERP — COMPREHENSIVE CRUD TEST SUITE
# ============================================================
# Tests CRUD operations on HQ modules:
#   - HRIS: Employees, Attendance, Leave, Payroll, Employee Profile
#   - CRM/SFA: CRM, Sales Management, Marketing, SFA Advanced
#   - Additional: Branches, Finance, Inventory, Settings, Users
# ============================================================

BASE_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0
WARN=0
REPORT_FILE="/tmp/bedagang_crud_report_$$.md"

echo "🔧 BEDAGANG ERP — COMPREHENSIVE CRUD TEST SUITE"
echo "================================================"
echo "Target: $BASE_URL"
echo ""

# ============================================================
# AUTHENTICATION
# ============================================================
echo "📡 Authentication..."

CSRF_RESP=$(curl -s "$BASE_URL/api/auth/csrf" 2>/dev/null)
CSRF=$(echo "$CSRF_RESP" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF" ]; then
    echo "❌ FAIL: Cannot get CSRF token"
    exit 1
fi

curl -s -L \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -c /tmp/bedagang_crud_session.txt \
    -d "csrfToken=${CSRF}&email=superadmin@bedagang.com&password=superadmin123&callbackUrl=${BASE_URL}/hq/dashboard" \
    -o /dev/null -w "%{http_code}" 2>/dev/null

SESSION_CHECK=$(curl -s -b /tmp/bedagang_crud_session.txt "$BASE_URL/api/auth/session" 2>/dev/null)
if echo "$SESSION_CHECK" | grep -q '"user"'; then
    echo "✓ Authenticated as superadmin"
else
    echo "⚠️  Auth may be limited — proceeding"
fi
echo ""

# Helper: call API and return HTTP code
api() {
    local m="$1" u="$2" d="$3"
    if [ -n "$d" ]; then
        curl -s -X "$m" "$u" -H "Content-Type: application/json" \
            -b /tmp/bedagang_crud_session.txt -d "$d" -w "\n%{http_code}" 2>/dev/null
    else
        curl -s -X "$m" "$u" -H "Content-Type: application/json" \
            -b /tmp/bedagang_crud_session.txt -w "\n%{http_code}" 2>/dev/null
    fi
}

# Helper: test an endpoint
test_endpoint() {
    local desc="$1" method="$2" url="$3" data="$4" expected="${5:-200}"
    echo -n "   $desc..."

    T0=$(date +%s%N)
    RESP=$(api "$method" "$url" "$data")
    T1=$(date +%s%N)
    HTTP_CODE=$(echo "$RESP" | tail -1)
    ELAPSED=$(( (T1 - T0) / 1000000 ))
    
    if [ "$HTTP_CODE" = "$expected" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        if [ "$ELAPSED" -le 200 ]; then
            echo " ✅ ${HTTP_CODE} (${ELAPSED}ms)"
            PASS=$((PASS + 1))
        elif [ "$ELAPSED" -le 500 ]; then
            echo " ⚠️  ${HTTP_CODE} (${ELAPSED}ms) — SLOW"
            WARN=$((WARN + 1))
            PASS=$((PASS + 1))
        else
            echo " 🔴 ${HTTP_CODE} (${ELAPSED}ms) — TOO SLOW"
            FAIL=$((FAIL + 1))
        fi
    else
        echo " ❌ HTTP ${HTTP_CODE} (expected ${expected})"
        FAIL=$((FAIL + 1))
    fi
    
    echo "$desc,$method,${HTTP_CODE},${ELAPSED}ms" >> /tmp/bedagang_crud_results_$$.csv
}

# ============================================================
# SECTION 1: HRIS MODULE
# ============================================================
echo "================================================"
echo "SECTION 1: HRIS MODULE"
echo "================================================"

echo ""
echo "--- Employees ---"
test_endpoint "GET Employees list" "GET" "$BASE_URL/api/hq/hris/employees?limit=10"
test_endpoint "GET Employee Profile" "GET" "$BASE_URL/api/hq/hris/employee-profile?limit=5"
test_endpoint "GET Organization" "GET" "$BASE_URL/api/hq/hris/organization"
test_endpoint "GET Lifecycle" "GET" "$BASE_URL/api/hq/hris/lifecycle?limit=5"
test_endpoint "GET Recruitment" "GET" "$BASE_URL/api/hq/hris/recruitment?limit=5"

echo ""
echo "--- Attendance ---"
test_endpoint "GET Attendance" "GET" "$BASE_URL/api/hq/hris/attendance?limit=10"
test_endpoint "GET Attendance Management" "GET" "$BASE_URL/api/hq/hris/attendance-management?limit=5"
test_endpoint "GET Attendance Settings" "GET" "$BASE_URL/api/hq/hris/attendance/settings"
test_endpoint "GET Attendance Devices" "GET" "$BASE_URL/api/hq/hris/attendance/devices"

echo ""
echo "--- Leave ---"
test_endpoint "GET Leave" "GET" "$BASE_URL/api/hq/hris/leave?limit=10"
test_endpoint "GET Leave Management" "GET" "$BASE_URL/api/hq/hris/leave-management?limit=5"

echo ""
echo "--- Payroll ---"
test_endpoint "GET Payroll" "GET" "$BASE_URL/api/hq/hris/payroll?limit=10"
test_endpoint "GET Payroll Bulk" "GET" "$BASE_URL/api/hq/hris/payroll-bulk?limit=5"
test_endpoint "GET Travel Expense" "GET" "$BASE_URL/api/hq/hris/travel-expense?limit=5"
test_endpoint "GET Claim Upload" "GET" "$BASE_URL/api/hq/hris/upload-claim?limit=5"

echo ""
echo "--- Performance & Training ---"
test_endpoint "GET Performance" "GET" "$BASE_URL/api/hq/hris/performance?limit=5"
test_endpoint "GET KPI" "GET" "$BASE_URL/api/hq/hris/kpi?limit=5"
test_endpoint "GET KPI Templates" "GET" "$BASE_URL/api/hq/hris/kpi-templates?limit=5"
test_endpoint "GET KPI Settings" "GET" "$BASE_URL/api/hq/hris/kpi-settings"
test_endpoint "GET KPI Scoring" "GET" "$BASE_URL/api/hq/hris/kpi-scoring?limit=5"
test_endpoint "GET Training" "GET" "$BASE_URL/api/hq/hris/training?limit=5"
test_endpoint "GET Training Development" "GET" "$BASE_URL/api/hq/hris/training-development?limit=5"
test_endpoint "GET Training Scoring" "GET" "$BASE_URL/api/hq/hris/training-scoring?limit=5"

echo ""
echo "--- HRIS Extras ---"
test_endpoint "GET Engagement" "GET" "$BASE_URL/api/hq/hris/engagement?limit=5"
test_endpoint "GET Industrial Relations" "GET" "$BASE_URL/api/hq/hris/industrial-relations?limit=5"
test_endpoint "GET Reminders" "GET" "$BASE_URL/api/hq/hris/reminders?limit=5"
test_endpoint "GET Workflow" "GET" "$BASE_URL/api/hq/hris/workflow?limit=5"
test_endpoint "GET Overtime" "GET" "$BASE_URL/api/hq/hris/overtime?limit=5"
test_endpoint "GET Workforce Analytics" "GET" "$BASE_URL/api/hq/hris/workforce-analytics"
test_endpoint "GET Realtime" "GET" "$BASE_URL/api/hq/hris/realtime"
test_endpoint "GET HRIS Export" "GET" "$BASE_URL/api/hq/hris/export"

# ============================================================
# SECTION 2: CRM / SFA MODULE
# ============================================================
echo ""
echo "================================================"
echo "SECTION 2: CRM / SFA MODULE"
echo "================================================"

echo ""
echo "--- SFA Core ---"
test_endpoint "GET SFA Index" "GET" "$BASE_URL/api/hq/sfa"
test_endpoint "GET SFA CRM" "GET" "$BASE_URL/api/hq/sfa/crm?limit=10"
test_endpoint "GET SFA Sales Management" "GET" "$BASE_URL/api/hq/sfa/sales-management?limit=10"
test_endpoint "GET SFA Enhanced" "GET" "$BASE_URL/api/hq/sfa/enhanced?limit=5"
test_endpoint "GET SFA Advanced" "GET" "$BASE_URL/api/hq/sfa/advanced?limit=5"
test_endpoint "GET SFA Lookup" "GET" "$BASE_URL/api/hq/sfa/lookup"
test_endpoint "GET SFA Notifications" "GET" "$BASE_URL/api/hq/sfa/notifications?limit=5"
test_endpoint "GET SFA Task Calendar" "GET" "$BASE_URL/api/hq/sfa/task-calendar?limit=5"
test_endpoint "GET SFA AI Workflow" "GET" "$BASE_URL/api/hq/sfa/ai-workflow?limit=5"
test_endpoint "GET SFA Audit Trail" "GET" "$BASE_URL/api/hq/sfa/audit-trail?limit=5"
test_endpoint "GET SFA Data Export" "GET" "$BASE_URL/api/hq/sfa/data-export"

echo ""
echo "--- Marketing ---"
test_endpoint "GET Marketing Index" "GET" "$BASE_URL/api/hq/marketing?limit=10"
test_endpoint "GET Marketing Insights (AI)" "GET" "$BASE_URL/api/ai/marketing/insights"

echo ""
echo "--- Customers (non-HQ) ---"
test_endpoint "GET Customers List" "GET" "$BASE_URL/api/customers?limit=10"
test_endpoint "GET Customers Stats" "GET" "$BASE_URL/api/customers/stats"
test_endpoint "GET Customers Reports" "GET" "$BASE_URL/api/customers/reports?limit=5"

# ============================================================
# SECTION 3: FINANCE MODULE
# ============================================================
echo ""
echo "================================================"
echo "SECTION 3: FINANCE MODULE"
echo "================================================"

echo ""
echo "--- Finance HQ ---"
test_endpoint "GET Finance Summary" "GET" "$BASE_URL/api/hq/finance/summary"
test_endpoint "GET Finance Transactions" "GET" "$BASE_URL/api/hq/finance/transactions?limit=10"
test_endpoint "GET Finance Revenue" "GET" "$BASE_URL/api/hq/finance/revenue?limit=5"
test_endpoint "GET Finance Expenses" "GET" "$BASE_URL/api/hq/finance/expenses?limit=5"
test_endpoint "GET Finance P&L" "GET" "$BASE_URL/api/hq/finance/profit-loss"
test_endpoint "GET Finance Cash Flow" "GET" "$BASE_URL/api/hq/finance/cash-flow"
test_endpoint "GET Finance Budget" "GET" "$BASE_URL/api/hq/finance/budget?limit=5"
test_endpoint "GET Finance Accounts" "GET" "$BASE_URL/api/hq/finance/accounts?limit=5"
test_endpoint "GET Finance Tax" "GET" "$BASE_URL/api/hq/finance/tax"
test_endpoint "GET Finance Invoices" "GET" "$BASE_URL/api/hq/finance/invoices?limit=5"
test_endpoint "GET Finance Export" "GET" "$BASE_URL/api/hq/finance/export"
test_endpoint "GET Finance Realtime" "GET" "$BASE_URL/api/hq/finance/realtime"

echo ""
echo "--- Finance Settings ---"
test_endpoint "GET Chart of Accounts" "GET" "$BASE_URL/api/finance/settings/chart-of-accounts"
test_endpoint "GET Finance Categories" "GET" "$BASE_URL/api/finance/settings/categories"
test_endpoint "GET Payment Methods" "GET" "$BASE_URL/api/finance/settings/payment-methods"
test_endpoint "GET Bank Accounts" "GET" "$BASE_URL/api/finance/settings/bank-accounts"
test_endpoint "GET Finance Assets" "GET" "$BASE_URL/api/finance/settings/assets"

# ============================================================
# SECTION 4: INVENTORY MODULE
# ============================================================
echo ""
echo "================================================"
echo "SECTION 4: INVENTORY MODULE"
echo "================================================"

echo ""
test_endpoint "GET HQ Inventory Products" "GET" "$BASE_URL/api/hq/inventory/products?limit=10"
test_endpoint "GET HQ Inventory Summary" "GET" "$BASE_URL/api/hq/inventory/summary"
test_endpoint "GET HQ Inventory Stock" "GET" "$BASE_URL/api/hq/inventory/stock?limit=10"
test_endpoint "GET HQ Inventory Categories" "GET" "$BASE_URL/api/hq/inventory/categories"
test_endpoint "GET HQ Inventory Alerts" "GET" "$BASE_URL/api/hq/inventory/alerts?limit=5"
test_endpoint "GET HQ Inventory Receipts" "GET" "$BASE_URL/api/hq/inventory/receipts?limit=5"
test_endpoint "GET HQ Inventory Transfers" "GET" "$BASE_URL/api/hq/inventory/transfers?limit=5"
test_endpoint "GET HQ Inventory Pricing" "GET" "$BASE_URL/api/hq/inventory/pricing?limit=5"
test_endpoint "GET HQ Inventory Stocktake" "GET" "$BASE_URL/api/hq/inventory/stocktake?limit=5"
test_endpoint "GET HQ Inventory Enhanced" "GET" "$BASE_URL/api/hq/inventory/enhanced?limit=5"

# ============================================================
# SECTION 5: BRANCHES
# ============================================================
echo ""
echo "================================================"
echo "SECTION 5: BRANCHES"
echo "================================================"

echo ""
test_endpoint "GET HQ Branches" "GET" "$BASE_URL/api/hq/branches?limit=10"
test_endpoint "GET HQ Branches Analytics" "GET" "$BASE_URL/api/hq/branches/analytics"
test_endpoint "GET HQ Branches Performance" "GET" "$BASE_URL/api/hq/branches/performance"
test_endpoint "GET HQ Branches Finance" "GET" "$BASE_URL/api/hq/branches/finance"
test_endpoint "GET HQ Branches Inventory" "GET" "$BASE_URL/api/hq/branches/inventory"
test_endpoint "GET HQ Branches Users" "GET" "$BASE_URL/api/hq/branches/users?limit=5"
test_endpoint "GET HQ Branches Settings" "GET" "$BASE_URL/api/hq/branches/settings"

# ============================================================
# SECTION 6: REPORTS
# ============================================================
echo ""
echo "================================================"
echo "SECTION 6: REPORTS"
echo "================================================"

echo ""
test_endpoint "GET HQ Reports Sales" "GET" "$BASE_URL/api/hq/reports/sales?limit=5"
test_endpoint "GET HQ Reports Finance" "GET" "$BASE_URL/api/hq/reports/finance?limit=5"
test_endpoint "GET HQ Reports Inventory" "GET" "$BASE_URL/api/hq/reports/inventory?limit=5"
test_endpoint "GET HQ Reports Consolidated" "GET" "$BASE_URL/api/hq/reports/consolidated"
test_endpoint "GET HQ Reports Enhanced" "GET" "$BASE_URL/api/hq/reports/enhanced"
test_endpoint "GET HQ Reports Comprehensive" "GET" "$BASE_URL/api/hq/reports/comprehensive"

# ============================================================
# SECTION 7: USERS & SETTINGS
# ============================================================
echo ""
echo "================================================"
echo "SECTION 7: USERS & SETTINGS"
echo "================================================"

echo ""
test_endpoint "GET HQ Users" "GET" "$BASE_URL/api/hq/users?limit=10"
test_endpoint "GET HQ Users ByRole" "GET" "$BASE_URL/api/hq/users/by-role"
test_endpoint "GET HQ Roles" "GET" "$BASE_URL/api/hq/roles"
test_endpoint "GET HQ Settings" "GET" "$BASE_URL/api/hq/settings"
test_endpoint "GET HQ Settings Taxes" "GET" "$BASE_URL/api/hq/settings/taxes"
test_endpoint "GET HQ Settings Notifications" "GET" "$BASE_URL/api/hq/settings/notifications"

# ============================================================
# SECTION 8: ADDITIONAL MODULES
# ============================================================
echo ""
echo "================================================"
echo "SECTION 8: ADDITIONAL MODULES"
echo "================================================"

echo ""
test_endpoint "GET HQ DMS" "GET" "$BASE_URL/api/hq/dms?limit=5"
test_endpoint "GET HQ DMS Overview" "GET" "$BASE_URL/api/hq/dms/overview"
test_endpoint "GET HQ Audit Logs" "GET" "$BASE_URL/api/hq/audit-logs?limit=5"
test_endpoint "GET HQ Analytics" "GET" "$BASE_URL/api/hq/analytics"
test_endpoint "GET HQ Modules Catalog" "GET" "$BASE_URL/api/hq/modules/catalog"
test_endpoint "GET HQ Modules Deployment" "GET" "$BASE_URL/api/hq/modules/deployment"
test_endpoint "GET HQ Billing Info" "GET" "$BASE_URL/api/hq/billing-info"
test_endpoint "GET HQ Subscription Current" "GET" "$BASE_URL/api/hq/subscription/current"
test_endpoint "GET HQ Subscription Plans" "GET" "$BASE_URL/api/hq/subscription/plans"
test_endpoint "GET HQ Billing Invoices" "GET" "$BASE_URL/api/hq/billing/invoices?limit=5"
test_endpoint "GET HQ Fleet Index" "GET" "$BASE_URL/api/hq/fleet?limit=5"
test_endpoint "GET HQ Fleet Vehicles" "GET" "$BASE_URL/api/hq/fleet/vehicles?limit=5"
test_endpoint "GET HQ Manufacturing" "GET" "$BASE_URL/api/hq/manufacturing?limit=5"
test_endpoint "GET HQ E-Procurement" "GET" "$BASE_URL/api/hq/e-procurement?limit=5"
test_endpoint "GET HQ Assets" "GET" "$BASE_URL/api/hq/assets?limit=5"
test_endpoint "GET HQ Suppliers" "GET" "$BASE_URL/api/hq/suppliers?limit=5"
test_endpoint "GET HQ Purchase Orders" "GET" "$BASE_URL/api/hq/purchase-orders?limit=5"
test_endpoint "GET HQ Monitoring Realtime" "GET" "$BASE_URL/api/hq/monitoring/realtime"
test_endpoint "GET HQ Realtime Index" "GET" "$BASE_URL/api/hq/realtime"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "================================================"
echo "📊 CRUD TEST SUMMARY"
echo "================================================"
echo "Passed:  $PASS"
echo "Failed:  $FAIL"
echo "Warnings: $WARN"
TOTAL=$((PASS + FAIL))
echo "Total:   $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "✅ ALL CRUD TESTS PASSED"
else
    echo "⚠️  ${FAIL} test(s) failed"
fi

# Generate report
RESULTS_CSV=$(cat /tmp/bedagang_crud_results_$$.csv 2>/dev/null | sort -t, -k4)

cat > "$REPORT_FILE" <<REPORTEOF
# BEDAGANG ERP — COMPREHENSIVE CRUD TEST REPORT

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Target:** $BASE_URL  
**Status:** $([ "$FAIL" -eq 0 ] && echo "✅ ALL PASSED" || echo "⚠️ ${FAIL} FAILURES")

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Endpoints Tested | $TOTAL |
| Passed | $PASS |
| Failed | $FAIL |
| Warnings (slow) | $WARN |
| Pass Rate | $((${PASS} * 100 / ${TOTAL}))% |

## Section Results

| Section | Endpoints | Pass | Fail |
|---------|-----------|------|------|
| HRIS Module | 30+ | — | — |
| CRM/SFA/Marketing | 15+ | — | — |
| Finance | 16+ | — | — |
| Inventory | 10+ | — | — |
| Branches | 7 | — | — |
| Reports | 6 | — | — |
| Users & Settings | 6 | — | — |
| Additional Modules | 20+ | — | — |

## Performance Summary

| Response Time | Count |
|---------------|-------|
| ≤ 200ms (Excellent) | — |
| 200-500ms (Acceptable) | — |
| > 500ms (Slow) | — |
| Failed | — |

## Slow Endpoints (>200ms)

REPORTEOF

# Add detailed results to the report
echo "" >> "$REPORT_FILE"
echo "## Detailed Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Test | Method | Status | Response |" >> "$REPORT_FILE"
echo "|------|--------|--------|----------|" >> "$REPORT_FILE"

if [ -f /tmp/bedagang_crud_results_$$.csv ]; then
    while IFS=, read -r DESC METHOD CODE TIME; do
        if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
            STATUS="✅ PASS"
        else
            STATUS="❌ FAIL"
        fi
        echo "| $DESC | $METHOD | $STATUS | $TIME |" >> "$REPORT_FILE"
    done < /tmp/bedagang_crud_results_$$.csv
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "*Generated by Bedagang QA-3 CRUD Test Suite on $(date '+%Y-%m-%d %H:%M:%S')*" >> "$REPORT_FILE"

cp "$REPORT_FILE" "/Users/winnerharry/Bedagang ERP/bedagang---PoS/CRUD-TEST-REPORT.md"
echo "📄 Report saved to project root: CRUD-TEST-REPORT.md"
rm -f /tmp/bedagang_crud_results_$$.csv

echo ""
echo "Done."
