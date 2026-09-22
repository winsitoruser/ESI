/**
 * Humanify SaaS Phase 5 — tenant API keys (Bearer hfy_live_…)
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureApiKeysTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_api_keys (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL,
      key_prefix VARCHAR(24) NOT NULL,
      key_hash VARCHAR(128) NOT NULL,
      scopes TEXT[] NOT NULL DEFAULT ARRAY['employees:read'],
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    ALTER TABLE saas_api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
  `).catch(() => {});
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_api_keys_tenant
    ON saas_api_keys (tenant_id) WHERE revoked_at IS NULL
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_api_keys_hash
    ON saas_api_keys (key_hash)
  `);
  ready = true;
}

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRawKey(): { raw: string; prefix: string } {
  const secret = crypto.randomBytes(24).toString('base64url');
  const raw = `hfy_live_${secret}`;
  return { raw, prefix: raw.slice(0, 16) };
}

export async function createApiKey(opts: {
  tenantId: string;
  name: string;
  scopes?: string[];
  createdBy?: string | null;
  /** Days until expiry; default 365. 0 = no expiry. */
  expiresInDays?: number;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureApiKeysTable();
  const name = String(opts.name || '').trim().slice(0, 120) || 'Default';
  const scopes = (opts.scopes?.length
    ? opts.scopes
    : ['employees:read', 'employees:write', 'leave:read', 'leave:write', 'attendance:read', 'webhooks:manage']
  ).map(String);
  const { raw, prefix } = generateRawKey();
  const id = crypto.randomUUID();
  const createdBy =
    opts.createdBy && /^[0-9a-f-]{36}$/i.test(String(opts.createdBy))
      ? String(opts.createdBy)
      : null;
  const days = opts.expiresInDays != null
    ? opts.expiresInDays
    : Number(process.env.HUMANIFY_API_KEY_TTL_DAYS || 365);
  const expiresAt = days > 0
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;
  await sequelize.query(`
    INSERT INTO saas_api_keys (id, tenant_id, name, key_prefix, key_hash, scopes, created_by, expires_at)
    VALUES (:id, :tid, :name, :prefix, :hash, CAST(:scopes AS text[]), :uid, :exp)
  `, {
    replacements: {
      id,
      tid: opts.tenantId,
      name,
      prefix,
      hash: hashKey(raw),
      scopes: `{${scopes.map((s) => `"${s.replace(/"/g, '')}"`).join(',')}}`,
      uid: createdBy,
      exp: expiresAt,
    },
  });
  return {
    id,
    name,
    prefix,
    scopes,
    expiresAt,
    /** Shown once only */
    apiKey: raw,
  };
}

export async function listApiKeys(tenantId: string) {
  if (!sequelize) return [];
  await ensureApiKeysTable();
  const [rows] = await sequelize.query(`
    SELECT id, name, key_prefix AS "keyPrefix", scopes, last_used_at AS "lastUsedAt",
           revoked_at AS "revokedAt", expires_at AS "expiresAt", created_at AS "createdAt"
    FROM saas_api_keys
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT 50
  `, { replacements: { tid: tenantId } });
  return rows || [];
}

/** SEC-API-010 — rotate: revoke old, mint new with same scopes/name */
export async function rotateApiKey(tenantId: string, keyId: string, createdBy?: string | null) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureApiKeysTable();
  const [rows] = await sequelize.query(`
    SELECT id, name, scopes FROM saas_api_keys
    WHERE id = :id AND tenant_id = :tid AND revoked_at IS NULL
    LIMIT 1
  `, { replacements: { id: keyId, tid: tenantId } });
  const row = rows?.[0];
  if (!row) throw new Error('API key tidak ditemukan atau sudah dicabut');
  await revokeApiKey(tenantId, keyId);
  const scopes = Array.isArray(row.scopes) ? row.scopes : [];
  return createApiKey({
    tenantId,
    name: `${row.name} (rotated)`,
    scopes,
    createdBy,
  });
}

export async function revokeApiKey(tenantId: string, keyId: string) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureApiKeysTable();
  const [rows] = await sequelize.query(`
    UPDATE saas_api_keys
    SET revoked_at = NOW()
    WHERE id = :id AND tenant_id = :tid AND revoked_at IS NULL
    RETURNING id
  `, { replacements: { id: keyId, tid: tenantId } });
  if (!rows?.length) throw new Error('API key tidak ditemukan atau sudah dicabut');
  return { id: keyId, revoked: true };
}

export interface AuthenticatedApiKey {
  id: string;
  tenantId: string;
  name: string;
  scopes: string[];
}

export async function authenticateBearer(
  authorization: string | undefined,
  requiredScope?: string,
): Promise<AuthenticatedApiKey | null> {
  if (!sequelize || !authorization) return null;
  const m = authorization.match(/^Bearer\s+(hfy_live_[A-Za-z0-9_-]+)$/i);
  if (!m) return null;
  await ensureApiKeysTable();
  const hash = hashKey(m[1]);
  const [rows] = await sequelize.query(`
    SELECT id, tenant_id AS "tenantId", name, scopes, expires_at AS "expiresAt"
    FROM saas_api_keys
    WHERE key_hash = :hash AND revoked_at IS NULL
    LIMIT 1
  `, { replacements: { hash } });
  const row = rows?.[0];
  if (!row) return null;
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return null;
  }
  const scopes: string[] = Array.isArray(row.scopes) ? row.scopes : [];
  if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('*')) {
    return null;
  }

  // SEC-API-014 — per-tenant API quota
  try {
    const { checkRateLimitAsync } = await import('@/lib/middleware/rateLimit');
    const max = Number(process.env.HUMANIFY_TENANT_API_QUOTA_PER_MIN || 120);
    const q = await checkRateLimitAsync(`apiq:${row.tenantId}`, {
      windowMs: 60_000,
      maxRequests: max,
    });
    if (!q.allowed) return null;
  } catch { /* fail-open */ }

  sequelize.query(
    `UPDATE saas_api_keys SET last_used_at = NOW() WHERE id = :id`,
    { replacements: { id: row.id } },
  ).catch(() => {});
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    scopes,
  };
}
