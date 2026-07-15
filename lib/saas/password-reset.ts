/**
 * Humanify SaaS Phase 15 — self-service password reset (token + optional SMTP)
 *
 * Non-enumerating: requestPasswordReset always resolves "success" regardless of
 * whether the email exists. A token is only created (and emailed) when a matching
 * active user is found. Tokens are single-use, hashed at rest, and expire in 1h.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const getDb = () => require('../../models');

let ready = false;

export async function ensurePasswordResetTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_password_resets (
      id UUID PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      tenant_id UUID,
      email VARCHAR(255) NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      requested_ip VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_pwreset_user
    ON saas_password_resets (user_id)
  `);
  ready = true;
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export interface RequestResetResult {
  /** Always true when the request was processed (regardless of email existence). */
  ok: true;
  emailed: boolean;
  /** Exposed only in non-prod or when email wasn't sent (dev/smoke). */
  resetUrl?: string;
  token?: string;
}

export async function requestPasswordReset(opts: {
  email: string;
  baseUrl?: string;
  requestedIp?: string | null;
}): Promise<RequestResetResult> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensurePasswordResetTable();

  const email = String(opts.email || '').trim().toLowerCase();
  const base = (opts.baseUrl || process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');

  const db = getDb();
  let user: any = null;
  try {
    user = await db.User.findOne({ where: { email } });
  } catch {
    user = null;
  }

  // No matching (or inactive) user → pretend success, no token, no email.
  if (!user || user.isActive === false) {
    return { ok: true, emailed: false };
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const id = crypto.randomUUID();

  // Invalidate previously-issued, still-valid tokens for this user.
  await sequelize.query(`
    UPDATE saas_password_resets
    SET used_at = NOW()
    WHERE user_id = :uid AND used_at IS NULL AND expires_at > NOW()
  `, { replacements: { uid: String(user.id) } });

  await sequelize.query(`
    INSERT INTO saas_password_resets
      (id, user_id, tenant_id, email, token_hash, expires_at, requested_ip)
    VALUES
      (:id, :uid, :tid, :email, :hash, NOW() + INTERVAL '1 hour', :ip)
  `, {
    replacements: {
      id,
      uid: String(user.id),
      tid: user.tenantId || null,
      email,
      hash: hashToken(token),
      ip: opts.requestedIp || null,
    },
  });

  const resetUrl = `${base}/humanify/reset-password?token=${encodeURIComponent(token)}`;

  let emailed = false;
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const { sendEmail } = await import('../email/sender');
      emailed = await sendEmail({
        to: email,
        subject: 'Reset password Humanify',
        html: `
          <p>Kami menerima permintaan reset password untuk akun Humanify Anda.</p>
          <p><a href="${resetUrl}">Klik di sini untuk membuat password baru</a></p>
          <p>Link berlaku 1 jam. Abaikan email ini jika Anda tidak meminta reset.</p>
        `,
        text: `Reset password Humanify: ${resetUrl} (berlaku 1 jam)`,
      });
    } catch (e: any) {
      console.warn('[password-reset] SMTP send failed:', e?.message);
    }
  }

  const expose =
    process.env.NODE_ENV !== 'production'
    || process.env.HUMANIFY_PASSWORD_RESET_RETURN_TOKEN === 'true'
    || !emailed;

  return {
    ok: true,
    emailed,
    resetUrl: expose ? resetUrl : undefined,
    token: expose ? token : undefined,
  };
}

export interface ResetResult {
  email: string;
  userId: string;
}

export async function resetPassword(opts: {
  token: string;
  newPassword: string;
}): Promise<ResetResult> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensurePasswordResetTable();

  const raw = String(opts.token || '');
  const newPassword = String(opts.newPassword || '');
  if (!raw) throw new Error('Token wajib diisi');
  if (newPassword.length < 8) throw new Error('Password minimal 8 karakter');

  const hash = hashToken(raw);
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_password_resets
    WHERE token_hash = :hash
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `, { replacements: { hash } });
  const row = rows?.[0];
  if (!row) throw new Error('Token tidak valid atau sudah kedaluwarsa');

  const db = getDb();
  const user = await db.User.findOne({ where: { id: Number(row.user_id) } });
  if (!user) throw new Error('Akun tidak ditemukan');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  await sequelize.query(`
    UPDATE saas_password_resets
    SET used_at = NOW()
    WHERE id = :id
  `, { replacements: { id: row.id } });

  return { email: row.email, userId: String(row.user_id) };
}
