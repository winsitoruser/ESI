/**
 * Tenant outbound webhooks for Public API v1 (HMAC-signed POST).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureOutboundWebhooksTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_outbound_webhooks (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      url TEXT NOT NULL,
      secret VARCHAR(128) NOT NULL,
      events TEXT[] NOT NULL DEFAULT ARRAY['employee.created'],
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_outbound_wh_tenant
    ON saas_outbound_webhooks (tenant_id) WHERE active = true
  `);
  ready = true;
}

export async function registerOutboundWebhook(opts: {
  tenantId: string;
  url: string;
  events?: string[];
  secret?: string;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureOutboundWebhooksTable();
  const url = String(opts.url || '').trim();
  if (!/^https:\/\/.+/i.test(url)) throw new Error('URL webhook harus HTTPS');
  const events = (opts.events?.length ? opts.events : ['employee.created']).map(String);
  const secret = opts.secret || crypto.randomBytes(24).toString('hex');
  const id = crypto.randomUUID();
  await sequelize.query(`
    INSERT INTO saas_outbound_webhooks (id, tenant_id, url, secret, events, active)
    VALUES (:id, :tid, :url, :secret, CAST(:events AS text[]), true)
  `, {
    replacements: {
      id,
      tid: opts.tenantId,
      url,
      secret,
      events: `{${events.map((e) => `"${e.replace(/"/g, '')}"`).join(',')}}`,
    },
  });
  return { id, url, events, secret };
}

export async function listOutboundWebhooks(tenantId: string) {
  if (!sequelize || !tenantId) return [];
  await ensureOutboundWebhooksTable();
  const [rows] = await sequelize.query(`
    SELECT id, url, events, active, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM saas_outbound_webhooks
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT 20
  `, { replacements: { tid: tenantId } });
  return rows || [];
}

export async function dispatchOutboundWebhook(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ delivered: number; failed: number }> {
  if (!sequelize || !tenantId) return { delivered: 0, failed: 0 };
  await ensureOutboundWebhooksTable();
  const [rows] = await sequelize.query(`
    SELECT id, url, secret, events
    FROM saas_outbound_webhooks
    WHERE tenant_id = :tid AND active = true
  `, { replacements: { tid: tenantId } });

  let delivered = 0;
  let failed = 0;
  const body = JSON.stringify({
    event,
    at: new Date().toISOString(),
    tenantId,
    data: payload,
  });

  for (const row of rows || []) {
    const events: string[] = Array.isArray(row.events) ? row.events : [];
    if (!events.includes(event) && !events.includes('*')) continue;
    const sig = crypto.createHmac('sha256', row.secret).update(body).digest('hex');
    try {
      const res = await fetch(row.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Humanify-Event': event,
          'X-Humanify-Signature': `sha256=${sig}`,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) delivered += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { delivered, failed };
}
