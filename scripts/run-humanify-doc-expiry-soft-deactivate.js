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

const APPLY = process.env.APPLY === 'true';
const TENANT_ID = process.env.TENANT_ID || '';

async function main() {
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
    process.exit(0);
  }

  if (!n) {
    console.log('Nothing to update.');
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
