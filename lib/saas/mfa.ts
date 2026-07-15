/**
 * Phase 19 — MFA/2FA (TOTP, RFC 6238) for Humanify users.
 *
 * Self-contained TOTP (no external deps). Secrets stored per-user in
 * `saas_user_mfa`. MFA is OPT-IN: absence of an enabled row = no MFA, so all
 * existing logins are unaffected. Login enforcement lives in the NextAuth
 * `authorize` callback and is FAIL-OPEN on internal errors.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const ISSUER = process.env.MFA_ISSUER || 'Humanify';
const STEP = 30;
const DIGITS = 6;

let ready = false;
export async function ensureMfaTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_user_mfa (
      user_id VARCHAR(64) PRIMARY KEY,
      tenant_id UUID,
      email VARCHAR(255),
      secret VARCHAR(64) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT false,
      enrolled_at TIMESTAMPTZ,
      disabled_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

// ── Base32 (RFC 4648, no padding) ───────────────────────────────────────────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ── HOTP / TOTP ──────────────────────────────────────────────────────────────
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // 53-bit safe write (counter fits comfortably for TOTP)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function totpNow(secretBase32: string, atMs = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / STEP);
  return hotp(base32Decode(secretBase32), counter);
}

/** Constant-ish comparison across a ±window of steps. */
export function verifyTotp(secretBase32: string, code: string, window = 1): boolean {
  const clean = String(code || '').replace(/\D/g, '');
  if (clean.length !== DIGITS) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / STEP);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === clean) return true;
  }
  return false;
}

function otpauthUrl(email: string, secretBase32: string): string {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Persistence / API surface ────────────────────────────────────────────────
async function readRow(userId: string): Promise<any | null> {
  await ensureMfaTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_user_mfa WHERE user_id = :uid LIMIT 1`,
    { replacements: { uid: String(userId) } },
  );
  return rows?.[0] || null;
}

export async function getMfaStatus(userId: string | number): Promise<{ enabled: boolean; enrolledAt: string | null; pending: boolean }> {
  if (!sequelize) return { enabled: false, enrolledAt: null, pending: false };
  try {
    const row = await readRow(String(userId));
    return {
      enabled: Boolean(row?.enabled),
      enrolledAt: row?.enrolled_at || null,
      pending: Boolean(row) && !row.enabled,
    };
  } catch {
    return { enabled: false, enrolledAt: null, pending: false };
  }
}

/** Fail-open: returns false on any error so a DB hiccup never blocks login. */
export async function isMfaEnabled(userId: string | number): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const row = await readRow(String(userId));
    return Boolean(row?.enabled);
  } catch {
    return false;
  }
}

export async function verifyMfaCode(userId: string | number, code: string): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const row = await readRow(String(userId));
    if (!row?.enabled || !row.secret) return false;
    return verifyTotp(row.secret, code);
  } catch {
    return false;
  }
}

export async function beginEnrollment(opts: {
  userId: string | number;
  tenantId?: string | null;
  email: string;
}): Promise<{ secret: string; otpauthUrl: string }> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureMfaTable();
  const secret = base32Encode(crypto.randomBytes(20));
  await sequelize.query(`
    INSERT INTO saas_user_mfa (user_id, tenant_id, email, secret, enabled, enrolled_at, disabled_at, updated_at)
    VALUES (:uid, :tid, :email, :secret, false, NULL, NULL, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET secret = EXCLUDED.secret, enabled = false, enrolled_at = NULL, disabled_at = NULL,
          email = EXCLUDED.email, tenant_id = EXCLUDED.tenant_id, updated_at = NOW()
  `, {
    replacements: {
      uid: String(opts.userId),
      tid: opts.tenantId || null,
      email: opts.email,
      secret,
    },
  });
  return { secret, otpauthUrl: otpauthUrl(opts.email, secret) };
}

export async function confirmEnrollment(userId: string | number, code: string): Promise<boolean> {
  if (!sequelize) throw new Error('Database unavailable');
  const row = await readRow(String(userId));
  if (!row?.secret) throw new Error('Belum ada proses enrol MFA. Mulai enrol dulu.');
  if (!verifyTotp(row.secret, code)) return false;
  await sequelize.query(
    `UPDATE saas_user_mfa SET enabled = true, enrolled_at = NOW(), disabled_at = NULL, updated_at = NOW() WHERE user_id = :uid`,
    { replacements: { uid: String(userId) } },
  );
  return true;
}

export async function disableMfa(userId: string | number, code: string): Promise<boolean> {
  if (!sequelize) throw new Error('Database unavailable');
  const row = await readRow(String(userId));
  if (!row?.enabled) return true; // already off
  if (!verifyTotp(row.secret, code)) return false;
  await sequelize.query(
    `UPDATE saas_user_mfa SET enabled = false, disabled_at = NOW(), updated_at = NOW() WHERE user_id = :uid`,
    { replacements: { uid: String(userId) } },
  );
  return true;
}
