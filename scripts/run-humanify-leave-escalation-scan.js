#!/usr/bin/env node
/**
 * Cron: escalate stale leave approvals (escalation_hours).
 *
 *   node scripts/run-humanify-leave-escalation-scan.js
 *   DRY_RUN=true | SEED_ONLY=true | TENANT_ID=<uuid>
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

const fs = require('fs');
const path = require('path');

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const SEED_ONLY = String(process.env.SEED_ONLY || '').toLowerCase() === 'true';
const TENANT_ID = process.env.TENANT_ID || '';

function writeLast(summary) {
  const file =
    process.env.LEAVE_ESCALATION_LAST_PATH ||
    path.join(
      process.env.HUMANIFY_STATE_DIR ||
        (fs.existsSync('/var/lib/humanify') ? '/var/lib/humanify' : path.join(process.cwd(), 'artifacts')),
      'leave-escalation-scan-last.json',
    );
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`[leave-escalation] wrote ${file}`);
  } catch (e) {
    console.warn('[leave-escalation] write last-run failed:', e.message || e);
  }
}

async function main() {
  if (SEED_ONLY) {
    writeLast({ at: new Date().toISOString(), seed: true, escalated: 0 });
    console.log('[leave-escalation] SEED_ONLY');
    process.exit(0);
  }
  if (DRY_RUN) {
    console.log('[leave-escalation] DRY_RUN — would POST /api/platform/leave-escalation-scan');
    writeLast({ at: new Date().toISOString(), dryRun: true });
    process.exit(0);
  }

  const base =
    process.env.LEAVE_ESCALATION_SCAN_URL ||
    process.env.HR_AUTOMATION_SCAN_URL ||
    process.env.OBS_ALERT_CHECK_URL ||
    'http://127.0.0.1:3020';
  const secret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
  const url = `${String(base).replace(/\/$/, '')}/api/platform/leave-escalation-scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: JSON.stringify({
      source: 'cron',
      ...(TENANT_ID ? { tenantId: TENANT_ID } : {}),
    }),
  });
  const j = await res.json().catch(() => ({}));
  const summary = {
    at: new Date().toISOString(),
    status: res.status,
    tenants: j?.data?.tenants,
    checked: j?.data?.checked,
    escalated: j?.data?.escalated,
  };
  console.log(JSON.stringify({ ...summary, ok: j?.success }));
  writeLast(summary);
  if (!res.ok || !j.success) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
