#!/usr/bin/env node
/**
 * Cron: scan Humanify HR automation rules (all active tenants).
 * Hits local PM2 by default (HR_AUTOMATION_SCAN_URL / 127.0.0.1:3020).
 *
 *   node scripts/run-humanify-hr-automation-scan.js
 *   DRY_RUN=true node scripts/run-humanify-hr-automation-scan.js
 *   FORCE=true TENANT_ID=<uuid> node scripts/run-humanify-hr-automation-scan.js
 *
 * Cron: every 6h via ensure-humanify-crons.sh (tag hr-automation-scan)
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

const fs = require('fs');
const path = require('path');

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const FORCE = String(process.env.FORCE || '').toLowerCase() === 'true';
const TENANT_ID = process.env.TENANT_ID || '';
const SEED_ONLY = String(process.env.SEED_ONLY || '').toLowerCase() === 'true';

function writeLast(summary) {
  const file =
    process.env.HR_AUTOMATION_LAST_PATH ||
    path.join(
      process.env.HUMANIFY_STATE_DIR ||
        (fs.existsSync('/var/lib/humanify') ? '/var/lib/humanify' : path.join(process.cwd(), 'artifacts')),
      'hr-automation-scan-last.json',
    );
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`[hr-automation] wrote ${file}`);
  } catch (e) {
    console.warn('[hr-automation] write last-run failed:', e.message || e);
  }
}

async function main() {
  if (SEED_ONLY) {
    writeLast({ at: new Date().toISOString(), seed: true, tenants: 0, triggered: 0, notified: 0 });
    console.log('[hr-automation] SEED_ONLY — wrote last-run without HTTP');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('[hr-automation] DRY_RUN — would POST /api/platform/hr-automation-scan', {
      force: FORCE,
      tenantId: TENANT_ID || null,
    });
    writeLast({ at: new Date().toISOString(), dryRun: true, force: FORCE });
    process.exit(0);
  }

  const base =
    process.env.HR_AUTOMATION_SCAN_URL ||
    process.env.OBS_ALERT_CHECK_URL ||
    'http://127.0.0.1:3020';
  const secret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
  const url = `${String(base).replace(/\/$/, '')}/api/platform/hr-automation-scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: JSON.stringify({
      source: 'cron',
      force: FORCE,
      ...(TENANT_ID ? { tenantId: TENANT_ID } : {}),
    }),
  });
  const j = await res.json().catch(() => ({}));
  const summary = {
    at: new Date().toISOString(),
    status: res.status,
    tenants: j?.data?.tenants,
    scanned: j?.data?.scanned,
    triggered: j?.data?.triggered,
    notified: j?.data?.notified,
  };
  console.log(JSON.stringify({ ...summary, ok: j?.success }));
  writeLast(summary);
  if (!res.ok || !j.success) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
