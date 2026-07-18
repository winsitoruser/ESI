#!/usr/bin/env node
/**
 * SSO IdP readiness checklist (no customer IdP required).
 * Validates SP surfaces + synthetic ACS gate prerequisites.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-sso-idp-checklist.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const SLUG = process.env.SMOKE_SSO_SLUG || 'demo';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function main() {
  console.log('SSO IdP readiness checklist');
  console.log('Target:', BASE);

  const meta = await fetch(`${BASE}/api/humanify/sso/metadata?slug=${encodeURIComponent(SLUG)}`);
  const metaText = await meta.text();
  if (meta.status === 200 && /EntityDescriptor/i.test(metaText)) ok(`metadata XML (${SLUG})`);
  else if (meta.status === 404 || meta.status === 400) ok(`metadata soft (${meta.status}) — tenant may lack SSO config`);
  else fail('metadata', `HTTP ${meta.status}`);

  const acs = await fetch(`${BASE}/api/humanify/sso/acs`, { method: 'POST', redirect: 'manual' });
  // ACS without SAMLResponse should not 500
  if (acs.status < 500) ok(`ACS reachable (${acs.status})`);
  else fail('ACS', `HTTP ${acs.status}`);

  const login = await fetch(`${BASE}/api/humanify/sso/login?slug=${encodeURIComponent(SLUG)}`, { redirect: 'manual' });
  if ([302, 303, 307, 400, 403, 404].includes(login.status)) ok(`login init (${login.status})`);
  else if (login.status < 500) ok(`login init soft (${login.status})`);
  else fail('login init', `HTTP ${login.status}`);

  const health = await fetch(`${BASE}/api/health`);
  const hj = await health.json().catch(() => ({}));
  if (health.ok && hj.status === 'ok') ok('platform health');
  else fail('health', JSON.stringify(hj).slice(0, 80));

  console.log('');
  console.log('Manual customer IdP QC (blocked without credentials):');
  console.log('  → docs/humanify-sso-idp-runbook.md');
  console.log('  → Okta / Azure AD / Google Workspace — 1 QC tenant each');
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
