/**
 * Activation funnel (PR-009 / PR-045).
 * signup → verified → setup → first_employee → go_live → payroll → paid
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export const FUNNEL_STEPS = [
  'signup',
  'verified',
  'setup',
  'first_employee',
  'go_live',
  'payroll',
  'paid',
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

function pickAttr(raw: unknown): string | undefined {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const s = String(val || '').trim().slice(0, 80);
  if (!s || /[\r\n]/.test(s)) return undefined;
  return s;
}

/** UTM from signup body or query — never stores email/PII. */
export function parseMarketingAttribution(
  query?: Record<string, unknown> | null,
  body?: Record<string, unknown> | null,
): Record<string, string> {
  const src: Record<string, unknown> = { ...(query || {}) };
  for (const [k, v] of Object.entries(body || {})) {
    if (v != null && v !== '') src[k] = v;
  }
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const v = pickAttr(src[key] ?? src[camel]);
    if (v) out[key] = v;
  }
  return out;
}

let ready = false;

export async function ensureFunnelTable() {
  if (!sequelize || ready) return;
  const { withDbSavepoint } = require('./tenant-request-bound');
  const ok = await withDbSavepoint(sequelize, async () => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS saas_funnel_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        step VARCHAR(32) NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_saas_funnel_tenant_step
        ON saas_funnel_events (tenant_id, step, created_at DESC)
    `);
    return true;
  }, 'funnel_ddl');
  if (ok) ready = true;
}

export async function recordFunnelEvent(
  tenantId: string | null | undefined,
  step: FunnelStep,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!tenantId || !sequelize) return;
  const { withDbSavepoint } = require('./tenant-request-bound');
  await withDbSavepoint(sequelize, async () => {
    await ensureFunnelTable();
    await sequelize.query(
      `INSERT INTO saas_funnel_events (tenant_id, step, meta) VALUES (:tid, :step, CAST(:meta AS jsonb))`,
      {
        replacements: {
          tid: tenantId,
          step,
          meta: JSON.stringify(meta || {}),
        },
      },
    );
  }, 'funnel');
}

export async function listFunnelForTenant(tenantId: string): Promise<Array<{
  step: FunnelStep;
  createdAt: string;
}>> {
  if (!sequelize) return [];
  await ensureFunnelTable();
  const [rows] = await sequelize.query(
    `SELECT DISTINCT ON (step) step, created_at
     FROM saas_funnel_events
     WHERE tenant_id = :tid
     ORDER BY step, created_at ASC`,
    { replacements: { tid: tenantId } },
  );
  return (rows || []).map((r: any) => ({
    step: r.step,
    createdAt: r.created_at,
  }));
}
