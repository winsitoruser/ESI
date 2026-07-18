#!/usr/bin/env node
/**
 * Dry-run report: employee documents past expiry or expiring soon.
 * Does NOT delete files. Optional Discord summary via OBS_ALERT_WEBHOOK_URL.
 *
 * Usage:
 *   node scripts/run-humanify-doc-expiry-report.js
 *   TENANT_ID=<uuid> EXPIRY_LOOKAHEAD_DAYS=14 node scripts/run-humanify-doc-expiry-report.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const LOOKAHEAD = Math.max(1, Number(process.env.EXPIRY_LOOKAHEAD_DAYS || 30) || 30);
const TENANT_ID = process.env.TENANT_ID || null;
const SAMPLE = Math.min(50, Number(process.env.SAMPLE_LIMIT || 50) || 50);

async function main() {
  let sequelize;
  try {
    sequelize = require('../lib/sequelize');
  } catch (e) {
    console.error('Sequelize unavailable:', e.message);
    process.exit(1);
  }
  if (!sequelize) {
    console.error('No DB connection');
    process.exit(1);
  }

  const tenantClause = TENANT_ID ? 'AND tenant_id = :tenantId' : '';
  const replacements = {
    lookahead: LOOKAHEAD,
    tenantId: TENANT_ID,
    limit: SAMPLE,
  };

  try {
    const [counts] = await sequelize.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE)::int AS expired,
        COUNT(*) FILTER (
          WHERE expiry_date >= CURRENT_DATE
            AND expiry_date <= CURRENT_DATE + (:lookahead || ' days')::interval
        )::int AS soon,
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL)::int AS with_expiry
      FROM employee_documents
      WHERE COALESCE(is_active, true) = true
        ${tenantClause}
      `,
      { replacements },
    );
    const c = counts?.[0] || { expired: 0, soon: 0, with_expiry: 0 };
    console.log('Humanify document expiry report');
    console.log(`Lookahead: ${LOOKAHEAD} days${TENANT_ID ? ` · tenant ${TENANT_ID}` : ''}`);
    console.log(`With expiry: ${c.with_expiry} · Expired: ${c.expired} · Soon: ${c.soon}`);

    const [rows] = await sequelize.query(
      `
      SELECT id, tenant_id, employee_id, document_type, title, expiry_date,
             CASE WHEN expiry_date < CURRENT_DATE THEN 'expired' ELSE 'soon' END AS bucket
      FROM employee_documents
      WHERE COALESCE(is_active, true) = true
        AND expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE + (:lookahead || ' days')::interval
        ${tenantClause}
      ORDER BY expiry_date ASC
      LIMIT :limit
      `,
      { replacements },
    );

    if (!rows?.length) {
      console.log('No expired / soon-expiring documents.');
    } else {
      console.log(`Sample (${rows.length}):`);
      for (const r of rows) {
        console.log(
          `  [${r.bucket}] ${r.expiry_date} · ${r.document_type} · ${r.title} · emp=${r.employee_id}`,
        );
      }
    }

    const webhook = process.env.OBS_ALERT_WEBHOOK_URL;
    if (webhook && (c.expired > 0 || c.soon > 0)) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📄 Humanify doc expiry: **${c.expired}** expired, **${c.soon}** within ${LOOKAHEAD}d (active docs with expiry=${c.with_expiry})`,
          }),
        });
        console.log('Discord summary sent');
      } catch (e) {
        console.warn('Discord post failed:', e.message);
      }
    }

    process.exit(0);
  } catch (e) {
    if (/employee_documents/i.test(String(e.message))) {
      console.log('Table employee_documents not found — nothing to report.');
      process.exit(0);
    }
    console.error(e.message || e);
    process.exit(1);
  } finally {
    try { await sequelize.close?.(); } catch { /* */ }
  }
}

main();
