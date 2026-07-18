/**
 * Humanify SaaS Phase 7 — email verification (token + optional SMTP)
 */
import crypto from 'crypto';
import { parseTenantSettings } from './tenant-schema';
import { getTenantColumns } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureEmailVerifyTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_email_verifications (
      id UUID PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      tenant_id UUID,
      email VARCHAR(255) NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_email_verify_user
    ON saas_email_verifications (user_id)
  `);
  ready = true;
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function createEmailVerification(opts: {
  userId: string | number;
  tenantId?: string | null;
  email: string;
  baseUrl?: string;
}): Promise<{ token: string; verifyUrl: string; emailed: boolean }> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureEmailVerifyTable();

  const token = crypto.randomBytes(24).toString('base64url');
  const id = crypto.randomUUID();
  await sequelize.query(`
    INSERT INTO saas_email_verifications
      (id, user_id, tenant_id, email, token_hash, expires_at)
    VALUES
      (:id, :uid, :tid, :email, :hash, NOW() + INTERVAL '48 hours')
  `, {
    replacements: {
      id,
      uid: String(opts.userId),
      tid: opts.tenantId || null,
      email: opts.email.toLowerCase(),
      hash: hashToken(token),
    },
  });

  const base = (opts.baseUrl || process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const verifyUrl = `${base}/humanify/verify-email?token=${encodeURIComponent(token)}`;

  let emailed = false;
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const { sendEmail } = await import('../email/sender');
      const { humanifyVerifyEmail } = await import('../email/humanify-mails');
      const mail = humanifyVerifyEmail({ verifyUrl });
      emailed = await sendEmail({
        to: opts.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    } catch (e: any) {
      console.warn('[email-verify] SMTP send failed:', e?.message);
    }
  }

  return { token, verifyUrl, emailed };
}

export async function verifyEmailToken(rawToken: string): Promise<{
  email: string;
  userId: string;
  tenantId: string | null;
}> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureEmailVerifyTable();
  const hash = hashToken(String(rawToken || ''));
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_email_verifications
    WHERE token_hash = :hash
      AND verified_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `, { replacements: { hash } });
  const row = rows?.[0];
  if (!row) throw new Error('Token tidak valid atau sudah kedaluwarsa');

  await sequelize.query(`
    UPDATE saas_email_verifications
    SET verified_at = NOW()
    WHERE id = :id
  `, { replacements: { id: row.id } });

  // Persist flag on tenant.settings
  if (row.tenant_id) {
    try {
      const cols = await getTenantColumns();
      if (cols.has('settings')) {
        const [trows] = await sequelize.query(
          `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
          { replacements: { id: row.tenant_id } },
        );
        const settings = parseTenantSettings(trows?.[0]?.settings);
        settings.email_verified = true;
        settings.email_verified_at = new Date().toISOString();
        settings.email_verified_by = row.email;
        await sequelize.query(
          `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
          { replacements: { id: row.tenant_id, settings: JSON.stringify(settings) } },
        );
      }
    } catch (e: any) {
      console.warn('[email-verify] settings update:', e?.message);
    }
  }

  return {
    email: row.email,
    userId: String(row.user_id),
    tenantId: row.tenant_id || null,
  };
}

export async function isTenantEmailVerified(tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId || !sequelize) return true;
  try {
    const cols = await getTenantColumns();
    if (!cols.has('settings')) return true;
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    const settings = parseTenantSettings(rows?.[0]?.settings);
    if (settings.email_verified === true) return true;

    await ensureEmailVerifyTable();
    const [vr] = await sequelize.query(`
      SELECT 1 FROM saas_email_verifications
      WHERE tenant_id = :tid AND verified_at IS NOT NULL
      LIMIT 1
    `, { replacements: { tid: tenantId } });
    return Boolean(vr?.length);
  } catch {
    return true;
  }
}
