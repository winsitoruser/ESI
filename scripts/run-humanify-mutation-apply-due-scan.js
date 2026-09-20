#!/usr/bin/env node
/**
 * Cron: apply approved mutations whose effective_date is due.
 *
 *   node scripts/run-humanify-mutation-apply-due-scan.js
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
    process.env.MUTATION_APPLY_DUE_LAST_PATH ||
    path.join(
      process.env.HUMANIFY_STATE_DIR ||
        (fs.existsSync('/var/lib/humanify') ? '/var/lib/humanify' : path.join(process.cwd(), 'artifacts')),
      'mutation-apply-due-scan-last.json',
    );
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`[mutation-apply-due] wrote ${file}`);
  } catch (e) {
    console.warn('[mutation-apply-due] write last-run failed:', e.message || e);
  }
}

async function main() {
  if (SEED_ONLY) {
    writeLast({ at: new Date().toISOString(), seed: true, applied: 0 });
    console.log('[mutation-apply-due] SEED_ONLY');
    process.exit(0);
  }
  if (DRY_RUN) {
    console.log('[mutation-apply-due] DRY_RUN — would POST /api/platform/mutation-apply-due-scan');
    writeLast({ at: new Date().toISOString(), dryRun: true });
    process.exit(0);
  }

  const base =
    process.env.MUTATION_APPLY_DUE_SCAN_URL ||
    process.env.LEAVE_ESCALATION_SCAN_URL ||
    process.env.OBS_ALERT_CHECK_URL ||
    'http://127.0.0.1:3020';
  const secret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
  const url = `${String(base).replace(/\/$/, '')}/api/platform/mutation-apply-due-scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: JSON.stringify(TENANT_ID ? { tenantId: TENANT_ID } : {}),
  });
  const json = await res.json().catch(() => ({}));
  writeLast({ at: new Date().toISOString(), http: res.status, ...json });
  if (!res.ok || !json.success) {
    console.error('[mutation-apply-due] failed', res.status, json);
    process.exit(1);
  }
  console.log('[mutation-apply-due] ok', json.data);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
