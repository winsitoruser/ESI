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
      recovery_hashes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  try {
    await sequelize.query(`
      ALTER TABLE saas_user_mfa
      ADD COLUMN IF NOT EXISTS recovery_hashes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `);
  } catch { /* */ }
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

export async function getMfaStatus(userId: string | number): Promise<{
  enabled: boolean;
  enrolledAt: string | null;
  pending: boolean;
  recoveryRemaining: number;
}> {
  if (!sequelize) return { enabled: false, enrolledAt: null, pending: false, recoveryRemaining: 0 };
  try {
    const row = await readRow(String(userId));
    return {
      enabled: Boolean(row?.enabled),
      enrolledAt: row?.enrolled_at || null,
      pending: Boolean(row) && !row.enabled,
      recoveryRemaining: Array.isArray(row?.recovery_hashes) ? row.recovery_hashes.length : 0,
    };
  } catch {
    return { enabled: false, enrolledAt: null, pending: false, recoveryRemaining: 0 };
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
    const trimmed = String(code || '').replace(/\s+/g, '');
    if (verifyTotp(row.secret, trimmed)) return true;
    // One-time recovery codes (8-char alnum)
    if (/^[A-Za-z0-9]{8}$/.test(trimmed)) {
      return consumeRecoveryCode(String(userId), trimmed, row.recovery_hashes || []);
    }
    return false;
  } catch {
    return false;
  }
}

function hashRecovery(code: string) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

function generateRecoveryCodes(n = 8): string[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    let c = '';
    const buf = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) c += alphabet[buf[j] % alphabet.length];
    codes.push(c);
  }
  return codes;
}

async function consumeRecoveryCode(userId: string, code: string, hashes: string[]): Promise<boolean> {
  const h = hashRecovery(code);
  if (!hashes.includes(h)) return false;
  const next = hashes.filter((x) => x !== h);
  await sequelize.query(
    `UPDATE saas_user_mfa SET recovery_hashes = CAST(:hashes AS text[]), updated_at = NOW() WHERE user_id = :uid`,
    {
      replacements: {
        uid: userId,
        hashes: `{${next.map((x) => `"${x}"`).join(',')}}`,
      },
    },
  );
  return true;
}

export async function issueRecoveryCodes(userId: string | number): Promise<string[]> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureMfaTable();
  const codes = generateRecoveryCodes(8);
  const hashes = codes.map(hashRecovery);
  await sequelize.query(
    `UPDATE saas_user_mfa SET recovery_hashes = CAST(:hashes AS text[]), updated_at = NOW() WHERE user_id = :uid`,
    {
      replacements: {
        uid: String(userId),
        hashes: `{${hashes.map((x) => `"${x}"`).join(',')}}`,
      },
    },
  );
  return codes;
}

export async function recoveryCodesRemaining(userId: string | number): Promise<number> {
  const row = await readRow(String(userId));
  return Array.isArray(row?.recovery_hashes) ? row.recovery_hashes.length : 0;
}

export async function beginEnrollment(opts: {
  userId: string | number;
  tenantId?: string | null;
  email: string;
}): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string | null }> {
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
  const url = otpauthUrl(opts.email, secret);
  let qrDataUrl: string | null = null;
  try {
    // Server-only — avoid client bundling of qrcode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QRCode = require('qrcode') as typeof import('qrcode');
    qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 220,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (e: any) {
    console.warn('[mfa] QR generation failed:', e?.message || e);
  }
  return { secret, otpauthUrl: url, qrDataUrl };
}

export async function confirmEnrollment(userId: string | number, code: string): Promise<{ ok: boolean; recoveryCodes?: string[] }> {
  if (!sequelize) throw new Error('Database unavailable');
  const row = await readRow(String(userId));
  if (!row?.secret) throw new Error('Belum ada proses enrol MFA. Mulai enrol dulu.');
  if (!verifyTotp(row.secret, code)) return { ok: false };
  await sequelize.query(
    `UPDATE saas_user_mfa SET enabled = true, enrolled_at = NOW(), disabled_at = NULL, updated_at = NOW() WHERE user_id = :uid`,
    { replacements: { uid: String(userId) } },
  );
  const recoveryCodes = await issueRecoveryCodes(userId);
  return { ok: true, recoveryCodes };
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
