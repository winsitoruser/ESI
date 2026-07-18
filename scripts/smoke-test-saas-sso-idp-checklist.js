#!/usr/bin/env node
/**
 * SSO IdP readiness checklist + QC report (no customer IdP required).
 * Validates SP surfaces + synthetic ACS gate prerequisites + runbook presence.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-sso-idp-checklist.js
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const SLUG = process.env.SMOKE_SSO_SLUG || 'demo';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function main() {
  console.log('SSO IdP readiness checklist + QC report');
  console.log('Target:', BASE);

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    slug: SLUG,
    checks: {},
    customerIdpQc: 'blocked_without_credentials',
    runbook: 'docs/humanify-sso-idp-runbook.md',
  };

  const meta = await fetch(`${BASE}/api/humanify/sso/metadata?slug=${encodeURIComponent(SLUG)}`);
  const metaText = await meta.text();
  if (meta.status === 200 && /EntityDescriptor/i.test(metaText)) {
    ok(`metadata XML (${SLUG})`);
    report.checks.metadata = { ok: true, status: meta.status };
  } else if (meta.status === 404 || meta.status === 400) {
    ok(`metadata soft (${meta.status}) — tenant may lack SSO config`);
    report.checks.metadata = { ok: true, soft: true, status: meta.status };
  } else {
    fail('metadata', `HTTP ${meta.status}`);
    report.checks.metadata = { ok: false, status: meta.status };
  }

  const acs = await fetch(`${BASE}/api/humanify/sso/acs`, { method: 'POST', redirect: 'manual' });
  if (acs.status < 500) {
    ok(`ACS reachable (${acs.status})`);
    report.checks.acs = { ok: true, status: acs.status };
  } else {
    fail('ACS', `HTTP ${acs.status}`);
    report.checks.acs = { ok: false, status: acs.status };
  }

  const login = await fetch(`${BASE}/api/humanify/sso/login?slug=${encodeURIComponent(SLUG)}`, { redirect: 'manual' });
  if ([302, 303, 307, 400, 403, 404].includes(login.status)) {
    ok(`login init (${login.status})`);
    report.checks.loginInit = { ok: true, status: login.status };
  } else if (login.status < 500) {
    ok(`login init soft (${login.status})`);
    report.checks.loginInit = { ok: true, soft: true, status: login.status };
  } else {
    fail('login init', `HTTP ${login.status}`);
    report.checks.loginInit = { ok: false, status: login.status };
  }

  const health = await fetch(`${BASE}/api/health`);
  const hj = await health.json().catch(() => ({}));
  if (health.ok && hj.status === 'ok') {
    ok('platform health');
    report.checks.health = { ok: true };
  } else {
    fail('health', JSON.stringify(hj).slice(0, 80));
    report.checks.health = { ok: false };
  }

  // SSO settings page (HTML) — soft
  const ssoPage = await fetch(`${BASE}/humanify/sso`, { redirect: 'manual' });
  if ([200, 302, 303, 307].includes(ssoPage.status)) {
    ok(`SSO UI route (${ssoPage.status})`);
    report.checks.ssoUi = { ok: true, status: ssoPage.status };
  } else if (ssoPage.status < 500) {
    ok(`SSO UI soft (${ssoPage.status})`);
    report.checks.ssoUi = { ok: true, soft: true, status: ssoPage.status };
  } else {
    fail('SSO UI', `HTTP ${ssoPage.status}`);
    report.checks.ssoUi = { ok: false, status: ssoPage.status };
  }

  // Local runbook gate (when executed from repo)
  const runbookPath = path.join(__dirname, '..', 'docs', 'humanify-sso-idp-runbook.md');
  if (fs.existsSync(runbookPath)) {
    const txt = fs.readFileSync(runbookPath, 'utf8');
    const hasOkta = /Okta/i.test(txt);
    const hasAzure = /Azure/i.test(txt);
    const hasAcs = /acs/i.test(txt);
    if (hasOkta && hasAzure && hasAcs) {
      ok('runbook covers Okta + Azure + ACS');
      report.checks.runbook = { ok: true };
    } else {
      fail('runbook incomplete');
      report.checks.runbook = { ok: false };
    }
  } else {
    ok('runbook path skip (not in repo cwd)');
    report.checks.runbook = { ok: true, skipped: true };
  }

  console.log('');
  console.log('Manual customer IdP QC (blocked without credentials):');
  console.log('  → docs/humanify-sso-idp-runbook.md');
  console.log('  → Okta / Azure AD / Google Workspace — 1 QC tenant each');
  console.log('  → After real IdP QC, set HUMANIFY_SSO_IDP_QC_DONE=true on VPS');
  console.log('');
  console.log('QC_REPORT_JSON=' + JSON.stringify(report));
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
