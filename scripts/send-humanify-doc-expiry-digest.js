#!/usr/bin/env node
/**
 * Weekly digest: employee documents expired or expiring soon.
 *
 * Usage:
 *   DIGEST_TO=ops@humanify.id node scripts/send-humanify-doc-expiry-digest.js
 *   DRY_RUN=true node scripts/send-humanify-doc-expiry-digest.js
 *
 * Cron: Mon 01:30 UTC (08:30 WIB) via ensure-humanify-crons.sh
 */
require('dotenv').config();

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const DIGEST_TO = process.env.DIGEST_TO || process.env.OBS_ALERT_EMAIL || process.env.SMTP_FROM || '';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LOOKAHEAD = Math.max(1, Number(process.env.EXPIRY_LOOKAHEAD_DAYS || 30) || 30);
const BASE = (process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://humanify.id').replace(/\/$/, '');

if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

function escape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function expiryCounts(sequelize, tenantId) {
  const replacements = { tenantId, lookahead: LOOKAHEAD };
  try {
    const [rows] = await sequelize.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE)::int AS expired,
        COUNT(*) FILTER (
          WHERE expiry_date >= CURRENT_DATE
            AND expiry_date <= CURRENT_DATE + (:lookahead || ' days')::interval
        )::int AS soon
      FROM employee_documents
      WHERE tenant_id = :tenantId
        AND COALESCE(is_active, true) = true
        AND expiry_date IS NOT NULL
      `,
      { replacements },
    );
    const c = rows?.[0] || { expired: 0, soon: 0 };
    return { expired: c.expired || 0, soon: c.soon || 0, total: (c.expired || 0) + (c.soon || 0) };
  } catch {
    return { expired: 0, soon: 0, total: 0 };
  }
}

async function sampleRows(sequelize, tenantId) {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT document_type, title, expiry_date,
             CASE WHEN expiry_date < CURRENT_DATE THEN 'expired' ELSE 'soon' END AS bucket
      FROM employee_documents
      WHERE tenant_id = :tenantId
        AND COALESCE(is_active, true) = true
        AND expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE + (:lookahead || ' days')::interval
      ORDER BY expiry_date ASC
      LIMIT 8
      `,
      { replacements: { tenantId, lookahead: LOOKAHEAD } },
    );
    return rows || [];
  } catch {
    return [];
  }
}

async function main() {
  console.log('Humanify doc-expiry digest');
  console.log(`Lookahead: ${LOOKAHEAD}d · DRY_RUN=${DRY_RUN}`);

  const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
        ? {}
        : { ssl: { require: true, rejectUnauthorized: false } },
  });
  await sequelize.authenticate();

  const [tenants] = await sequelize.query(`
    SELECT t.id, t.name, t.slug, t.contact_email
    FROM tenants t
    WHERE COALESCE(t.is_active, true) = true
    ORDER BY
      CASE WHEN t.slug IN ('qa-golden','demo') THEN 0 ELSE 1 END,
      t.created_at DESC
    LIMIT 80
  `);

  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch { /* */ }

  const sendEmail = async ({ to, subject, html, text }) => {
    if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn('SMTP not configured');
      return false;
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Humanify'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  };

  let sent = 0;
  for (const t of tenants || []) {
    const counts = await expiryCounts(sequelize, t.id);
    if (counts.total === 0) {
      console.log(`  · ${t.slug || t.name}: no expiry — skip`);
      continue;
    }
    const to = DIGEST_TO || t.contact_email;
    if (!to) {
      console.log(`  · ${t.slug || t.name}: no DIGEST_TO/contact_email — skip`);
      continue;
    }

    const samples = await sampleRows(sequelize, t.id);
    const sampleHtml = samples.length
      ? `<ul>${samples.map((r) =>
          `<li>[${escape(r.bucket)}] ${escape(r.expiry_date)} · ${escape(r.document_type)} · ${escape(r.title)}</li>`
        ).join('')}</ul>`
      : '';

    const subject = `[Humanify] Dokumen kedaluwarsa — ${counts.expired} expired / ${counts.soon} ≤${LOOKAHEAD}h (${t.name})`;
    const docsUrl = `${BASE}/humanify/employees`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#5b21b6;">Retensi dokumen — ${escape(t.name)}</h2>
        <p>Ringkasan dokumen karyawan dengan <code>expiry_date</code>:</p>
        <ul>
          <li>Sudah kedaluwarsa: <strong>${counts.expired}</strong></li>
          <li>Akan kedaluwarsa ≤${LOOKAHEAD} hari: <strong>${counts.soon}</strong></li>
        </ul>
        ${sampleHtml}
        <p><a href="${docsUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">Buka Karyawan / Dokumen</a></p>
        <p style="font-size:12px;color:#64748b;">Runbook: docs/humanify-doc-retention.md · Laporan: npm run report:doc-expiry</p>
      </div>`;
    const text = `${subject}\nExpired:${counts.expired} Soon:${counts.soon}\n${docsUrl}`;

    if (DRY_RUN) {
      console.log(`  [dry-run] → ${to} | ${subject}`);
    } else {
      const ok = await sendEmail({ to, subject, html, text });
      if (ok) {
        console.log(`  ✓ sent → ${to} | ${t.slug || t.name}`);
        sent++;
      } else {
        console.log(`  ✗ send failed → ${to}`);
      }
    }

    // Discord optional summary (once per tenant with findings)
    const webhook = process.env.OBS_ALERT_WEBHOOK_URL;
    if (webhook && !DRY_RUN && counts.total > 0) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📄 Doc expiry (${t.slug || t.name}): **${counts.expired}** expired, **${counts.soon}** soon (≤${LOOKAHEAD}d)`,
          }),
        });
      } catch { /* optional */ }
    }
  }

  console.log(`Done — ${sent} email(s)${DRY_RUN ? ' (dry-run)' : ''}`);
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
