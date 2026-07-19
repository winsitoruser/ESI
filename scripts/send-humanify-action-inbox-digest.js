#!/usr/bin/env node
/**
 * Weekly Action Inbox digest — email HR contacts per tenant (or DIGEST_TO override).
 *
 * Usage:
 *   DIGEST_TO=ops@humanify.id node scripts/send-humanify-action-inbox-digest.js
 *   DRY_RUN=true node scripts/send-humanify-action-inbox-digest.js
 *   SEED_ONLY=true node scripts/send-humanify-action-inbox-digest.js
 *
 * Cron: Mon 01:00 UTC (08:00 WIB) via ensure-humanify-crons.sh
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const DIGEST_TO = process.env.DIGEST_TO || process.env.OBS_ALERT_EMAIL || process.env.SMTP_FROM || '';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const SEED_ONLY = String(process.env.SEED_ONLY || '').toLowerCase() === 'true';
const BASE = (process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://humanify.id').replace(/\/$/, '');

function writeDigestLast(summary) {
  const file =
    process.env.DIGEST_LAST_PATH ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'action-digest-last.json');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const payload = {
      at: summary.at,
      sent: summary.sent,
      dryRun: Boolean(summary.dryRun),
    };
    if (summary.seed) payload.seed = true;
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[digest] wrote ${file}`);
  } catch (e) {
    console.warn('[digest] write last-run failed:', e.message || e);
  }
}

if (SEED_ONLY) {
  writeDigestLast({
    at: new Date().toISOString(),
    sent: 0,
    dryRun: true,
    seed: true,
  });
  console.log('[digest] SEED_ONLY — wrote last-run without DB');
  process.exit(0);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

async function inboxCounts(sequelize, tenantId) {
  const r = { tenantId };
  const counts = { leave: 0, contract: 0, documents: 0, attendance: 0, policyAck: 0 };
  try {
    const [leave] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM leave_requests WHERE tenant_id = :tenantId AND status = 'pending'`,
      { replacements: r }
    );
    counts.leave = leave[0]?.c || 0;
  } catch { /* */ }
  try {
    const [c] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employee_contracts
       WHERE tenant_id = :tenantId AND end_date IS NOT NULL
         AND end_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND LOWER(COALESCE(status,'active')) IN ('active','expiring_soon')`,
      { replacements: r }
    );
    counts.contract = c[0]?.c || 0;
  } catch { /* */ }
  try {
    const [d] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM (
         SELECT e.id
         FROM employees e
         LEFT JOIN employee_documents ed ON ed.employee_id = e.id AND ed.tenant_id = e.tenant_id
         WHERE e.tenant_id = :tenantId AND COALESCE(e.is_active,true)=true
         GROUP BY e.id
         HAVING COUNT(DISTINCT UPPER(ed.document_type)) FILTER (WHERE UPPER(ed.document_type) IN ('KTP','NPWP','CONTRACT','KK')) < 3
       ) x`,
      { replacements: r }
    );
    counts.documents = d[0]?.c || 0;
  } catch { /* */ }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [a] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employees e
       LEFT JOIN employee_attendance ea ON ea.employee_id = e.id AND ea.date = :today AND ea.tenant_id = e.tenant_id
       LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.tenant_id = e.tenant_id
         AND lr.status = 'approved' AND :today::date BETWEEN lr.start_date AND lr.end_date
       WHERE e.tenant_id = :tenantId AND COALESCE(e.is_active,true)=true AND lr.id IS NULL
         AND (ea.id IS NULL OR LOWER(COALESCE(ea.status,'')) IN ('absent','alpha','tidak_hadir'))`,
      { replacements: { ...r, today } }
    );
    counts.attendance = a[0]?.c || 0;
  } catch { /* */ }
  try {
    const [pols] = await sequelize.query(
      `SELECT id FROM company_regulations
       WHERE tenant_id = :tenantId
         AND LOWER(COALESCE(status,'')) IN ('active','published')`,
      { replacements: r },
    );
    const policyIds = (pols || []).map((p) => p.id);
    if (policyIds.length) {
      const [users] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM users
         WHERE tenant_id = :tenantId AND COALESCE(is_active,true)=true`,
        { replacements: r },
      );
      const userCount = Number(users?.[0]?.c || 0);
      const [acks] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM policy_acknowledgments
         WHERE tenant_id = :tenantId AND regulation_id IN (:ids)`,
        { replacements: { ...r, ids: policyIds } },
      );
      counts.policyAck = Math.max(0, policyIds.length * userCount - Number(acks?.[0]?.c || 0));
    }
  } catch { /* */ }
  counts.total = counts.leave + counts.contract + counts.documents + counts.attendance + counts.policyAck;
  return counts;
}

async function main() {
  const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
        ? {}
        : { ssl: { require: true, rejectUnauthorized: false } },
  });
  await sequelize.authenticate();

  // Prefer tenants that already have pending leave / named demo seeds
  const [tenants] = await sequelize.query(`
    SELECT t.id, t.name, t.slug, t.contact_email,
      (SELECT COUNT(*)::int FROM leave_requests lr WHERE lr.tenant_id = t.id AND lr.status = 'pending') AS pending_leave
    FROM tenants t
    WHERE COALESCE(t.is_active, true) = true
    ORDER BY
      CASE WHEN t.slug IN ('qa-golden','demo') THEN 0 ELSE 1 END,
      pending_leave DESC,
      t.created_at DESC
    LIMIT 80
  `);

  // Lazy-load email — prefer nodemailer (always available on VPS)
  const nodemailer = require('nodemailer');
  const sendEmail = async ({ to, subject, html, text, cc }) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
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
      ...(cc ? { cc } : {}),
      subject,
      html,
      text,
    });
    return true;
  };

  let sent = 0;
  for (const t of tenants) {
    const counts = await inboxCounts(sequelize, t.id);
    if (counts.total === 0) {
      console.log(`  · ${t.slug || t.name}: empty inbox — skip`);
      continue;
    }
    const to = DIGEST_TO || t.contact_email;
    if (!to) {
      console.log(`  · ${t.slug || t.name}: no DIGEST_TO/contact_email — skip`);
      continue;
    }

    // Escalate: CC managers when leave backlog is material (HRM-2)
    let ccList = [];
    if (counts.leave >= 3) {
      try {
        const [mgrs] = await sequelize.query(
          `SELECT DISTINCT u.email FROM users u
           WHERE u.tenant_id = :tid
             AND LOWER(COALESCE(u.role,'')) IN ('manager','branch_manager','hq_admin','owner')
             AND COALESCE(u.is_active, true) = true
             AND u.email IS NOT NULL AND u.email <> ''
           LIMIT 8`,
          { replacements: { tid: t.id } },
        );
        ccList = (mgrs || [])
          .map((m) => String(m.email || '').toLowerCase())
          .filter((e) => e && e !== String(to).toLowerCase());
      } catch { /* optional */ }
    }

    const escalateNote = ccList.length
      ? `<p style="color:#b45309;font-size:13px;">Escalation: cuti pending ≥3 — CC manajer/admin (${ccList.length}).</p>`
      : '';
    const subject = `[Humanify] Digest mingguan — ${counts.total} aksi untuk ${t.name}`;
    const inboxUrl = `${BASE}/humanify`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#5b21b6;">Action Inbox — ${escape(t.name)}</h2>
        <p>Ringkasan mingguan yang perlu ditindaklanjuti:</p>
        <ul>
          <li>Cuti pending: <strong>${counts.leave}</strong></li>
          <li>Kontrak ≤30 hari: <strong>${counts.contract}</strong></li>
          <li>Dokumen belum lengkap: <strong>${counts.documents}</strong></li>
          <li>Absensi hari ini: <strong>${counts.attendance}</strong></li>
          <li>Policy ack pending: <strong>${counts.policyAck}</strong></li>
        </ul>
        ${escalateNote}
        <p><a href="${inboxUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">Buka Action Inbox</a></p>
      </div>`;
    const text = `${subject}\nCuti:${counts.leave} Kontrak:${counts.contract} Docs:${counts.documents} Absen:${counts.attendance} PolicyAck:${counts.policyAck}\n${inboxUrl}`;

    if (DRY_RUN) {
      console.log(`  [dry-run] → ${to}${ccList.length ? ` cc=${ccList.join(',')}` : ''} | ${subject}`);
    } else {
      const ok = await sendEmail({
        to,
        subject,
        html,
        text,
        ...(ccList.length ? { cc: ccList.join(',') } : {}),
      });
      console.log(`  ${ok ? '✓' : '✗'} ${t.slug || t.name} → ${to}${ccList.length ? ` +${ccList.length} cc` : ''} (total=${counts.total})`);
      if (ok) sent++;
    }
  }

  console.log(`Done. Sent=${sent}`);
  writeDigestLast({
    at: new Date().toISOString(),
    sent: DRY_RUN ? 0 : sent,
    dryRun: DRY_RUN,
  });
  await sequelize.close();
}

function escape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
