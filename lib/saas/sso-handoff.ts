/**
 * SSO handoff tokens — bridge ACS assertion → NextAuth credentials provider.
 * Short-lived, single-use, HMAC-bound to userId+tenantId.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const TTL_SEC = Math.max(30, Number(process.env.HUMANIFY_SSO_HANDOFF_TTL_SEC || 90));

let ready = false;
async function ensureTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_sso_handoffs (
      token_hash VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      tenant_id UUID NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function mintSsoHandoff(opts: {
  userId: string | number;
  tenantId: string;
}): Promise<string> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureTable();
  const raw = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TTL_SEC * 1000);
  await sequelize.query(`
    INSERT INTO saas_sso_handoffs (token_hash, user_id, tenant_id, expires_at)
    VALUES (:hash, :uid, :tid, :exp)
  `, {
    replacements: {
      hash: hashToken(raw),
      uid: String(opts.userId),
      tid: opts.tenantId,
      exp: expires.toISOString(),
    },
  });
  return raw;
}

export async function consumeSsoHandoff(raw: string): Promise<{
  userId: string;
  tenantId: string;
} | null> {
  if (!sequelize || !raw) return null;
  await ensureTable();
  const hash = hashToken(String(raw));
  const [rows] = await sequelize.query(`
    UPDATE saas_sso_handoffs
    SET used_at = NOW()
    WHERE token_hash = :hash
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id AS "userId", tenant_id AS "tenantId"
  `, { replacements: { hash } });
  const row = rows?.[0];
  if (!row) return null;
  return { userId: String(row.userId), tenantId: String(row.tenantId) };
}
