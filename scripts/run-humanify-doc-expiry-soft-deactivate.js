#!/usr/bin/env node
/**
 * Soft-deactivate expired employee documents (is_active=false).
 * Default dry-run. Set APPLY=true to write.
 *
 *   node scripts/run-humanify-doc-expiry-soft-deactivate.js
 *   APPLY=true TENANT_ID=<uuid> node scripts/run-humanify-doc-expiry-soft-deactivate.js
 *
 * Does NOT delete files from disk/S3.
 */
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });

const fs = require('fs');
const path = require('path');

const APPLY = process.env.APPLY === 'true';
const TENANT_ID = process.env.TENANT_ID || '';
const SEED_ONLY = String(process.env.SEED_ONLY || '').toLowerCase() === 'true';

function writeSoftDeactivateLast(summary) {
  const file =
    process.env.SOFT_DEACTIVATE_LAST_PATH ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'soft-deactivate-last.json');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`[soft-deactivate] wrote ${file}`);
  } catch (e) {
    console.warn('[soft-deactivate] write last-run failed:', e.message || e);
  }
}

async function main() {
  if (SEED_ONLY) {
    writeSoftDeactivateLast({
      at: new Date().toISOString(),
      expiredActive: 0,
      updated: 0,
      dryRun: true,
      seed: true,
    });
    console.log('[soft-deactivate] SEED_ONLY — wrote last-run without DB');
    process.exit(0);
  }

  let sequelize;
  try {
    sequelize = require('../lib/sequelize');
  } catch (e) {
    console.error('No sequelize / DATABASE_URL');
    process.exit(1);
  }

  const whereTenant = TENANT_ID ? 'AND tenant_id = :tid' : '';
  const replacements = TENANT_ID ? { tid: TENANT_ID } : {};

  const [counts] = await sequelize.query(
    `SELECT COUNT(*)::int AS expired_active
     FROM employee_documents
     WHERE COALESCE(is_active, true) = true
       AND expiry_date IS NOT NULL
       AND expiry_date < CURRENT_DATE
       ${whereTenant}`,
    { replacements },
  );
  const n = counts?.[0]?.expired_active || 0;
  console.log('Humanify doc expiry soft-deactivate');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} · expired active docs: ${n}${TENANT_ID ? ` · tenant=${TENANT_ID}` : ''}`);

  if (!APPLY) {
    console.log('Set APPLY=true to set is_active=false on expired docs (files kept).');
    writeSoftDeactivateLast({
      at: new Date().toISOString(),
      expiredActive: n,
      updated: 0,
      dryRun: true,
    });
    process.exit(0);
  }

  if (!n) {
    console.log('Nothing to update.');
    writeSoftDeactivateLast({
      at: new Date().toISOString(),
      expiredActive: 0,
      updated: 0,
      dryRun: false,
    });
    process.exit(0);
  }

  const [, meta] = await sequelize.query(
    `UPDATE employee_documents
     SET is_active = false, updated_at = COALESCE(updated_at, NOW())
     WHERE COALESCE(is_active, true) = true
       AND expiry_date IS NOT NULL
       AND expiry_date < CURRENT_DATE
       ${whereTenant}`,
    { replacements },
  );
  const updated = Number(meta?.rowCount ?? n);
  console.log(`Updated ${updated} rows → is_active=false`);
  writeSoftDeactivateLast({
    at: new Date().toISOString(),
    expiredActive: n,
    updated,
    dryRun: false,
  });

  const webhook = process.env.OBS_ALERT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📄 Soft-deactivate: **${updated}** expired employee docs (files kept)`,
        }),
      });
    } catch { /* ignore */ }
  }
  process.exit(0);
}

main().catch((e) => {
  if (/employee_documents/i.test(String(e.message))) {
    console.log('Table employee_documents not found — nothing to do.');
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
