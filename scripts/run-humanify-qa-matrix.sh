#!/usr/bin/env bash
# Humanify QA Matrix — maps formal test types → runnable suites (staging preferred).
#
# Usage:
#   SMOKE_BASE_URL=https://staging.humanify.id \
#   SMOKE_EMAIL=… SMOKE_PASSWORD=… \
#   VPS_PASS='…' \   # loads DEALLS_WEBHOOK_SECRET from matching VPS .env
#   bash scripts/run-humanify-qa-matrix.sh
#
# Types covered: Smoke, Sanity, Regression, Retest, E2E, API, UI, DB, Exploratory, Ad-hoc
set -uo pipefail

BASE="${SMOKE_BASE_URL:-https://staging.humanify.id}"
export SMOKE_BASE_URL="$BASE"
export SMOKE_EMAIL="${SMOKE_EMAIL:-superadmin@humanify.id}"
export SMOKE_PASSWORD="${SMOKE_PASSWORD:-superadmin123}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$BASE}"
export HUMANIFY_E2E_EMAIL="${HUMANIFY_E2E_EMAIL:-$SMOKE_EMAIL}"
export HUMANIFY_E2E_PASSWORD="${HUMANIFY_E2E_PASSWORD:-$SMOKE_PASSWORD}"
export HUMANIFY_E2E_HARD="${HUMANIFY_E2E_HARD:-1}"
export HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN=true
export HUMANIFY_INVITE_RETURN_TOKEN=true
export HUMANIFY_PASSWORD_RESET_RETURN_TOKEN=true
# Prefer SSHPASS for sshpass -e (passwords containing '%' break sshpass -p)
if [ -n "${VPS_PASS:-}" ] && [ -z "${SSHPASS:-}" ]; then
  export SSHPASS="$VPS_PASS"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REPORT="${HUMANIFY_QA_REPORT:-/tmp/humanify-qa-matrix-report.jsonl}"
: > "$REPORT"

echo "════════════════════════════════════════════════════════"
echo " Humanify QA Matrix — $BASE"
echo " Report: $REPORT"
echo "════════════════════════════════════════════════════════"

pass=0; fail=0
run() {
  local type="$1" label="$2" cmd="$3"
  echo ""
  echo "── [$type] $label ──"
  local start=$(date +%s)
  local status="PASS" exitc=0
  if eval "$cmd" > "/tmp/hf-qa-${type}-${label//[^a-zA-Z0-9]/_}.log" 2>&1; then
    echo "  [ PASS ] $type · $label"
    pass=$((pass+1))
  else
    exitc=$?
    status="FAIL"
    echo "  [ FAIL ] $type · $label (exit $exitc)"
    fail=$((fail+1))
    tail -8 "/tmp/hf-qa-${type}-${label//[^a-zA-Z0-9]/_}.log" | sed 's/^/    /'
  fi
  local end=$(date +%s)
  printf '{"type":"%s","label":"%s","status":"%s","exit":%s,"seconds":%s,"at":"%s"}\n' \
    "$type" "$label" "$status" "$exitc" "$((end-start))" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT"
}

# ─── Smoke ───
run Smoke health "curl -fsS -m 15 '$BASE/api/health?deep=1' | grep -q '\"status\":\"ok\"'"
run Smoke page-crawl "node scripts/smoke-test-humanify-page-crawl.js"
run Smoke dashboard "node scripts/smoke-test-humanify-dashboard.js"
run Smoke scorecard "npm run security:scorecard"

# ─── Sanity ───
run Sanity payroll-golden "npm run smoke:payroll-golden"
run Sanity payroll-module "node scripts/smoke-test-humanify-payroll.js"
run Sanity attendance "node scripts/smoke-test-humanify-attendance.js"
run Sanity employees-create "node -e \"
const BASE=process.env.SMOKE_BASE_URL; const EMAIL=process.env.SMOKE_EMAIL; const PASS=process.env.SMOKE_PASSWORD;
(async()=>{
  const csrfRes=await fetch(BASE+'/api/auth/csrf'); const {csrfToken}=await csrfRes.json();
  const csrfCookie=(csrfRes.headers.getSetCookie?.()||[]).find(c=>c.includes('csrf'))?.split(';')[0]||'';
  const loginRes=await fetch(BASE+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:csrfCookie},body:new URLSearchParams({csrfToken,email:EMAIL,password:PASS,json:'true'}),redirect:'manual'});
  const cookies=(loginRes.headers.getSetCookie?.()||[]).filter(c=>c.includes('next-auth')).map(c=>c.split(';')[0]);
  if(csrfCookie) cookies.push(csrfCookie); const COOKIE=cookies.join('; ');
  const stamp=Date.now().toString(36);
  const res=await fetch(BASE+'/api/humanify/employee-profile?action=create',{method:'POST',headers:{Cookie:COOKIE,'Content-Type':'application/json'},body:JSON.stringify({name:'Sanity '+stamp,email:'sanity-'+stamp+'@contoh.test',department:'Finance',position:'Staff',work_location:'ADMIN_OFFICE'})});
  const j=await res.json(); if(res.status!==201||!j.success) throw new Error(j.error||('HTTP '+res.status));
  console.log('ok', j.message);
})().catch(e=>{console.error(e); process.exit(1);});
\""

# ─── Regression ───
run Regression full-qa "bash scripts/run-humanify-full-qa.sh"
run Regression hris-full "node scripts/smoke-test-hris-full.js"
run Regression vps-comprehensive "node scripts/smoke-test-humanify-vps.js"
run Regression kpi "node scripts/smoke-test-humanify-kpi-performance-engagement.js"
run Regression recruitment "node scripts/smoke-test-humanify-recruitment-training.js"
run Regression ops-hr "node scripts/smoke-test-humanify-ops-hr.js"

# ─── Retest (previously failing areas) ───
run Retest leave-create "node -e \"
const BASE=process.env.SMOKE_BASE_URL; const EMAIL=process.env.SMOKE_EMAIL; const PASS=process.env.SMOKE_PASSWORD;
(async()=>{
  const csrfRes=await fetch(BASE+'/api/auth/csrf'); const {csrfToken}=await csrfRes.json();
  const csrfCookie=(csrfRes.headers.getSetCookie?.()||[]).find(c=>c.includes('csrf'))?.split(';')[0]||'';
  const loginRes=await fetch(BASE+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:csrfCookie},body:new URLSearchParams({csrfToken,email:EMAIL,password:PASS,json:'true'}),redirect:'manual'});
  const cookies=(loginRes.headers.getSetCookie?.()||[]).filter(c=>c.includes('next-auth')).map(c=>c.split(';')[0]);
  if(csrfCookie) cookies.push(csrfCookie); const COOKIE=cookies.join('; ');
  const d=new Date(); d.setDate(d.getDate()+((d.getDay()===5)?3:(d.getDay()===6)?2:1));
  const start=d.toISOString().slice(0,10); d.setDate(d.getDate()+1); const end=d.toISOString().slice(0,10);
  const res=await fetch(BASE+'/api/employee/dashboard?action=leave-request',{method:'POST',headers:{Cookie:COOKIE,'Content-Type':'application/json'},body:JSON.stringify({leaveType:'annual',startDate:start,endDate:end,reason:'QA retest leave'})});
  const j=await res.json(); if(!(res.status<300 && j.success)) throw new Error((j.error||'')+' '+(j.details||'')+' HTTP '+res.status);
  console.log('leave ok', j.message);
})().catch(e=>{console.error(e); process.exit(1);});
\""
run Retest ir-incident "node scripts/smoke-test-ir-disciplinary-integration.js"
run Retest employee-portal "node scripts/smoke-test-employee-portal-full.js"

# ─── E2E / UI ───
run E2E soft-ui "npx playwright test e2e/humanify-welcome-login.spec.ts e2e/humanify-signup-ui.spec.ts e2e/humanify-payroll-ui.spec.ts e2e/humanify-hr-auth-gate-ui.spec.ts e2e/humanify-ops-auth-gate-ui.spec.ts --reporter=line"
run E2E hard-payroll "npx playwright test e2e/humanify-payroll-hard.spec.ts --reporter=line"
run UI auth-pages-buttons "npx playwright test e2e/humanify-authenticated-ui-smoke.spec.ts --reporter=line"

# ─── API ───
run API payroll-depth "node scripts/smoke-test-saas-payroll-depth.js"
run API idor-batch10 "node scripts/smoke-test-saas-idor-batch10.js"
run API mock-guard "npm run smoke:mock-guard"

# ─── Database ───
run Database rls-lab-unit "npm run smoke:rls-lab"
run Database db-probe "node -e \"
const BASE=process.env.SMOKE_BASE_URL; const EMAIL=process.env.SMOKE_EMAIL; const PASS=process.env.SMOKE_PASSWORD;
(async()=>{
  const csrfRes=await fetch(BASE+'/api/auth/csrf'); const {csrfToken}=await csrfRes.json();
  const csrfCookie=(csrfRes.headers.getSetCookie?.()||[]).find(c=>c.includes('csrf'))?.split(';')[0]||'';
  const loginRes=await fetch(BASE+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:csrfCookie},body:new URLSearchParams({csrfToken,email:EMAIL,password:PASS,json:'true'}),redirect:'manual'});
  const cookies=(loginRes.headers.getSetCookie?.()||[]).filter(c=>c.includes('next-auth')).map(c=>c.split(';')[0]);
  if(csrfCookie) cookies.push(csrfCookie); const COOKIE=cookies.join('; ');
  const health=await (await fetch(BASE+'/api/health?deep=1')).json();
  if(health.status!=='ok') throw new Error('health not ok');
  const emp=await (await fetch(BASE+'/api/humanify/employee-profile?action=list&limit=5',{headers:{Cookie:COOKIE}})).json();
  if(!Array.isArray(emp.data)) throw new Error('employees list not array');
  console.log('db-ok employees', emp.data.length, 'health', health.status);
})().catch(e=>{console.error(e); process.exit(1);});
\""

# ─── Exploratory / Ad-hoc ───
run Exploratory enterprise "node scripts/smoke-test-humanify-enterprise.js"
run AdHoc random-module-gets "node -e \"
const BASE=process.env.SMOKE_BASE_URL; const EMAIL=process.env.SMOKE_EMAIL; const PASS=process.env.SMOKE_PASSWORD;
const paths=['/api/humanify/dashboard','/api/humanify/payroll','/api/humanify/attendance-management?action=overview','/api/humanify/leave','/api/humanify/recruitment','/api/humanify/performance','/api/humanify/organization','/api/humanify/billing','/api/humanify/industrial-relations?action=overview','/api/humanify/training'];
(async()=>{
  const csrfRes=await fetch(BASE+'/api/auth/csrf'); const {csrfToken}=await csrfRes.json();
  const csrfCookie=(csrfRes.headers.getSetCookie?.()||[]).find(c=>c.includes('csrf'))?.split(';')[0]||'';
  const loginRes=await fetch(BASE+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:csrfCookie},body:new URLSearchParams({csrfToken,email:EMAIL,password:PASS,json:'true'}),redirect:'manual'});
  const cookies=(loginRes.headers.getSetCookie?.()||[]).filter(c=>c.includes('next-auth')).map(c=>c.split(';')[0]);
  if(csrfCookie) cookies.push(csrfCookie); const COOKIE=cookies.join('; ');
  let bad=0;
  for (const p of paths) {
    const res=await fetch(BASE+p,{headers:{Cookie:COOKIE}});
    if(res.status>=500){ console.error('5xx', p, res.status); bad++; }
    else console.log('ok', p, res.status);
  }
  if(bad) process.exit(1);
})().catch(e=>{console.error(e); process.exit(1);});
\""

echo ""
echo "════════════════════════════════════════════════════════"
echo " QA MATRIX DONE — $pass passed / $fail failed"
echo " Report JSONL: $REPORT"
echo "════════════════════════════════════════════════════════"
exit $([ "$fail" = "0" ] && echo 0 || echo 1)
